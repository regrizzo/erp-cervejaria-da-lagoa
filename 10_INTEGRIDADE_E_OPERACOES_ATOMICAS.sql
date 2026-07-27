-- ============================================================
-- ERP CERVEJARIA DA LAGOA
-- INTEGRIDADE E OPERAÇÕES ATÔMICAS DE ESTOQUE
--
-- Execute UMA VEZ no SQL Editor do Supabase antes de publicar
-- os arquivos atualizados do site.
-- ============================================================

begin;

-- As restrições NOT VALID passam a proteger gravações novas sem
-- bloquear a instalação por causa de registros históricos antigos.
alter table public.estoque_cerveja
  drop constraint if exists estoque_cerveja_quantidades_nao_negativas,
  add constraint estoque_cerveja_quantidades_nao_negativas
    check (
      coalesce(q10,0) >= 0
      and coalesce(q20,0) >= 0
      and coalesce(q30,0) >= 0
      and coalesce(q50,0) >= 0
      and coalesce(litros,0) >= 0
    ) not valid;

alter table public.estoque_cerveja
  drop constraint if exists estoque_cerveja_litros_coerentes,
  add constraint estoque_cerveja_litros_coerentes
    check (
      round(coalesce(litros,0),3)
      = round(
        coalesce(q10,0) * 10
        + coalesce(q20,0) * 20
        + coalesce(q30,0) * 30
        + coalesce(q50,0) * 50,
        3
      )
    ) not valid;

alter table public.estoque_insumos
  drop constraint if exists estoque_insumos_quantidade_nao_negativa,
  add constraint estoque_insumos_quantidade_nao_negativa
    check (coalesce(quantidade,0) >= 0) not valid;

alter table public.saidas
  drop constraint if exists saidas_quantidades_nao_negativas,
  add constraint saidas_quantidades_nao_negativas
    check (
      coalesce(q10,0) >= 0
      and coalesce(q20,0) >= 0
      and coalesce(q30,0) >= 0
      and coalesce(q50,0) >= 0
      and coalesce(litros,0) >= 0
    ) not valid;

alter table public.retornos
  drop constraint if exists retornos_quantidades_nao_negativas,
  add constraint retornos_quantidades_nao_negativas
    check (
      coalesce(q10,0) >= 0
      and coalesce(q20,0) >= 0
      and coalesce(q30,0) >= 0
      and coalesce(q50,0) >= 0
    ) not valid;

alter table public.producoes
  drop constraint if exists producoes_litros_positivos,
  add constraint producoes_litros_positivos
    check (coalesce(litros_produzidos,0) > 0) not valid;

alter table public.envases
  drop constraint if exists envases_valores_nao_negativos,
  add constraint envases_valores_nao_negativos
    check (
      coalesce(q10,0) >= 0
      and coalesce(q20,0) >= 0
      and coalesce(q30,0) >= 0
      and coalesce(q50,0) >= 0
      and coalesce(litros_barris,0) >= 0
      and coalesce(litros_incompleto_bar,0) >= 0
      and coalesce(litros_incompleto,0) >= 0
      and coalesce(litros_bar_proprio,0) >= 0
      and coalesce(litros_total,0) >= 0
      and coalesce(perda,0) >= 0
      and coalesce(perda_informada,0) >= 0
      and coalesce(saldo_apos,0) >= 0
    ) not valid;

alter table public.producao_insumos
  drop constraint if exists producao_insumos_quantidade_positiva,
  add constraint producao_insumos_quantidade_positiva
    check (coalesce(quantidade,0) > 0) not valid;

alter table public.dry_hopping
  drop constraint if exists dry_hopping_quantidade_positiva,
  add constraint dry_hopping_quantidade_positiva
    check (coalesce(quantidade,0) > 0) not valid;

-- A trilha de auditoria não pode ser alterada por qualquer usuário ativo.
drop policy if exists movimentacoes_update_acesso
on public.movimentacoes;

drop policy if exists movimentacoes_update_admin
on public.movimentacoes;

drop policy if exists authenticated_all_movimentacoes
on public.movimentacoes;

create policy movimentacoes_update_admin
on public.movimentacoes
for update to authenticated
using (public.app_eh_admin())
with check (public.app_eh_admin());

-- Usuários comuns nunca podem informar outra pessoa como autora.
create or replace function public.app_registrar_autor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.app_eh_admin() or new.criado_por is null then
    new.criado_por := (select auth.uid());
  end if;

  if not public.app_eh_admin()
     or coalesce(new.criado_por_nome,'') = '' then
    select coalesce(nome,email)
    into new.criado_por_nome
    from public.usuarios_app
    where id = (select auth.uid());
  end if;

  return new;
end;
$$;

create or replace function public.erp_registrar_entrada_cerveja(
  p_cerveja_nome text,
  p_origem text,
  p_q10 integer default 0,
  p_q20 integer default 0,
  p_q30 integer default 0,
  p_q50 integer default 0,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cerveja_nome text := trim(coalesce(p_cerveja_nome,''));
  v_origem text := upper(trim(coalesce(p_origem,'')));
  v_q10 integer := coalesce(p_q10,0);
  v_q20 integer := coalesce(p_q20,0);
  v_q30 integer := coalesce(p_q30,0);
  v_q50 integer := coalesce(p_q50,0);
  v_litros numeric;
  v_cerveja_id uuid;
  v_entrada_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.app_tem_permissao('estoque','editar') then
    raise exception 'Usuário sem permissão para registrar entrada de cerveja.';
  end if;

  if v_cerveja_nome = '' then
    raise exception 'Selecione a cerveja.';
  end if;

  if v_origem not in ('PRODUCAO','ITAPEMA','PHENOMENA') then
    raise exception 'Origem de estoque inválida.';
  end if;

  if least(v_q10,v_q20,v_q30,v_q50) < 0 then
    raise exception 'As quantidades de barris não podem ser negativas.';
  end if;

  v_litros := v_q10 * 10 + v_q20 * 20 + v_q30 * 30 + v_q50 * 50;
  if v_litros <= 0 then
    raise exception 'Informe ao menos um barril.';
  end if;

  select id
  into v_cerveja_id
  from public.cervejas
  where nome = v_cerveja_nome
    and coalesce(ativo,true)
  limit 1;

  if v_cerveja_id is null then
    raise exception 'Cerveja não encontrada ou inativa.';
  end if;

  insert into public.estoque_cerveja (
    cerveja_id, cerveja_nome, origem,
    q10, q20, q30, q50, litros, atualizado_em
  )
  values (
    v_cerveja_id, v_cerveja_nome, v_origem,
    v_q10, v_q20, v_q30, v_q50, v_litros, now()
  )
  on conflict (cerveja_nome, origem)
  do update set
    cerveja_id = excluded.cerveja_id,
    q10 = coalesce(public.estoque_cerveja.q10,0) + excluded.q10,
    q20 = coalesce(public.estoque_cerveja.q20,0) + excluded.q20,
    q30 = coalesce(public.estoque_cerveja.q30,0) + excluded.q30,
    q50 = coalesce(public.estoque_cerveja.q50,0) + excluded.q50,
    litros =
      (coalesce(public.estoque_cerveja.q10,0) + excluded.q10) * 10
      + (coalesce(public.estoque_cerveja.q20,0) + excluded.q20) * 20
      + (coalesce(public.estoque_cerveja.q30,0) + excluded.q30) * 30
      + (coalesce(public.estoque_cerveja.q50,0) + excluded.q50) * 50,
    atualizado_em = now();

  insert into public.entradas_cerveja (
    cerveja_id, cerveja_nome, origem,
    q10, q20, q30, q50, litros, observacao
  )
  values (
    v_cerveja_id, v_cerveja_nome, v_origem,
    v_q10, v_q20, v_q30, v_q50, v_litros,
    nullif(trim(coalesce(p_observacao,'')),'')
  )
  returning id into v_entrada_id;

  if v_origem = 'PHENOMENA' then
    insert into public.phenomena_entradas (
      entrada_cerveja_id, cerveja_nome,
      q10, q20, q30, q50, litros, observacao
    )
    values (
      v_entrada_id, v_cerveja_nome,
      v_q10, v_q20, v_q30, v_q50, v_litros,
      nullif(trim(coalesce(p_observacao,'')),'')
    );
  end if;

  insert into public.movimentacoes (
    tipo, categoria, item_nome, quantidade,
    unidade, origem, observacao
  )
  values (
    'ENTRADA ESTOQUE', 'CERVEJA', v_cerveja_nome,
    v_litros, 'L', v_origem,
    nullif(trim(coalesce(p_observacao,'')),'')
  );

  return jsonb_build_object(
    'entrada_id', v_entrada_id,
    'cerveja_nome', v_cerveja_nome,
    'origem', v_origem,
    'litros', v_litros
  );
end;
$$;

revoke all on function public.erp_registrar_entrada_cerveja(
  text,text,integer,integer,integer,integer,text
) from public, anon;

grant execute on function public.erp_registrar_entrada_cerveja(
  text,text,integer,integer,integer,integer,text
) to authenticated;

create or replace function public.erp_registrar_saida_multipla(
  p_cliente_id uuid,
  p_itens jsonb,
  p_responsavel text default null,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_saida uuid := gen_random_uuid();
  v_cliente_nome text;
  v_item jsonb;
  v_estoque record;
  v_cerveja_nome text;
  v_cerveja_id uuid;
  v_q10 integer;
  v_q20 integer;
  v_q30 integer;
  v_q50 integer;
  v_rest_q10 integer;
  v_rest_q20 integer;
  v_rest_q30 integer;
  v_rest_q50 integer;
  v_usar_q10 integer;
  v_usar_q20 integer;
  v_usar_q30 integer;
  v_usar_q50 integer;
  v_litros_origem numeric;
  v_litros_item numeric;
  v_litros_total numeric := 0;
  v_litros_producao numeric;
  v_litros_itapema numeric;
  v_litros_phenomena numeric;
  v_baixas jsonb;
  v_origem_baixada text;
  v_quantidade_itens integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.app_tem_permissao('saidas','editar') then
    raise exception 'Usuário sem permissão para registrar saídas.';
  end if;

  select nome
  into v_cliente_nome
  from public.clientes
  where id = p_cliente_id
    and coalesce(ativo,true)
  limit 1;

  if v_cliente_nome is null then
    raise exception 'Cliente não encontrado ou inativo.';
  end if;

  if p_itens is null
     or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) = 0 then
    raise exception 'Adicione ao menos um item à saída.';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_itens)
    order by value->>'cerveja_nome'
  loop
    v_cerveja_nome := trim(coalesce(v_item->>'cerveja_nome',''));
    v_q10 := coalesce((v_item->>'q10')::integer,0);
    v_q20 := coalesce((v_item->>'q20')::integer,0);
    v_q30 := coalesce((v_item->>'q30')::integer,0);
    v_q50 := coalesce((v_item->>'q50')::integer,0);

    if v_cerveja_nome = '' then
      raise exception 'Há item sem cerveja selecionada.';
    end if;

    if least(v_q10,v_q20,v_q30,v_q50) < 0 then
      raise exception 'As quantidades de barris não podem ser negativas.';
    end if;

    v_litros_item := v_q10 * 10 + v_q20 * 20 + v_q30 * 30 + v_q50 * 50;
    if v_litros_item <= 0 then
      raise exception 'A saída de % não possui barris.', v_cerveja_nome;
    end if;

    select id
    into v_cerveja_id
    from public.cervejas
    where nome = v_cerveja_nome
      and coalesce(ativo,true)
    limit 1;

    if v_cerveja_id is null then
      raise exception 'Cerveja % não encontrada ou inativa.', v_cerveja_nome;
    end if;

    v_rest_q10 := v_q10;
    v_rest_q20 := v_q20;
    v_rest_q30 := v_q30;
    v_rest_q50 := v_q50;
    v_litros_producao := 0;
    v_litros_itapema := 0;
    v_litros_phenomena := 0;
    v_baixas := '[]'::jsonb;

    for v_estoque in
      select *
      from public.estoque_cerveja
      where cerveja_nome = v_cerveja_nome
        and origem in ('PRODUCAO','ITAPEMA','PHENOMENA')
      order by case origem
        when 'PRODUCAO' then 1
        when 'ITAPEMA' then 2
        when 'PHENOMENA' then 3
        else 4
      end
      for update
    loop
      v_usar_q10 := least(v_rest_q10, greatest(coalesce(v_estoque.q10,0),0));
      v_usar_q20 := least(v_rest_q20, greatest(coalesce(v_estoque.q20,0),0));
      v_usar_q30 := least(v_rest_q30, greatest(coalesce(v_estoque.q30,0),0));
      v_usar_q50 := least(v_rest_q50, greatest(coalesce(v_estoque.q50,0),0));

      v_rest_q10 := v_rest_q10 - v_usar_q10;
      v_rest_q20 := v_rest_q20 - v_usar_q20;
      v_rest_q30 := v_rest_q30 - v_usar_q30;
      v_rest_q50 := v_rest_q50 - v_usar_q50;

      v_litros_origem :=
        v_usar_q10 * 10
        + v_usar_q20 * 20
        + v_usar_q30 * 30
        + v_usar_q50 * 50;

      if v_litros_origem > 0 then
        update public.estoque_cerveja
        set
          q10 = coalesce(v_estoque.q10,0) - v_usar_q10,
          q20 = coalesce(v_estoque.q20,0) - v_usar_q20,
          q30 = coalesce(v_estoque.q30,0) - v_usar_q30,
          q50 = coalesce(v_estoque.q50,0) - v_usar_q50,
          litros =
            (coalesce(v_estoque.q10,0) - v_usar_q10) * 10
            + (coalesce(v_estoque.q20,0) - v_usar_q20) * 20
            + (coalesce(v_estoque.q30,0) - v_usar_q30) * 30
            + (coalesce(v_estoque.q50,0) - v_usar_q50) * 50,
          atualizado_em = now()
        where id = v_estoque.id;

        if v_usar_q10 > 0 then
          v_baixas := v_baixas || jsonb_build_array(jsonb_build_object(
            'origem',v_estoque.origem,'campo','q10','label','10L',
            'quantidade',v_usar_q10,'litros',v_usar_q10 * 10
          ));
        end if;
        if v_usar_q20 > 0 then
          v_baixas := v_baixas || jsonb_build_array(jsonb_build_object(
            'origem',v_estoque.origem,'campo','q20','label','20L',
            'quantidade',v_usar_q20,'litros',v_usar_q20 * 20
          ));
        end if;
        if v_usar_q30 > 0 then
          v_baixas := v_baixas || jsonb_build_array(jsonb_build_object(
            'origem',v_estoque.origem,'campo','q30','label','30L',
            'quantidade',v_usar_q30,'litros',v_usar_q30 * 30
          ));
        end if;
        if v_usar_q50 > 0 then
          v_baixas := v_baixas || jsonb_build_array(jsonb_build_object(
            'origem',v_estoque.origem,'campo','q50','label','50L',
            'quantidade',v_usar_q50,'litros',v_usar_q50 * 50
          ));
        end if;

        case v_estoque.origem
          when 'PRODUCAO' then
            v_litros_producao := v_litros_producao + v_litros_origem;
          when 'ITAPEMA' then
            v_litros_itapema := v_litros_itapema + v_litros_origem;
          when 'PHENOMENA' then
            v_litros_phenomena := v_litros_phenomena + v_litros_origem;
          else null;
        end case;
      end if;
    end loop;

    if v_rest_q10 > 0
       or v_rest_q20 > 0
       or v_rest_q30 > 0
       or v_rest_q50 > 0 then
      raise exception
        'Estoque insuficiente para %. Faltam: 10L=%, 20L=%, 30L=%, 50L=%.',
        v_cerveja_nome,
        v_rest_q10, v_rest_q20, v_rest_q30, v_rest_q50;
    end if;

    v_origem_baixada := concat_ws(
      ' | ',
      case when v_litros_producao > 0
        then 'PRODUCAO: ' || trim(to_char(v_litros_producao,'FM999999990D999')) || 'L'
      end,
      case when v_litros_itapema > 0
        then 'ITAPEMA: ' || trim(to_char(v_litros_itapema,'FM999999990D999')) || 'L'
      end,
      case when v_litros_phenomena > 0
        then 'PHENOMENA: ' || trim(to_char(v_litros_phenomena,'FM999999990D999')) || 'L'
      end
    );

    insert into public.saidas (
      grupo_saida,
      cliente_id, cliente_nome,
      cerveja_id, cerveja_nome,
      q10, q20, q30, q50, litros,
      codigos_barris,
      origem_baixada,
      detalhes_baixa,
      responsavel,
      observacao
    )
    values (
      v_grupo_saida,
      p_cliente_id, v_cliente_nome,
      v_cerveja_id, v_cerveja_nome,
      v_q10, v_q20, v_q30, v_q50, v_litros_item,
      nullif(trim(coalesce(v_item->>'codigos_barris','')),''),
      v_origem_baixada,
      v_baixas,
      nullif(trim(coalesce(p_responsavel,'')),''),
      nullif(trim(coalesce(p_observacao,'')),'')
    );

    insert into public.movimentacoes (
      tipo, categoria, item_nome, quantidade, unidade,
      destino, cliente_nome, observacao, responsavel
    )
    values (
      'SAIDA ESTOQUE',
      'CERVEJA',
      v_cerveja_nome,
      -abs(v_litros_item),
      'L',
      v_cliente_nome,
      v_cliente_nome,
      concat_ws(
        ' — ',
        nullif(v_origem_baixada,''),
        case
          when nullif(trim(coalesce(v_item->>'codigos_barris','')),'') is not null
          then 'Códigos: ' || trim(v_item->>'codigos_barris')
        end,
        nullif(trim(coalesce(p_observacao,'')),'')
      ),
      nullif(trim(coalesce(p_responsavel,'')),'')
    );

    v_litros_total := v_litros_total + v_litros_item;
    v_quantidade_itens := v_quantidade_itens + 1;
  end loop;

  return jsonb_build_object(
    'grupo_saida', v_grupo_saida,
    'cliente_id', p_cliente_id,
    'cliente_nome', v_cliente_nome,
    'quantidade_itens', v_quantidade_itens,
    'litros', v_litros_total
  );
end;
$$;

revoke all on function public.erp_registrar_saida_multipla(
  uuid,jsonb,text,text
) from public, anon;

grant execute on function public.erp_registrar_saida_multipla(
  uuid,jsonb,text,text
) to authenticated;

create or replace function public.erp_registrar_producao(
  p_lote text,
  p_cerveja_nome text,
  p_litros_produzidos numeric,
  p_observacao text default null,
  p_fermento_tipo text default null,
  p_fermento_nome text default null,
  p_fermento_reuso_id uuid default null,
  p_fermento_reuso_quantidade numeric default 0,
  p_insumos jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lote text := trim(coalesce(p_lote,''));
  v_cerveja_nome text := trim(coalesce(p_cerveja_nome,''));
  v_litros numeric := round(coalesce(p_litros_produzidos,0),3);
  v_fermento_tipo text := nullif(upper(trim(coalesce(p_fermento_tipo,''))),'');
  v_cerveja_id uuid;
  v_producao_id uuid;
  v_insumo record;
  v_estoque_insumo public.estoque_insumos%rowtype;
  v_fermento public.fermento_reuso%rowtype;
  v_nova_quantidade numeric;
  v_historico text;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.app_tem_permissao('producao','editar') then
    raise exception 'Usuário sem permissão para registrar produção.';
  end if;

  if v_lote = '' or v_cerveja_nome = '' or v_litros <= 0 then
    raise exception 'Informe lote, cerveja e litros produzidos.';
  end if;

  if v_fermento_tipo is not null
     and v_fermento_tipo not in ('ESTOQUE','REUSO') then
    raise exception 'Tipo de fermento inválido.';
  end if;

  select id
  into v_cerveja_id
  from public.cervejas
  where nome = v_cerveja_nome
    and coalesce(ativo,true)
  limit 1;

  if v_cerveja_id is null then
    raise exception 'Cerveja não encontrada ou inativa.';
  end if;

  -- Serializa a criação do mesmo lote mesmo antes de existir um índice único.
  perform pg_advisory_xact_lock(
    hashtextextended(upper(v_cerveja_nome) || '|' || upper(v_lote), 0)
  );

  if exists (
    select 1
    from public.producoes
    where lower(cerveja_nome) = lower(v_cerveja_nome)
      and lower(lote) = lower(v_lote)
  ) then
    raise exception 'A cerveja % já possui o lote %.',
      v_cerveja_nome, v_lote;
  end if;

  if v_fermento_tipo = 'REUSO' then
    if p_fermento_reuso_id is null
       or coalesce(p_fermento_reuso_quantidade,0) <= 0 then
      raise exception 'Selecione o fermento reutilizável e informe a quantidade usada.';
    end if;

    select *
    into v_fermento
    from public.fermento_reuso
    where id = p_fermento_reuso_id
      and coalesce(status,'DISPONIVEL') <> 'DESCARTADO'
    for update;

    if not found then
      raise exception 'Fermento reutilizável não disponível.';
    end if;

    if coalesce(v_fermento.quantidade,0)
       < coalesce(p_fermento_reuso_quantidade,0) then
      raise exception 'Estoque insuficiente do fermento reutilizável %.',
        v_fermento.codigo;
    end if;
  end if;

  insert into public.producoes (
    lote,
    cerveja_id,
    cerveja_nome,
    litros_produzidos,
    observacao,
    status,
    fermento_tipo,
    fermento_nome,
    fermento_reuso_id
  )
  values (
    v_lote,
    v_cerveja_id,
    v_cerveja_nome,
    v_litros,
    nullif(trim(coalesce(p_observacao,'')),''),
    'FERMENTANDO',
    v_fermento_tipo,
    nullif(trim(coalesce(p_fermento_nome,'')),''),
    case when v_fermento_tipo = 'REUSO'
      then p_fermento_reuso_id
    end
  )
  returning id into v_producao_id;

  for v_insumo in
    select
      upper(trim(x.tipo)) as tipo,
      trim(x.nome) as nome,
      max(trim(x.unidade)) as unidade,
      sum(coalesce(x.quantidade,0)) as quantidade
    from jsonb_to_recordset(coalesce(p_insumos,'[]'::jsonb))
      as x(tipo text, nome text, unidade text, quantidade numeric)
    where nullif(trim(x.nome),'') is not null
      and coalesce(x.quantidade,0) > 0
    group by upper(trim(x.tipo)), trim(x.nome)
    order by upper(trim(x.tipo)), trim(x.nome)
  loop
    if v_insumo.tipo not in ('MALTE','LUPULO','FERMENTO') then
      raise exception 'Tipo de insumo inválido: %.', v_insumo.tipo;
    end if;

    select *
    into v_estoque_insumo
    from public.estoque_insumos
    where tipo = v_insumo.tipo
      and nome = v_insumo.nome
    for update;

    if not found
       or coalesce(v_estoque_insumo.quantidade,0) < v_insumo.quantidade then
      raise exception
        'Estoque insuficiente de %. Necessário % %, disponível % %.',
        v_insumo.nome,
        v_insumo.quantidade,
        coalesce(v_insumo.unidade,''),
        coalesce(v_estoque_insumo.quantidade,0),
        coalesce(v_estoque_insumo.unidade,v_insumo.unidade,'');
    end if;

    update public.estoque_insumos
    set
      quantidade = coalesce(quantidade,0) - v_insumo.quantidade,
      atualizado_em = now()
    where id = v_estoque_insumo.id;

    insert into public.producao_insumos (
      producao_id, lote, tipo, insumo_nome,
      quantidade, unidade, etapa
    )
    values (
      v_producao_id, v_lote, v_insumo.tipo, v_insumo.nome,
      v_insumo.quantidade,
      coalesce(v_estoque_insumo.unidade,v_insumo.unidade),
      'PRODUCAO'
    );

    insert into public.movimentacoes (
      tipo, categoria, item_nome, quantidade,
      unidade, lote, observacao
    )
    values (
      'BAIXA PRODUCAO',
      'INSUMO',
      v_insumo.nome,
      -abs(v_insumo.quantidade),
      coalesce(v_estoque_insumo.unidade,v_insumo.unidade),
      v_lote,
      'Produção ' || v_cerveja_nome
    );
  end loop;

  if v_fermento_tipo = 'REUSO' then
    v_nova_quantidade :=
      coalesce(v_fermento.quantidade,0)
      - coalesce(p_fermento_reuso_quantidade,0);
    v_historico := trim(coalesce(v_fermento.historico_cervejas,''));

    if v_historico = '' then
      v_historico := v_cerveja_nome;
    elsif position(v_cerveja_nome in v_historico) = 0 then
      v_historico := v_historico || ' → ' || v_cerveja_nome;
    end if;

    update public.fermento_reuso
    set
      quantidade = v_nova_quantidade,
      status = case when v_nova_quantidade > 0
        then 'DISPONIVEL' else 'USADO'
      end,
      historico_cervejas = v_historico
    where id = v_fermento.id;

    insert into public.fermento_historico (
      fermento_reuso_id, acao, lote,
      cerveja_nome, quantidade, observacao
    )
    values (
      v_fermento.id, 'USO', v_lote,
      v_cerveja_nome, p_fermento_reuso_quantidade,
      'Usado na produção'
    );

    insert into public.movimentacoes (
      tipo, categoria, item_nome, quantidade,
      unidade, lote, observacao
    )
    values (
      'USO FERMENTO REUSO', 'FERMENTO', v_fermento.codigo,
      -abs(p_fermento_reuso_quantidade),
      coalesce(v_fermento.unidade,'UN'),
      v_lote,
      'Usado na produção ' || v_cerveja_nome
    );
  end if;

  insert into public.movimentacoes (
    tipo, categoria, item_nome, quantidade,
    unidade, lote, observacao
  )
  values (
    'PRODUCAO', 'CERVEJA', v_cerveja_nome,
    v_litros, 'L', v_lote,
    nullif(trim(coalesce(p_observacao,'')),'')
  );

  return jsonb_build_object(
    'producao_id', v_producao_id,
    'lote', v_lote,
    'cerveja_nome', v_cerveja_nome,
    'litros_produzidos', v_litros
  );
end;
$$;

revoke all on function public.erp_registrar_producao(
  text,text,numeric,text,text,text,uuid,numeric,jsonb
) from public, anon;

grant execute on function public.erp_registrar_producao(
  text,text,numeric,text,text,text,uuid,numeric,jsonb
) to authenticated;

create or replace function public.erp_registrar_envase(
  p_producao_id uuid,
  p_origem text,
  p_q10 integer default 0,
  p_q20 integer default 0,
  p_q30 integer default 0,
  p_q50 integer default 0,
  p_litros_incompleto numeric default 0,
  p_capacidade_incompleto integer default null,
  p_codigo_incompleto text default null,
  p_litros_bar_proprio numeric default 0,
  p_perda_informada numeric default 0,
  p_finalizar boolean default false,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_producao public.producoes%rowtype;
  v_origem text := upper(trim(coalesce(p_origem,'')));
  v_q10 integer := coalesce(p_q10,0);
  v_q20 integer := coalesce(p_q20,0);
  v_q30 integer := coalesce(p_q30,0);
  v_q50 integer := coalesce(p_q50,0);
  v_completos numeric;
  v_incompleto numeric := round(coalesce(p_litros_incompleto,0),3);
  v_bar_proprio numeric := round(coalesce(p_litros_bar_proprio,0),3);
  v_perda_digitada numeric := round(coalesce(p_perda_informada,0),3);
  v_total_envase numeric;
  v_ja_envasado numeric;
  v_perdas_anteriores numeric;
  v_saldo_antes numeric;
  v_perda_final numeric;
  v_saldo_depois numeric;
  v_status text;
  v_envase_id uuid;
  v_cerveja_id uuid;
  v_observacao text;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.app_tem_permissao('producao','editar') then
    raise exception 'Usuário sem permissão para registrar envase.';
  end if;

  if v_origem not in ('PRODUCAO','PHENOMENA') then
    raise exception 'Origem de envase inválida.';
  end if;

  if least(v_q10,v_q20,v_q30,v_q50) < 0
     or least(v_incompleto,v_bar_proprio,v_perda_digitada) < 0 then
    raise exception 'As quantidades do envase não podem ser negativas.';
  end if;

  if v_incompleto > 0
     and coalesce(p_capacidade_incompleto,0) not in (10,20,30,50) then
    raise exception 'Selecione a capacidade do barril incompleto.';
  end if;

  if v_incompleto > coalesce(p_capacidade_incompleto,0) then
    raise exception 'O volume incompleto excede a capacidade do barril.';
  end if;

  if v_incompleto <= 0
     and (
       p_capacidade_incompleto is not null
       or nullif(trim(coalesce(p_codigo_incompleto,'')),'') is not null
     ) then
    raise exception 'Informe os litros do barril incompleto ou remova seus detalhes.';
  end if;

  select *
  into v_producao
  from public.producoes
  where id = p_producao_id
  for update;

  if not found then
    raise exception 'Lote não encontrado.';
  end if;

  select id
  into v_cerveja_id
  from public.cervejas
  where nome = v_producao.cerveja_nome
  limit 1;

  select
    coalesce(sum(coalesce(litros_total,0)),0),
    coalesce(sum(coalesce(perda_informada,perda,0)),0)
  into v_ja_envasado, v_perdas_anteriores
  from public.envases
  where producao_id = p_producao_id;

  v_saldo_antes := greatest(
    coalesce(v_producao.litros_produzidos,0)
    - v_ja_envasado
    - v_perdas_anteriores,
    0
  );

  v_completos := v_q10 * 10 + v_q20 * 20 + v_q30 * 30 + v_q50 * 50;
  v_total_envase := v_completos + v_incompleto + v_bar_proprio;

  if v_total_envase <= 0 and v_perda_digitada <= 0 then
    raise exception 'Informe o envase ou a perda.';
  end if;

  if v_total_envase + v_perda_digitada > v_saldo_antes + 0.001 then
    raise exception 'O envase excede o saldo atual do lote em % L.',
      round(v_total_envase + v_perda_digitada - v_saldo_antes,3);
  end if;

  v_perda_final := v_perda_digitada;
  if coalesce(p_finalizar,false) then
    v_perda_final := greatest(
      v_perda_digitada,
      v_saldo_antes - v_total_envase
    );
  end if;

  v_saldo_depois := greatest(
    v_saldo_antes - v_total_envase - v_perda_final,
    0
  );

  v_status := case
    when coalesce(p_finalizar,false) then 'FINALIZADO'
    when v_saldo_depois <= 0.01 then 'ENVASADO'
    else 'PARCIALMENTE_ENVASADO'
  end;

  v_observacao := concat_ws(
    ' • ',
    nullif(trim(coalesce(p_observacao,'')),''),
    case when v_incompleto > 0 then
      'Barril incompleto: '
      || trim(to_char(v_incompleto,'FM999999990D999'))
      || ' L em barril de ' || p_capacidade_incompleto || ' L'
      || case
        when nullif(trim(coalesce(p_codigo_incompleto,'')),'') is not null
        then ', código ' || trim(p_codigo_incompleto)
        else ''
      end
    end,
    'Bar próprio: ' || trim(to_char(v_bar_proprio,'FM999999990D999')) || ' L',
    'Perda: ' || trim(to_char(v_perda_final,'FM999999990D999')) || ' L',
    'Saldo após: ' || trim(to_char(v_saldo_depois,'FM999999990D999')) || ' L'
  );

  insert into public.envases (
    producao_id, lote, cerveja_nome, origem,
    q10, q20, q30, q50,
    litros_barris,
    litros_incompleto_bar,
    litros_incompleto,
    barril_incompleto_tamanho,
    barril_incompleto_codigo,
    litros_bar_proprio,
    litros_total,
    perda,
    perda_informada,
    saldo_apos,
    finalizado,
    observacao
  )
  values (
    v_producao.id, v_producao.lote, v_producao.cerveja_nome, v_origem,
    v_q10, v_q20, v_q30, v_q50,
    v_completos,
    v_incompleto + v_bar_proprio,
    v_incompleto,
    case when v_incompleto > 0 then p_capacidade_incompleto end,
    case when v_incompleto > 0
      then nullif(trim(coalesce(p_codigo_incompleto,'')),'')
    end,
    v_bar_proprio,
    v_total_envase,
    v_perda_final,
    v_perda_final,
    v_saldo_depois,
    coalesce(p_finalizar,false),
    v_observacao
  )
  returning id into v_envase_id;

  if v_incompleto > 0 then
    insert into public.barris_incompletos (
      envase_id, producao_id, cerveja_id, cerveja_nome,
      lote, origem, capacidade_litros, litros_atuais,
      codigo, status, observacao
    )
    values (
      v_envase_id, v_producao.id, v_cerveja_id, v_producao.cerveja_nome,
      v_producao.lote, v_origem, p_capacidade_incompleto, v_incompleto,
      nullif(trim(coalesce(p_codigo_incompleto,'')),''),
      'DISPONIVEL',
      nullif(trim(coalesce(p_observacao,'')),'')
    );
  end if;

  if v_completos > 0 then
    insert into public.estoque_cerveja (
      cerveja_id, cerveja_nome, origem,
      q10, q20, q30, q50, litros, atualizado_em
    )
    values (
      v_cerveja_id, v_producao.cerveja_nome, v_origem,
      v_q10, v_q20, v_q30, v_q50, v_completos, now()
    )
    on conflict (cerveja_nome, origem)
    do update set
      cerveja_id = excluded.cerveja_id,
      q10 = coalesce(public.estoque_cerveja.q10,0) + excluded.q10,
      q20 = coalesce(public.estoque_cerveja.q20,0) + excluded.q20,
      q30 = coalesce(public.estoque_cerveja.q30,0) + excluded.q30,
      q50 = coalesce(public.estoque_cerveja.q50,0) + excluded.q50,
      litros =
        (coalesce(public.estoque_cerveja.q10,0) + excluded.q10) * 10
        + (coalesce(public.estoque_cerveja.q20,0) + excluded.q20) * 20
        + (coalesce(public.estoque_cerveja.q30,0) + excluded.q30) * 30
        + (coalesce(public.estoque_cerveja.q50,0) + excluded.q50) * 50,
      atualizado_em = now();
  end if;

  if v_origem = 'PHENOMENA'
     and (v_completos + v_incompleto) > 0 then
    insert into public.phenomena_entradas (
      envase_id, cerveja_nome,
      q10, q20, q30, q50, litros, observacao
    )
    values (
      v_envase_id, v_producao.cerveja_nome,
      v_q10, v_q20, v_q30, v_q50,
      v_completos + v_incompleto,
      'Envase Phenomena: ' || v_observacao
    );
  end if;

  update public.producoes
  set status = v_status
  where id = v_producao.id;

  insert into public.movimentacoes (
    tipo, categoria, item_nome, quantidade,
    unidade, origem, lote, observacao
  )
  values (
    'ENVASE', 'CERVEJA', v_producao.cerveja_nome,
    v_total_envase, 'L', v_origem, v_producao.lote, v_observacao
  );

  insert into public.movimentacoes (
    tipo, categoria, item_nome, quantidade,
    unidade, lote, observacao
  )
  values (
    'STATUS LOTE', 'PRODUCAO', v_producao.cerveja_nome,
    0, '', v_producao.lote,
    'Status alterado para ' || v_status
  );

  return jsonb_build_object(
    'envase_id', v_envase_id,
    'litros_total', v_total_envase,
    'perda', v_perda_final,
    'saldo_apos', v_saldo_depois,
    'status', v_status
  );
end;
$$;

revoke all on function public.erp_registrar_envase(
  uuid,text,integer,integer,integer,integer,numeric,integer,text,
  numeric,numeric,boolean,text
) from public, anon;

grant execute on function public.erp_registrar_envase(
  uuid,text,integer,integer,integer,integer,numeric,integer,text,
  numeric,numeric,boolean,text
) to authenticated;

create or replace function public.erp_registrar_dry_hopping(
  p_producao_id uuid,
  p_itens jsonb,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_producao public.producoes%rowtype;
  v_insumo record;
  v_estoque public.estoque_insumos%rowtype;
  v_quantidade_itens integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.app_tem_permissao('producao','editar') then
    raise exception 'Usuário sem permissão para registrar dry hopping.';
  end if;

  if p_itens is null
     or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe ao menos um lúpulo.';
  end if;

  select *
  into v_producao
  from public.producoes
  where id = p_producao_id
  for update;

  if not found then
    raise exception 'Lote não encontrado.';
  end if;

  if coalesce(v_producao.status,'') in ('FINALIZADO','ENVASADO') then
    raise exception 'Este lote já foi encerrado.';
  end if;

  for v_insumo in
    select
      trim(x.nome) as nome,
      max(trim(x.unidade)) as unidade,
      sum(coalesce(x.quantidade,0)) as quantidade
    from jsonb_to_recordset(coalesce(p_itens,'[]'::jsonb))
      as x(nome text, unidade text, quantidade numeric)
    where nullif(trim(x.nome),'') is not null
      and coalesce(x.quantidade,0) > 0
    group by trim(x.nome)
    order by trim(x.nome)
  loop
    select *
    into v_estoque
    from public.estoque_insumos
    where tipo = 'LUPULO'
      and nome = v_insumo.nome
    for update;

    if not found
       or coalesce(v_estoque.quantidade,0) < v_insumo.quantidade then
      raise exception
        'Estoque insuficiente de %. Necessário % %, disponível % %.',
        v_insumo.nome,
        v_insumo.quantidade,
        coalesce(v_insumo.unidade,''),
        coalesce(v_estoque.quantidade,0),
        coalesce(v_estoque.unidade,v_insumo.unidade,'');
    end if;

    update public.estoque_insumos
    set
      quantidade = coalesce(quantidade,0) - v_insumo.quantidade,
      atualizado_em = now()
    where id = v_estoque.id;

    insert into public.dry_hopping (
      producao_id, lote, lupulo_nome,
      quantidade, unidade, observacao
    )
    values (
      v_producao.id, v_producao.lote, v_insumo.nome,
      v_insumo.quantidade,
      coalesce(v_estoque.unidade,v_insumo.unidade),
      nullif(trim(coalesce(p_observacao,'')),'')
    );

    insert into public.producao_insumos (
      producao_id, lote, tipo, insumo_nome,
      quantidade, unidade, etapa
    )
    values (
      v_producao.id, v_producao.lote, 'LUPULO', v_insumo.nome,
      v_insumo.quantidade,
      coalesce(v_estoque.unidade,v_insumo.unidade),
      'DRY_HOPPING'
    );

    insert into public.movimentacoes (
      tipo, categoria, item_nome, quantidade,
      unidade, lote, observacao
    )
    values (
      'BAIXA DRY HOPPING', 'INSUMO', v_insumo.nome,
      -abs(v_insumo.quantidade),
      coalesce(v_estoque.unidade,v_insumo.unidade),
      v_producao.lote,
      nullif(trim(coalesce(p_observacao,'')),'')
    );

    v_quantidade_itens := v_quantidade_itens + 1;
  end loop;

  if v_quantidade_itens = 0 then
    raise exception 'Informe ao menos um lúpulo com quantidade.';
  end if;

  update public.producoes
  set status = 'DRY_HOPPING'
  where id = v_producao.id;

  insert into public.movimentacoes (
    tipo, categoria, item_nome, quantidade,
    unidade, lote, observacao
  )
  values (
    'STATUS LOTE', 'PRODUCAO', v_producao.cerveja_nome,
    0, '', v_producao.lote,
    'Status alterado para Dry hopping'
  );

  return jsonb_build_object(
    'producao_id', v_producao.id,
    'lote', v_producao.lote,
    'quantidade_itens', v_quantidade_itens,
    'status', 'DRY_HOPPING'
  );
end;
$$;

revoke all on function public.erp_registrar_dry_hopping(
  uuid,jsonb,text
) from public, anon;

grant execute on function public.erp_registrar_dry_hopping(
  uuid,jsonb,text
) to authenticated;

commit;

notify pgrst, 'reload schema';
