-- ============================================================
-- ERP CERVEJARIA DA LAGOA
-- HISTORICO E DATA EFETIVA DAS ETAPAS DE PRODUCAO
--
-- Guarda a data real de inicio de cada etapa e permite corrigi-la.
-- Execute UMA VEZ no SQL Editor do Supabase, depois do arquivo 15.
-- ============================================================

begin;

create table if not exists public.producao_etapas (
  id uuid primary key default gen_random_uuid(),
  producao_id uuid not null
    references public.producoes(id) on delete cascade,
  status text not null,
  data_etapa date not null default current_date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  atualizado_por uuid default auth.uid(),
  constraint producao_etapas_status_valido
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
    ),
  constraint producao_etapas_data_nao_futura
    check (data_etapa <= current_date),
  constraint producao_etapas_unica
    unique (producao_id, status)
);

comment on table public.producao_etapas is
  'Data efetiva de inicio de cada etapa do processo de producao.';

alter table public.producao_etapas enable row level security;

drop policy if exists producao_etapas_select_autenticado
on public.producao_etapas;

create policy producao_etapas_select_autenticado
on public.producao_etapas
for select to authenticated
using ((select auth.uid()) is not null);

revoke all on table public.producao_etapas from public, anon;
grant select on table public.producao_etapas to authenticated;

create or replace function public.erp_registrar_etapa_producao_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.producao_etapas (
    producao_id,
    status,
    data_etapa,
    criado_por,
    atualizado_por
  )
  values (
    new.id,
    new.status,
    case
      when tg_op = 'INSERT'
        then coalesce(new.data_producao, current_date)
      else current_date
    end,
    (select auth.uid()),
    (select auth.uid())
  )
  on conflict (producao_id, status) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_producoes_registrar_etapa
on public.producoes;

create trigger trg_producoes_registrar_etapa
after insert or update of status
on public.producoes
for each row
execute function public.erp_registrar_etapa_producao_trigger();

create or replace function public.erp_alterar_etapa_producao(
  p_producao_id uuid,
  p_novo_status text,
  p_data_etapa date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_producao public.producoes%rowtype;
  v_status text := upper(trim(coalesce(p_novo_status,'')));
  v_data date := coalesce(p_data_etapa, current_date);
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.app_tem_permissao('producao','editar') then
    raise exception 'Usuario sem permissao para alterar a etapa da producao.';
  end if;

  if v_status not in (
    'INSUMOS_REGISTRADOS',
    'FERMENTANDO',
    'RAMPA_DIACETIL',
    'MATURACAO',
    'DRY_HOPPING',
    'PRONTO_ENVASE',
    'PARCIALMENTE_ENVASADO',
    'ENVASADO',
    'FINALIZADO'
  ) then
    raise exception 'Etapa de producao invalida.';
  end if;

  if v_data > current_date then
    raise exception 'A data da etapa nao pode estar no futuro.';
  end if;

  select *
  into v_producao
  from public.producoes
  where id = p_producao_id
  for update;

  if not found then
    raise exception 'Producao nao encontrada.';
  end if;

  if v_producao.data_producao is not null
     and v_data < v_producao.data_producao then
    raise exception 'A etapa nao pode comecar antes da data de producao.';
  end if;

  update public.producoes
  set status = v_status
  where id = p_producao_id;

  insert into public.producao_etapas (
    producao_id,
    status,
    data_etapa,
    criado_por,
    atualizado_por
  )
  values (
    p_producao_id,
    v_status,
    v_data,
    (select auth.uid()),
    (select auth.uid())
  )
  on conflict (producao_id, status)
  do update set
    data_etapa = excluded.data_etapa,
    atualizado_em = now(),
    atualizado_por = (select auth.uid());

  return jsonb_build_object(
    'producao_id', p_producao_id,
    'status_anterior', v_producao.status,
    'status_novo', v_status,
    'data_etapa', v_data
  );
end;
$$;

revoke all on function public.erp_alterar_etapa_producao(
  uuid,text,date
) from public, anon;

grant execute on function public.erp_alterar_etapa_producao(
  uuid,text,date
) to authenticated;

create or replace function public.erp_editar_data_etapa_producao(
  p_etapa_id uuid,
  p_data_etapa date,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etapa public.producao_etapas%rowtype;
  v_producao public.producoes%rowtype;
  v_data_anterior date;
  v_motivo text := trim(coalesce(
    p_motivo,
    'Correcao informada na ficha do lote'
  ));
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.app_tem_permissao('producao','editar') then
    raise exception 'Usuario sem permissao para corrigir a etapa.';
  end if;

  if p_data_etapa is null then
    raise exception 'Informe a data da etapa.';
  end if;

  if p_data_etapa > current_date then
    raise exception 'A data da etapa nao pode estar no futuro.';
  end if;

  select *
  into v_etapa
  from public.producao_etapas
  where id = p_etapa_id
  for update;

  if not found then
    raise exception 'Etapa nao encontrada.';
  end if;

  select *
  into v_producao
  from public.producoes
  where id = v_etapa.producao_id;

  if v_producao.data_producao is not null
     and p_data_etapa < v_producao.data_producao then
    raise exception 'A etapa nao pode comecar antes da data de producao.';
  end if;

  v_data_anterior := v_etapa.data_etapa;

  update public.producao_etapas
  set data_etapa = p_data_etapa,
      atualizado_em = now(),
      atualizado_por = (select auth.uid())
  where id = p_etapa_id;

  insert into public.movimentacoes (
    tipo,
    categoria,
    item_nome,
    quantidade,
    unidade,
    lote,
    observacao
  )
  values (
    'CORRECAO DATA ETAPA',
    'PRODUCAO',
    v_producao.cerveja_nome,
    0,
    '',
    v_producao.lote,
    'Data de ' || v_etapa.status
      || ' alterada de ' || to_char(v_data_anterior,'DD/MM/YYYY')
      || ' para ' || to_char(p_data_etapa,'DD/MM/YYYY')
      || case
          when v_motivo <> '' then ' - Motivo: ' || v_motivo
          else ''
        end
  );

  return jsonb_build_object(
    'etapa_id', p_etapa_id,
    'producao_id', v_etapa.producao_id,
    'status', v_etapa.status,
    'data_anterior', v_data_anterior,
    'data_nova', p_data_etapa
  );
end;
$$;

revoke all on function public.erp_editar_data_etapa_producao(
  uuid,date,text
) from public, anon;

grant execute on function public.erp_editar_data_etapa_producao(
  uuid,date,text
) to authenticated;

notify pgrst, 'reload schema';

commit;

select
  to_regclass('public.producao_etapas') is not null
    as tabela_historico_criada,
  to_regprocedure(
    'public.erp_alterar_etapa_producao(uuid,text,date)'
  ) is not null as funcao_alterar_etapa_criada,
  to_regprocedure(
    'public.erp_editar_data_etapa_producao(uuid,date,text)'
  ) is not null as funcao_editar_data_criada;
