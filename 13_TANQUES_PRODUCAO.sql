-- ============================================================
-- ERP CERVEJARIA DA LAGOA
-- TANQUE DA PRODUCAO
--
-- Registra em qual tanque cada lote esta sendo produzido e permite
-- corrigir essa informacao sem alterar os insumos ou o volume do lote.
-- Execute UMA VEZ no SQL Editor do Supabase antes de publicar o site.
-- ============================================================

begin;

alter table public.producoes
  add column if not exists tanque smallint;

alter table public.producoes
  drop constraint if exists producoes_tanque_tamanho,
  add constraint producoes_tanque_tamanho
    check (
      tanque is null
      or tanque between 1 and 5
    ) not valid;

comment on column public.producoes.tanque is
  'Tanque de 1 a 5 usado pela producao.';

create unique index if not exists producoes_tanque_ativo_unico
on public.producoes (tanque)
where tanque is not null
  and status in (
    'INSUMOS_REGISTRADOS','FERMENTANDO','DRY_HOPPING',
    'PRONTO_ENVASE','PARCIALMENTE_ENVASADO'
  );

-- Mantem a funcao do SQL 11 intacta e acrescenta o tanque na mesma transacao.
create or replace function public.erp_iniciar_producao_com_tanque(
  p_lote text,
  p_cerveja_nome text,
  p_tanque smallint default null,
  p_litros_produzidos numeric default 0,
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
  v_tanque smallint := p_tanque;
  v_resultado jsonb;
  v_producao_id uuid;
begin
  if v_tanque is null or v_tanque not between 1 and 5 then
    raise exception 'Selecione um tanque de 1 a 5.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('TANQUE|' || v_tanque::text, 0)
  );

  select public.erp_iniciar_producao(
    p_lote,
    p_cerveja_nome,
    p_litros_produzidos,
    p_observacao,
    p_fermento_tipo,
    p_fermento_nome,
    p_fermento_reuso_id,
    p_fermento_reuso_quantidade,
    p_insumos
  )
  into v_resultado;

  v_producao_id := (v_resultado->>'producao_id')::uuid;

  if exists (
    select 1
    from public.producoes
    where id <> v_producao_id
      and tanque = v_tanque
      and status in (
        'INSUMOS_REGISTRADOS','FERMENTANDO','DRY_HOPPING',
        'PRONTO_ENVASE','PARCIALMENTE_ENVASADO'
      )
  ) then
    raise exception 'O tanque % ja esta ocupado por outra producao em andamento.',
      v_tanque;
  end if;

  update public.producoes
  set tanque = v_tanque
  where id = v_producao_id;

  if not found then
    raise exception 'Nao foi possivel vincular o tanque a producao.';
  end if;

  return v_resultado || jsonb_build_object('tanque', v_tanque);
end;
$$;

revoke all on function public.erp_iniciar_producao_com_tanque(
  text,text,smallint,numeric,text,text,text,uuid,numeric,jsonb
) from public, anon;

grant execute on function public.erp_iniciar_producao_com_tanque(
  text,text,smallint,numeric,text,text,text,uuid,numeric,jsonb
) to authenticated;

create or replace function public.erp_editar_tanque_producao(
  p_producao_id uuid,
  p_tanque smallint,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_producao public.producoes%rowtype;
  v_tanque smallint := p_tanque;
  v_motivo text := trim(coalesce(p_motivo,''));
  v_tanque_anterior smallint;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.app_tem_permissao('producao','editar') then
    raise exception 'Usuario sem permissao para corrigir a producao.';
  end if;

  if p_producao_id is null then
    raise exception 'Selecione a producao.';
  end if;

  if v_tanque is null or v_tanque not between 1 and 5 then
    raise exception 'Selecione um tanque de 1 a 5.';
  end if;

  if v_motivo = '' then
    raise exception 'Informe o motivo da correcao.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('TANQUE|' || v_tanque::text, 0)
  );

  select *
  into v_producao
  from public.producoes
  where id = p_producao_id
  for update;

  if not found then
    raise exception 'Producao nao encontrada.';
  end if;

  v_tanque_anterior := v_producao.tanque;

  if v_tanque_anterior is not distinct from v_tanque then
    raise exception 'O tanque informado ja e o tanque atual desta producao.';
  end if;

  if v_producao.status in (
      'INSUMOS_REGISTRADOS','FERMENTANDO','DRY_HOPPING',
      'PRONTO_ENVASE','PARCIALMENTE_ENVASADO'
    ) and exists (
      select 1
      from public.producoes
      where id <> p_producao_id
        and tanque = v_tanque
        and status in (
          'INSUMOS_REGISTRADOS','FERMENTANDO','DRY_HOPPING',
          'PRONTO_ENVASE','PARCIALMENTE_ENVASADO'
        )
    ) then
    raise exception 'O tanque % ja esta ocupado por outra producao em andamento.',
      v_tanque;
  end if;

  update public.producoes
  set tanque = v_tanque
  where id = p_producao_id;

  insert into public.movimentacoes (
    tipo, categoria, item_nome, quantidade,
    unidade, lote, observacao
  )
  values (
    'CORRECAO TANQUE PRODUCAO', 'PRODUCAO', v_producao.cerveja_nome,
    0, '', v_producao.lote,
    'Tanque alterado de ' || coalesce(v_tanque_anterior::text,'nao informado')
    || ' para ' || v_tanque::text
    || ' - Motivo: ' || v_motivo
  );

  return jsonb_build_object(
    'producao_id', p_producao_id,
    'tanque_anterior', v_tanque_anterior,
    'tanque_novo', v_tanque
  );
end;
$$;

revoke all on function public.erp_editar_tanque_producao(uuid,smallint,text)
from public, anon;

grant execute on function public.erp_editar_tanque_producao(uuid,smallint,text)
to authenticated;

notify pgrst, 'reload schema';

commit;
