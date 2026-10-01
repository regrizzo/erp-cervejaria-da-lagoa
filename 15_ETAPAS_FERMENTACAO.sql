-- ============================================================
-- ERP CERVEJARIA DA LAGOA
-- ETAPAS DA FERMENTACAO
--
-- Adiciona ao fluxo operacional:
--   FERMENTANDO -> RAMPA_DIACETIL -> MATURACAO -> DRY_HOPPING
--
-- As duas novas etapas continuam ocupando o tanque.
-- Execute UMA VEZ no SQL Editor do Supabase antes de publicar o site.
-- ============================================================

begin;

alter table public.producoes
  drop constraint if exists producoes_status_valido;

alter table public.producoes
  add constraint producoes_status_valido
  check (
    status in (
      'INSUMOS_REGISTRADOS',
      'FERMENTANDO',
      'RAMPA_DIACETIL',
      'MATURACAO',
      'DRY_HOPPING',
      'PRONTO_ENVASE',
      'PARCIALMENTE_ENVASADO',
      'ENVASADO',
      'FINALIZADO'
    )
  ) not valid;

drop index if exists public.producoes_tanque_ativo_unico;

create unique index producoes_tanque_ativo_unico
on public.producoes (tanque)
where tanque is not null
  and status in (
    'INSUMOS_REGISTRADOS',
    'FERMENTANDO',
    'RAMPA_DIACETIL',
    'MATURACAO',
    'DRY_HOPPING',
    'PRONTO_ENVASE',
    'PARCIALMENTE_ENVASADO'
  );

comment on constraint producoes_status_valido on public.producoes is
  'Etapas permitidas no fluxo de producao e envase.';

notify pgrst, 'reload schema';

commit;

-- Conferencia sem alterar dados:
select
  exists (
    select 1
    from pg_constraint
    where conname = 'producoes_status_valido'
      and conrelid = 'public.producoes'::regclass
  ) as status_producao_ok,
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'producoes_tanque_ativo_unico'
      and indexdef like '%RAMPA_DIACETIL%'
      and indexdef like '%MATURACAO%'
  ) as tanque_novas_etapas_ok;
