-- ============================================================
-- ERP CERVEJARIA DA LAGOA
-- CORREÇÃO DO PRIMEIRO LANÇAMENTO ANARCHY
--
-- Contexto correto:
-- 22/07/2026: Renan 30 L + Brazza 28 L + Layback 30 L
--              total 88 L / R$ 264,00
-- 24/07/2026: retirada separada de 30 L / R$ 90,00
--
-- O envase antigo registrou 19 barris completos e guardou apenas
-- na observação que um deles continha 28 L. Esta correção:
--   1. estrutura o envase como 18 completos + 1 incompleto de 28 L;
--   2. cria o barril histórico já como saída definitiva para Brazza;
--   3. corrige o primeiro débito para 88 L / R$ 264,00;
--   4. mantém o segundo débito em 30 L / R$ 90,00;
--   5. não altera o estoque atual, que já contém 15 barris completos.
-- ============================================================

begin;

do $$
declare
  v_quantidade integer;
  v_primeiro public.phenomena_debitos%rowtype;
  v_segundo public.phenomena_debitos%rowtype;
  v_incompleto public.barris_incompletos%rowtype;
  v_envase public.envases%rowtype;
  v_cerveja_id uuid;
begin
  -- Permite executar novamente sem duplicar a correção.
  select count(*)
  into v_quantidade
  from public.phenomena_debitos p
  where upper(trim(p.cerveja_nome)) = 'ANARCHY'
    and p.criado_em >= timestamptz '2026-07-22 00:00:00-03'
    and p.criado_em < timestamptz '2026-07-23 00:00:00-03'
    and coalesce(p.q30,0) = 2
    and round(coalesce(p.litros,0),3) = 88
    and round(coalesce(p.valor_total,0),2) = 264
    and p.barril_incompleto_id is not null
    and exists (
      select 1
      from public.phenomena_debitos s
      where upper(trim(s.cerveja_nome)) = 'ANARCHY'
        and s.criado_em >= timestamptz '2026-07-24 00:00:00-03'
        and s.criado_em < timestamptz '2026-07-25 00:00:00-03'
        and coalesce(s.q30,0) = 1
        and round(coalesce(s.litros,0),3) = 30
        and round(coalesce(s.valor_total,0),2) = 90
        and s.barril_incompleto_id is null
    );

  if v_quantidade = 1 then
    raise notice 'A correção Anarchy/Brazza já foi aplicada.';
    return;
  end if;

  select count(*)
  into v_quantidade
  from public.phenomena_debitos
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and criado_em >= timestamptz '2026-07-22 00:00:00-03'
    and criado_em < timestamptz '2026-07-23 00:00:00-03'
    and coalesce(q10,0) = 0
    and coalesce(q20,0) = 0
    and coalesce(q30,0) = 3
    and coalesce(q50,0) = 0
    and round(coalesce(litros,0),3) = 90
    and round(coalesce(valor_litro,0),2) = 3
    and round(coalesce(valor_total,0),2) = 270
    and round(coalesce(valor_pago,0),2) <= 264;

  if v_quantidade <> 1 then
    raise exception
      'Correção cancelada: esperado 1 primeiro lançamento Anarchy de 90 L / R$ 270,00; encontrado %.',
      v_quantidade;
  end if;

  select *
  into v_primeiro
  from public.phenomena_debitos
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and criado_em >= timestamptz '2026-07-22 00:00:00-03'
    and criado_em < timestamptz '2026-07-23 00:00:00-03'
    and coalesce(q30,0) = 3
    and round(coalesce(litros,0),3) = 90
    and round(coalesce(valor_total,0),2) = 270
  for update;

  select count(*)
  into v_quantidade
  from public.phenomena_debitos
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and criado_em >= timestamptz '2026-07-24 00:00:00-03'
    and criado_em < timestamptz '2026-07-25 00:00:00-03'
    and coalesce(q10,0) = 0
    and coalesce(q20,0) = 0
    and coalesce(q30,0) = 1
    and coalesce(q50,0) = 0
    and round(coalesce(litros,0),3) = 30
    and round(coalesce(valor_litro,0),2) = 3
    and round(coalesce(valor_total,0),2) = 90
    and barril_incompleto_id is null;

  if v_quantidade <> 1 then
    raise exception
      'Correção cancelada: esperado 1 segundo lançamento Anarchy de 30 L / R$ 90,00; encontrado %.',
      v_quantidade;
  end if;

  select *
  into v_segundo
  from public.phenomena_debitos
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and criado_em >= timestamptz '2026-07-24 00:00:00-03'
    and criado_em < timestamptz '2026-07-25 00:00:00-03'
    and coalesce(q30,0) = 1
    and round(coalesce(litros,0),3) = 30
    and round(coalesce(valor_total,0),2) = 90
    and barril_incompleto_id is null
  for update;

  select count(*)
  into v_quantidade
  from public.envases
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and origem = 'PHENOMENA'
    and data_envase = date '2026-07-22'
    and coalesce(q30,0) = 19
    and round(coalesce(litros_barris,0),3) = 570
    and round(coalesce(litros_incompleto,0),3) = 0
    and round(coalesce(litros_bar_proprio,0),3) = 200
    and round(coalesce(litros_total,0),3) = 770
    and round(coalesce(perda,0),3) = 180
    and coalesce(finalizado,false);

  if v_quantidade <> 1 then
    raise exception
      'Correção cancelada: esperado 1 envase Anarchy com 19 barris de 30 L, bar próprio 200 L e total 770 L; encontrado %.',
      v_quantidade;
  end if;

  select *
  into v_envase
  from public.envases
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and origem = 'PHENOMENA'
    and data_envase = date '2026-07-22'
    and coalesce(q30,0) = 19
    and round(coalesce(litros_barris,0),3) = 570
    and round(coalesce(litros_incompleto,0),3) = 0
    and round(coalesce(litros_bar_proprio,0),3) = 200
    and round(coalesce(litros_total,0),3) = 770
    and round(coalesce(perda,0),3) = 180
    and coalesce(finalizado,false)
  for update;

  select count(*)
  into v_quantidade
  from public.barris_incompletos
  where envase_id = v_envase.id;

  if v_quantidade <> 0 then
    raise exception
      'Correção cancelada: o envase já possui % barril(is) incompleto(s) estruturado(s).',
      v_quantidade;
  end if;

  select count(*)
  into v_quantidade
  from public.phenomena_entradas
  where envase_id = v_envase.id
    and upper(trim(cerveja_nome)) = 'ANARCHY';

  if v_quantidade <> 1 then
    raise exception
      'Correção cancelada: entrada Phenomena do envase não identificada com segurança.';
  end if;

  select count(*)
  into v_quantidade
  from public.movimentacoes
  where tipo = 'ENVASE'
    and upper(trim(item_nome)) = 'ANARCHY'
    and lote = v_envase.lote
    and criado_em >= v_envase.criado_em - interval '30 seconds'
    and criado_em <= v_envase.criado_em + interval '5 minutes';

  if v_quantidade <> 1 then
    raise exception
      'Correção cancelada: movimentação do envase não identificada com segurança.';
  end if;

  select count(*)
  into v_quantidade
  from public.movimentacoes
  where tipo = 'RETIRADA PHENOMENA'
    and upper(trim(item_nome)) = 'ANARCHY'
    and criado_em >= v_primeiro.criado_em - interval '30 seconds'
    and criado_em <= v_primeiro.criado_em + interval '5 minutes';

  if v_quantidade <> 1 then
    raise exception
      'Correção cancelada: movimentação da primeira retirada não identificada com segurança.';
  end if;

  select count(*)
  into v_quantidade
  from public.movimentacoes
  where tipo = 'DÉBITO PHENOMENA'
    and upper(trim(item_nome)) = 'ANARCHY'
    and criado_em >= v_primeiro.criado_em - interval '30 seconds'
    and criado_em <= v_primeiro.criado_em + interval '5 minutes';

  if v_quantidade <> 1 then
    raise exception
      'Correção cancelada: movimentação do primeiro débito não identificada com segurança.';
  end if;

  select id
  into v_cerveja_id
  from public.cervejas
  where upper(trim(nome)) = 'ANARCHY'
  order by criado_em
  limit 1;

  update public.envases
  set
    q30 = 18,
    litros_barris = 540,
    litros_incompleto_bar = 228,
    litros_incompleto = 28,
    barril_incompleto_tamanho = 30,
    barril_incompleto_codigo = null,
    litros_total = 768,
    perda = 182,
    perda_informada = 182,
    saldo_apos = 0,
    observacao = concat_ws(
      ' | ',
      nullif(trim(coalesce(observacao,'')),''),
      'Correção estruturada: 18 barris completos de 30 L + 1 barril incompleto de 28/30 L; bar próprio 200 L; perda total 182 L.'
    )
  where id = v_envase.id;

  update public.phenomena_entradas
  set
    q30 = 18,
    litros = 568,
    observacao = concat_ws(
      ' | ',
      nullif(trim(coalesce(observacao,'')),''),
      'Correção: 18 barris completos de 30 L + 1 incompleto de 28/30 L.'
    )
  where envase_id = v_envase.id;

  update public.movimentacoes
  set
    quantidade = 768,
    observacao = concat_ws(
      ' | ',
      nullif(trim(coalesce(observacao,'')),''),
      'Correção do envase: 18 barris completos de 30 L + 1 incompleto de 28 L; perda total 182 L.'
    )
  where tipo = 'ENVASE'
    and upper(trim(item_nome)) = 'ANARCHY'
    and lote = v_envase.lote
    and criado_em >= v_envase.criado_em - interval '30 seconds'
    and criado_em <= v_envase.criado_em + interval '5 minutes';

  insert into public.barris_incompletos (
    envase_id,
    producao_id,
    cerveja_id,
    cerveja_nome,
    lote,
    origem,
    capacidade_litros,
    litros_atuais,
    codigo,
    status,
    observacao
  )
  values (
    v_envase.id,
    v_envase.producao_id,
    v_cerveja_id,
    'ANARCHY',
    v_envase.lote,
    'PHENOMENA',
    30,
    28,
    null,
    'CONSUMIDO',
    'Registro histórico estruturado. Saída definitiva para Brazza no débito ' || v_primeiro.id
  )
  returning * into v_incompleto;

  update public.phenomena_debitos
  set
    q30 = 2,
    barril_incompleto_id = v_incompleto.id,
    litros = 88,
    valor_total = 264,
    status = case
      when round(coalesce(valor_pago,0),2) >= 264 then 'PAGO'
      when round(coalesce(valor_pago,0),2) > 0 then 'PARCIAL'
      else 'ABERTO'
    end,
    pago_em = case
      when round(coalesce(valor_pago,0),2) >= 264 then coalesce(pago_em,now())
      else null
    end,
    observacao = concat_ws(
      ' | ',
      nullif(trim(coalesce(observacao,'')),''),
      'Composição correta: Renan 30 L; Brazza 28 L em barril de 30 L; Layback 30 L. Total 88 L / R$ 264,00.'
    )
  where id = v_primeiro.id;

  update public.movimentacoes
  set
    quantidade = -88,
    observacao = concat_ws(
      ' | ',
      nullif(trim(coalesce(observacao,'')),''),
      'Composição correta: Renan 30 L; Brazza 28 L; Layback 30 L.'
    )
  where tipo = 'RETIRADA PHENOMENA'
    and upper(trim(item_nome)) = 'ANARCHY'
    and criado_em >= v_primeiro.criado_em - interval '30 seconds'
    and criado_em <= v_primeiro.criado_em + interval '5 minutes';

  update public.movimentacoes
  set
    quantidade = 264,
    observacao = concat_ws(
      ' | ',
      nullif(trim(coalesce(observacao,'')),''),
      'Débito corrigido para 88 L / R$ 264,00.'
    )
  where tipo = 'DÉBITO PHENOMENA'
    and upper(trim(item_nome)) = 'ANARCHY'
    and criado_em >= v_primeiro.criado_em - interval '30 seconds'
    and criado_em <= v_primeiro.criado_em + interval '5 minutes';

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
    'Primeiro débito ' || v_primeiro.id
      || ' corrigido de 90 L / R$ 270,00 para 88 L / R$ 264,00. '
      || 'Renan 30 L; Brazza 28 L; Layback 30 L. '
      || 'Segundo débito ' || v_segundo.id || ' mantido em 30 L / R$ 90,00.',
    'Correção SQL 09'
  );

  raise notice
    'Correção concluída: primeiro lançamento 88 L / R$ 264,00; segundo lançamento mantido em 30 L / R$ 90,00; estoque atual não alterado.';
end;
$$;

commit;

select
  criado_em,
  cerveja_nome,
  q30,
  litros,
  valor_total,
  valor_pago,
  status,
  barril_incompleto_id,
  observacao
from public.phenomena_debitos
where upper(trim(cerveja_nome)) = 'ANARCHY'
  and criado_em >= timestamptz '2026-07-22 00:00:00-03'
  and criado_em < timestamptz '2026-07-25 00:00:00-03'
order by criado_em;
