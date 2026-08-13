-- ============================================================
-- ERP CERVEJARIA DA LAGOA
-- CORRECOES DE PRODUCAO E DRY HOPPING
--
-- Permite corrigir a data da producao e os insumos ja consumidos.
-- O estoque e ajustado somente pela diferenca, dentro da mesma transacao.
-- Execute UMA VEZ no SQL Editor do Supabase antes de publicar o site.
-- ============================================================

begin;

create or replace function public.erp_editar_data_producao(
  p_producao_id uuid,
  p_data_producao date,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_producao public.producoes%rowtype;
  v_motivo text := trim(coalesce(p_motivo,''));
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.app_tem_permissao('producao','editar') then
    raise exception 'Usuario sem permissao para corrigir a producao.';
  end if;

  if p_producao_id is null or p_data_producao is null then
    raise exception 'Selecione a producao e informe a data correta.';
  end if;

  if p_data_producao > current_date then
    raise exception 'A data de producao nao pode estar no futuro.';
  end if;

  if v_motivo = '' then
    raise exception 'Informe o motivo da correcao.';
  end if;

  select *
  into v_producao
  from public.producoes
  where id = p_producao_id
  for update;

  if not found then
    raise exception 'Producao nao encontrada.';
  end if;

  if v_producao.data_producao = p_data_producao then
    raise exception 'A data informada ja e a data atual desta producao.';
  end if;

  update public.producoes
  set data_producao = p_data_producao
  where id = p_producao_id;

  insert into public.movimentacoes (
    tipo, categoria, item_nome, quantidade,
    unidade, lote, observacao
  )
  values (
    'CORRECAO DATA PRODUCAO', 'PRODUCAO', v_producao.cerveja_nome,
    0, '', v_producao.lote,
    'Data alterada de ' || to_char(v_producao.data_producao,'DD/MM/YYYY')
    || ' para ' || to_char(p_data_producao,'DD/MM/YYYY')
    || ' - Motivo: ' || v_motivo
  );

  return jsonb_build_object(
    'producao_id', p_producao_id,
    'data_anterior', v_producao.data_producao,
    'data_nova', p_data_producao
  );
end;
$$;

revoke all on function public.erp_editar_data_producao(uuid,date,text)
from public, anon;

grant execute on function public.erp_editar_data_producao(uuid,date,text)
to authenticated;

create or replace function public.erp_editar_insumo_consumido(
  p_item_id uuid,
  p_nome_novo text,
  p_quantidade_nova numeric,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.producao_insumos%rowtype;
  v_producao public.producoes%rowtype;
  v_estoque_antigo public.estoque_insumos%rowtype;
  v_estoque_novo public.estoque_insumos%rowtype;
  v_dry public.dry_hopping%rowtype;
  v_nome_novo text := trim(coalesce(p_nome_novo,''));
  v_quantidade_nova numeric := round(coalesce(p_quantidade_nova,0),3);
  v_motivo text := trim(coalesce(p_motivo,''));
  v_chave_antiga text;
  v_chave_nova text;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.app_tem_permissao('producao','editar') then
    raise exception 'Usuario sem permissao para corrigir insumos.';
  end if;

  if p_item_id is null or v_quantidade_nova < 0 then
    raise exception 'Informe um item e uma quantidade valida.';
  end if;

  if v_quantidade_nova > 0 and v_nome_novo = '' then
    raise exception 'Selecione o insumo correto.';
  end if;

  if v_motivo = '' then
    raise exception 'Informe o motivo da correcao.';
  end if;

  select *
  into v_item
  from public.producao_insumos
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Consumo de insumo nao encontrado.';
  end if;

  if v_quantidade_nova > 0
     and v_nome_novo = v_item.insumo_nome
     and v_quantidade_nova = round(coalesce(v_item.quantidade,0),3) then
    raise exception 'Altere o item ou a quantidade antes de salvar a correcao.';
  end if;

  if coalesce(v_item.etapa,'PRODUCAO') not in ('PRODUCAO','DRY_HOPPING') then
    raise exception 'Esta etapa nao pode ser corrigida por esta operacao.';
  end if;

  select *
  into v_producao
  from public.producoes
  where id = v_item.producao_id
  for update;

  if not found then
    raise exception 'Producao vinculada nao encontrada.';
  end if;

  v_chave_antiga := v_item.tipo || '|' || v_item.insumo_nome;
  v_chave_nova := v_item.tipo || '|' || v_nome_novo;

  perform pg_advisory_xact_lock(
    hashtextextended('CORRECAO INSUMO|' || least(v_chave_antiga,v_chave_nova),0)
  );
  if v_chave_antiga <> v_chave_nova then
    perform pg_advisory_xact_lock(
      hashtextextended('CORRECAO INSUMO|' || greatest(v_chave_antiga,v_chave_nova),0)
    );
  end if;

  select *
  into v_estoque_antigo
  from public.estoque_insumos
  where tipo = v_item.tipo
    and nome = v_item.insumo_nome
  for update;

  if not found then
    raise exception 'Estoque do insumo original % nao encontrado.', v_item.insumo_nome;
  end if;

  if v_quantidade_nova > 0 then
    select *
    into v_estoque_novo
    from public.estoque_insumos
    where tipo = v_item.tipo
      and nome = v_nome_novo
    for update;

    if not found then
      raise exception 'Estoque do novo insumo % nao encontrado.', v_nome_novo;
    end if;
  end if;

  if v_item.tipo = 'LUPULO'
     and coalesce(v_item.etapa,'') = 'DRY_HOPPING' then
    select *
    into v_dry
    from public.dry_hopping
    where producao_id = v_item.producao_id
      and lupulo_nome = v_item.insumo_nome
      and round(coalesce(quantidade,0),3) = round(coalesce(v_item.quantidade,0),3)
    order by abs(extract(epoch from (criado_em - v_item.criado_em)))
    limit 1
    for update;

    if not found then
      raise exception 'O registro correspondente do dry hopping nao foi encontrado.';
    end if;
  end if;

  if v_quantidade_nova > 0
     and v_chave_antiga = v_chave_nova then
    if coalesce(v_estoque_antigo.quantidade,0)
       + coalesce(v_item.quantidade,0) < v_quantidade_nova then
      raise exception 'Estoque insuficiente de %. Disponivel para a correcao: % %.',
        v_nome_novo,
        coalesce(v_estoque_antigo.quantidade,0) + coalesce(v_item.quantidade,0),
        v_estoque_antigo.unidade;
    end if;

    update public.estoque_insumos
    set
      quantidade = coalesce(quantidade,0)
        + coalesce(v_item.quantidade,0)
        - v_quantidade_nova,
      atualizado_em = now()
    where id = v_estoque_antigo.id;
  else
    update public.estoque_insumos
    set
      quantidade = coalesce(quantidade,0) + coalesce(v_item.quantidade,0),
      atualizado_em = now()
    where id = v_estoque_antigo.id;

    if v_quantidade_nova > 0 then
      if coalesce(v_estoque_novo.quantidade,0) < v_quantidade_nova then
        raise exception 'Estoque insuficiente de %. Disponivel: % %.',
          v_nome_novo,
          coalesce(v_estoque_novo.quantidade,0),
          v_estoque_novo.unidade;
      end if;

      update public.estoque_insumos
      set
        quantidade = coalesce(quantidade,0) - v_quantidade_nova,
        atualizado_em = now()
      where id = v_estoque_novo.id;
    end if;
  end if;

  if v_quantidade_nova = 0 then
    if v_dry.id is not null then
      delete from public.dry_hopping where id = v_dry.id;
    end if;
    delete from public.producao_insumos where id = v_item.id;
  else
    update public.producao_insumos
    set
      insumo_nome = v_nome_novo,
      quantidade = v_quantidade_nova,
      unidade = v_estoque_novo.unidade
    where id = v_item.id;

    if v_dry.id is not null then
      update public.dry_hopping
      set
        lupulo_nome = v_nome_novo,
        quantidade = v_quantidade_nova,
        unidade = v_estoque_novo.unidade
      where id = v_dry.id;
    end if;
  end if;

  if v_item.tipo = 'FERMENTO'
     and coalesce(v_item.etapa,'PRODUCAO') = 'PRODUCAO'
     and coalesce(v_producao.fermento_tipo,'') = 'ESTOQUE' then
    update public.producoes
    set fermento_nome = case when v_quantidade_nova > 0 then v_nome_novo end
    where id = v_producao.id;
  end if;

  if v_quantidade_nova = 0
     and coalesce(v_item.etapa,'') = 'DRY_HOPPING'
     and coalesce(v_producao.status,'') = 'DRY_HOPPING'
     and not exists (
       select 1
       from public.dry_hopping
       where producao_id = v_producao.id
     ) then
    update public.producoes
    set status = 'FERMENTANDO'
    where id = v_producao.id;

    insert into public.movimentacoes (
      tipo, categoria, item_nome, quantidade,
      unidade, lote, observacao
    )
    values (
      'STATUS LOTE', 'PRODUCAO', v_producao.cerveja_nome,
      0, '', v_producao.lote,
      'Status corrigido para Em fermentacao apos remocao do dry hopping - Motivo: '
      || v_motivo
    );
  end if;

  insert into public.movimentacoes (
    tipo, categoria, item_nome, quantidade,
    unidade, lote, observacao
  )
  values (
    'CORRECAO INSUMO ESTORNO', 'INSUMO', v_item.insumo_nome,
    abs(v_item.quantidade), v_item.unidade, v_producao.lote,
    coalesce(v_item.etapa,'PRODUCAO') || ' - Motivo: ' || v_motivo
  );

  if v_quantidade_nova > 0 then
    insert into public.movimentacoes (
      tipo, categoria, item_nome, quantidade,
      unidade, lote, observacao
    )
    values (
      'CORRECAO INSUMO BAIXA', 'INSUMO', v_nome_novo,
      -abs(v_quantidade_nova), v_estoque_novo.unidade, v_producao.lote,
      coalesce(v_item.etapa,'PRODUCAO') || ' - Motivo: ' || v_motivo
    );
  end if;

  return jsonb_build_object(
    'producao_id', v_producao.id,
    'etapa', v_item.etapa,
    'insumo_anterior', v_item.insumo_nome,
    'quantidade_anterior', v_item.quantidade,
    'insumo_novo', case when v_quantidade_nova > 0 then v_nome_novo end,
    'quantidade_nova', v_quantidade_nova,
    'removido', v_quantidade_nova = 0
  );
end;
$$;

revoke all on function public.erp_editar_insumo_consumido(uuid,text,numeric,text)
from public, anon;

grant execute on function public.erp_editar_insumo_consumido(uuid,text,numeric,text)
to authenticated;

notify pgrst, 'reload schema';

commit;
