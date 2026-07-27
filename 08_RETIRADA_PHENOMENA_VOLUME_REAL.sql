-- ============================================================
-- ERP CERVEJARIA DA LAGOA
-- RETIRADA PHENOMENA COM BARRIL INCOMPLETO E VOLUME REAL
--
-- Execute UMA VEZ no SQL Editor do Supabase antes de publicar
-- os arquivos atualizados do site.
-- ============================================================

begin;

alter table public.phenomena_debitos
  add column if not exists barril_incompleto_id uuid
  references public.barris_incompletos(id) on delete set null;

create index if not exists phenomena_debitos_barril_incompleto_idx
  on public.phenomena_debitos(barril_incompleto_id);

create or replace function public.erp_registrar_retirada_phenomena(
  p_cerveja_nome text,
  p_q10 integer default 0,
  p_q20 integer default 0,
  p_q30 integer default 0,
  p_q50 integer default 0,
  p_barril_incompleto_id uuid default null,
  p_responsavel text default null,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cerveja_nome text := trim(coalesce(p_cerveja_nome,''));
  v_q10 integer := coalesce(p_q10,0);
  v_q20 integer := coalesce(p_q20,0);
  v_q30 integer := coalesce(p_q30,0);
  v_q50 integer := coalesce(p_q50,0);
  v_litros_completos numeric;
  v_litros_incompleto numeric := 0;
  v_litros_total numeric;
  v_valor_litro numeric := 3;
  v_valor_total numeric;
  v_estoque public.estoque_cerveja%rowtype;
  v_incompleto public.barris_incompletos%rowtype;
  v_debito_id uuid;
  v_detalhe_incompleto text;
  v_observacao_debito text;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.app_tem_permissao('phenomena','editar') then
    raise exception 'Usuário sem permissão para registrar retiradas da Phenomena.';
  end if;

  if v_cerveja_nome = '' then
    raise exception 'Selecione a cerveja da retirada.';
  end if;

  if least(v_q10,v_q20,v_q30,v_q50) < 0 then
    raise exception 'As quantidades de barris não podem ser negativas.';
  end if;

  v_litros_completos := v_q10 * 10 + v_q20 * 20 + v_q30 * 30 + v_q50 * 50;

  if v_litros_completos > 0 then
    select *
    into v_estoque
    from public.estoque_cerveja
    where cerveja_nome = v_cerveja_nome
      and origem = 'PHENOMENA'
    for update;

    if not found then
      raise exception 'Não existe estoque Phenomena de %.', v_cerveja_nome;
    end if;

    if coalesce(v_estoque.q10,0) < v_q10
      or coalesce(v_estoque.q20,0) < v_q20
      or coalesce(v_estoque.q30,0) < v_q30
      or coalesce(v_estoque.q50,0) < v_q50 then
      raise exception 'Estoque de barris completos insuficiente para esta retirada.';
    end if;
  end if;

  if p_barril_incompleto_id is not null then
    select *
    into v_incompleto
    from public.barris_incompletos
    where id = p_barril_incompleto_id
      and cerveja_nome = v_cerveja_nome
      and origem = 'PHENOMENA'
      and status = 'DISPONIVEL'
    for update;

    if not found then
      raise exception 'O barril incompleto selecionado não está mais disponível.';
    end if;

    v_litros_incompleto := round(coalesce(v_incompleto.litros_atuais,0),3);
    v_detalhe_incompleto := concat(
      'Barril incompleto: ',
      trim(to_char(v_litros_incompleto,'FM999999990D999')),
      '/',
      v_incompleto.capacidade_litros,
      ' L',
      case
        when nullif(trim(coalesce(v_incompleto.codigo,'')),'') is not null
        then ' • código ' || trim(v_incompleto.codigo)
        else ''
      end
    );
  end if;

  v_litros_total := round(v_litros_completos + v_litros_incompleto,3);

  if v_litros_total <= 0 then
    raise exception 'Informe ao menos um barril completo ou incompleto.';
  end if;

  select case
    when replace(trim(valor),',','.') ~ '^[0-9]+([.][0-9]+)?$'
      then replace(trim(valor),',','.')::numeric
    else 3
  end
  into v_valor_litro
  from public.configuracoes
  where chave = 'valor_litro_phenomena';

  v_valor_litro := coalesce(nullif(v_valor_litro,0),3);
  v_valor_total := round(v_litros_total * v_valor_litro,2);
  v_observacao_debito := concat_ws(
    ' | ',
    nullif(trim(coalesce(p_observacao,'')),''),
    nullif(v_detalhe_incompleto,'')
  );

  if v_litros_completos > 0 then
    update public.estoque_cerveja
    set
      q10 = coalesce(q10,0) - v_q10,
      q20 = coalesce(q20,0) - v_q20,
      q30 = coalesce(q30,0) - v_q30,
      q50 = coalesce(q50,0) - v_q50,
      litros = (coalesce(q10,0) - v_q10) * 10
        + (coalesce(q20,0) - v_q20) * 20
        + (coalesce(q30,0) - v_q30) * 30
        + (coalesce(q50,0) - v_q50) * 50,
      atualizado_em = now()
    where id = v_estoque.id;
  end if;

  insert into public.phenomena_debitos (
    cerveja_nome,
    q10,
    q20,
    q30,
    q50,
    barril_incompleto_id,
    litros,
    valor_litro,
    valor_total,
    valor_pago,
    status,
    responsavel,
    observacao
  )
  values (
    v_cerveja_nome,
    v_q10,
    v_q20,
    v_q30,
    v_q50,
    p_barril_incompleto_id,
    v_litros_total,
    v_valor_litro,
    v_valor_total,
    0,
    'ABERTO',
    nullif(trim(coalesce(p_responsavel,'')),''),
    nullif(v_observacao_debito,'')
  )
  returning id into v_debito_id;

  if p_barril_incompleto_id is not null then
    update public.barris_incompletos
    set
      status = 'CONSUMIDO',
      observacao = concat_ws(
        ' | ',
        nullif(trim(coalesce(observacao,'')),''),
        'Retirado pela Phenomena no débito ' || v_debito_id
      ),
      atualizado_em = now()
    where id = p_barril_incompleto_id;
  end if;

  insert into public.movimentacoes (
    tipo,
    categoria,
    item_nome,
    quantidade,
    unidade,
    origem,
    observacao,
    responsavel
  )
  values (
    'RETIRADA PHENOMENA',
    'CERVEJA',
    v_cerveja_nome,
    -abs(v_litros_total),
    'L',
    'PHENOMENA',
    concat_ws(
      ' | ',
      'Débito gerado: R$ ' || trim(to_char(v_valor_total,'FM999999990D00')),
      nullif(v_detalhe_incompleto,''),
      nullif(trim(coalesce(p_observacao,'')),'')
    ),
    nullif(trim(coalesce(p_responsavel,'')),'')
  );

  insert into public.movimentacoes (
    tipo,
    categoria,
    item_nome,
    quantidade,
    unidade,
    origem,
    observacao,
    responsavel
  )
  values (
    'DÉBITO PHENOMENA',
    'FINANCEIRO',
    v_cerveja_nome,
    v_valor_total,
    'R$',
    'PHENOMENA',
    concat_ws(
      ' | ',
      'Débito ' || v_debito_id,
      nullif(v_detalhe_incompleto,''),
      nullif(trim(coalesce(p_observacao,'')),'')
    ),
    nullif(trim(coalesce(p_responsavel,'')),'')
  );

  return jsonb_build_object(
    'debito_id', v_debito_id,
    'cerveja_nome', v_cerveja_nome,
    'litros_completos', v_litros_completos,
    'litros_incompleto', v_litros_incompleto,
    'litros', v_litros_total,
    'valor_litro', v_valor_litro,
    'valor_total', v_valor_total,
    'barril_incompleto_id', p_barril_incompleto_id
  );
end;
$$;

revoke all on function public.erp_registrar_retirada_phenomena(
  text,integer,integer,integer,integer,uuid,text,text
) from public, anon;

grant execute on function public.erp_registrar_retirada_phenomena(
  text,integer,integer,integer,integer,uuid,text,text
) to authenticated;

-- Correção pontual do lançamento exibido em 24/07/2026:
-- ANARCHY registrada como barril completo de 30 L / R$ 90,00,
-- embora o barril incompleto disponível possua 28 L / R$ 84,00.
-- O bloco só altera os dados quando encontra exatamente um débito
-- e exatamente um barril com essas características.
do $$
declare
  v_quantidade integer;
  v_debito public.phenomena_debitos%rowtype;
  v_incompleto public.barris_incompletos%rowtype;
  v_estoque_id uuid;
begin
  select count(*)
  into v_quantidade
  from public.phenomena_debitos
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and coalesce(q10,0) = 0
    and coalesce(q20,0) = 0
    and coalesce(q30,0) = 1
    and coalesce(q50,0) = 0
    and round(coalesce(litros,0),3) = 30
    and round(coalesce(valor_litro,0),2) = 3
    and round(coalesce(valor_total,0),2) = 90
    and round(coalesce(valor_pago,0),2) = 0
    and coalesce(status,'ABERTO') = 'ABERTO'
    and criado_em >= timestamptz '2026-07-24 00:00:00-03'
    and criado_em < timestamptz '2026-07-25 00:00:00-03';

  if v_quantidade <> 1 then
    raise notice 'Correção Anarchy não aplicada: foram encontrados % débitos compatíveis.', v_quantidade;
    return;
  end if;

  select *
  into v_debito
  from public.phenomena_debitos
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and coalesce(q10,0) = 0
    and coalesce(q20,0) = 0
    and coalesce(q30,0) = 1
    and coalesce(q50,0) = 0
    and round(coalesce(litros,0),3) = 30
    and round(coalesce(valor_total,0),2) = 90
    and round(coalesce(valor_pago,0),2) = 0
    and coalesce(status,'ABERTO') = 'ABERTO'
    and criado_em >= timestamptz '2026-07-24 00:00:00-03'
    and criado_em < timestamptz '2026-07-25 00:00:00-03'
  for update;

  select count(*)
  into v_quantidade
  from public.barris_incompletos
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and origem = 'PHENOMENA'
    and status = 'DISPONIVEL'
    and capacidade_litros = 30
    and round(coalesce(litros_atuais,0),3) = 28;

  if v_quantidade <> 1 then
    raise notice 'Correção Anarchy não aplicada: foram encontrados % barris incompletos de 28/30 L.', v_quantidade;
    return;
  end if;

  select *
  into v_incompleto
  from public.barris_incompletos
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and origem = 'PHENOMENA'
    and status = 'DISPONIVEL'
    and capacidade_litros = 30
    and round(coalesce(litros_atuais,0),3) = 28
  for update;

  select id
  into v_estoque_id
  from public.estoque_cerveja
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and origem = 'PHENOMENA'
  for update;

  if v_estoque_id is null then
    raise notice 'Correção Anarchy não aplicada: estoque Phenomena não encontrado.';
    return;
  end if;

  update public.estoque_cerveja
  set
    q30 = coalesce(q30,0) + 1,
    litros = coalesce(litros,0) + 30,
    atualizado_em = now()
  where id = v_estoque_id;

  update public.barris_incompletos
  set
    status = 'CONSUMIDO',
    observacao = concat_ws(
      ' | ',
      nullif(trim(coalesce(observacao,'')),''),
      'Retirada Phenomena corrigida para 28 L no débito ' || v_debito.id
    ),
    atualizado_em = now()
  where id = v_incompleto.id;

  update public.phenomena_debitos
  set
    q30 = 0,
    barril_incompleto_id = v_incompleto.id,
    litros = 28,
    valor_total = 84,
    observacao = concat_ws(
      ' | ',
      nullif(trim(coalesce(observacao,'')),''),
      'Correção: barril incompleto 28/30 L; débito ajustado de R$ 90,00 para R$ 84,00.'
    )
  where id = v_debito.id;

  update public.movimentacoes
  set
    quantidade = -28,
    observacao = concat_ws(
      ' | ',
      nullif(trim(coalesce(observacao,'')),''),
      'Correção para barril incompleto 28/30 L; débito R$ 84,00.'
    )
  where id = (
    select id
    from public.movimentacoes
    where tipo = 'RETIRADA PHENOMENA'
      and upper(trim(item_nome)) = 'ANARCHY'
      and criado_em >= v_debito.criado_em - interval '30 seconds'
      and criado_em <= v_debito.criado_em + interval '5 minutes'
    order by criado_em
    limit 1
  );

  update public.movimentacoes
  set
    quantidade = 84,
    observacao = concat_ws(
      ' | ',
      nullif(trim(coalesce(observacao,'')),''),
      'Correção para volume real de 28 L.'
    )
  where id = (
    select id
    from public.movimentacoes
    where tipo = 'DÉBITO PHENOMENA'
      and upper(trim(item_nome)) = 'ANARCHY'
      and criado_em >= v_debito.criado_em - interval '30 seconds'
      and criado_em <= v_debito.criado_em + interval '5 minutes'
    order by criado_em
    limit 1
  );

  insert into public.movimentacoes (
    tipo,
    categoria,
    item_nome,
    quantidade,
    unidade,
    origem,
    observacao,
    responsavel
  )
  values (
    'CORREÇÃO DÉBITO PHENOMENA',
    'FINANCEIRO',
    'ANARCHY',
    -6,
    'R$',
    'PHENOMENA',
    'Débito ' || v_debito.id || ' corrigido de R$ 90,00 para R$ 84,00 porque o barril continha 28 L.',
    'Correção SQL 08'
  );

  raise notice 'Débito Anarchy % corrigido para 28 L / R$ 84,00.', v_debito.id;
end;
$$;

commit;

notify pgrst, 'reload schema';
