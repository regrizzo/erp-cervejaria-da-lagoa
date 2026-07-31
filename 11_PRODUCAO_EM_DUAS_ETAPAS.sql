-- ============================================================
-- ERP CERVEJARIA DA LAGOA
-- PRODUCAO EM DUAS ETAPAS
--
-- Etapa 1: cadastra o lote e baixa os insumos.
-- Etapa 2: informa o volume realmente produzido, sem nova baixa.
--
-- Execute UMA VEZ no SQL Editor do Supabase antes de publicar
-- os arquivos atualizados do site.
-- ============================================================

begin;

alter table public.producoes
  drop constraint if exists producoes_litros_positivos;

alter table public.producoes
  drop constraint if exists producoes_litros_nao_negativos,
  add constraint producoes_litros_nao_negativos
    check (coalesce(litros_produzidos,0) >= 0) not valid;

alter table public.producoes
  drop constraint if exists producoes_volume_status_coerente,
  add constraint producoes_volume_status_coerente
    check (
      coalesce(litros_produzidos,0) > 0
      or status = 'INSUMOS_REGISTRADOS'
    ) not valid;

alter table public.producoes
  add column if not exists volume_informado_em timestamptz;

-- Mesmo uma chamada direta ao banco nao pode levar um lote sem volume para
-- dry hopping ou envase. Se a operacao falhar, a transacao inteira e revertida.
create or replace function public.erp_exigir_volume_producao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_litros numeric;
  v_status text;
begin
  if new.producao_id is null then
    return new;
  end if;

  select litros_produzidos, status
  into v_litros, v_status
  from public.producoes
  where id = new.producao_id;

  if found
     and (
       coalesce(v_litros,0) <= 0
       or coalesce(v_status,'') = 'INSUMOS_REGISTRADOS'
     ) then
    raise exception 'Informe os litros produzidos antes desta etapa.';
  end if;

  return new;
end;
$$;

revoke all on function public.erp_exigir_volume_producao()
from public, anon;

drop trigger if exists dry_hopping_exigir_volume
on public.dry_hopping;

create trigger dry_hopping_exigir_volume
before insert or update of producao_id
on public.dry_hopping
for each row
execute function public.erp_exigir_volume_producao();

drop trigger if exists envases_exigir_volume
on public.envases;

create trigger envases_exigir_volume
before insert or update of producao_id
on public.envases
for each row
execute function public.erp_exigir_volume_producao();

-- A funcao atomica do SQL 10 continua sendo a unica responsavel por
-- criar o lote e baixar os insumos. Para uma producao ainda sem volume,
-- ela recebe um valor tecnico dentro da mesma transacao; em seguida este
-- wrapper grava zero e o estado de volume pendente antes do commit.
create or replace function public.erp_iniciar_producao(
  p_lote text,
  p_cerveja_nome text,
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
  v_litros numeric := round(coalesce(p_litros_produzidos,0),3);
  v_volume_pendente boolean;
  v_resultado jsonb;
  v_producao_id uuid;
  v_movimentos_atualizados integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.app_tem_permissao('producao','editar') then
    raise exception 'Usuario sem permissao para registrar producao.';
  end if;

  if v_litros < 0 then
    raise exception 'O volume produzido nao pode ser negativo.';
  end if;

  v_volume_pendente := v_litros = 0;

  select public.erp_registrar_producao(
    p_lote,
    p_cerveja_nome,
    case when v_volume_pendente then 0.001 else v_litros end,
    p_observacao,
    p_fermento_tipo,
    p_fermento_nome,
    p_fermento_reuso_id,
    p_fermento_reuso_quantidade,
    p_insumos
  )
  into v_resultado;

  v_producao_id := (v_resultado->>'producao_id')::uuid;

  if v_volume_pendente then
    update public.producoes
    set
      litros_produzidos = 0,
      status = 'INSUMOS_REGISTRADOS',
      volume_informado_em = null
    where id = v_producao_id;

    update public.movimentacoes
    set
      tipo = 'PRODUCAO INICIADA',
      quantidade = 0,
      observacao = concat_ws(
        ' - ',
        'Insumos registrados; volume produzido pendente',
        nullif(trim(coalesce(p_observacao,'')),'')
      )
    where id = (
      select id
      from public.movimentacoes
      where tipo = 'PRODUCAO'
        and categoria = 'CERVEJA'
        and lote = trim(coalesce(p_lote,''))
        and item_nome = trim(coalesce(p_cerveja_nome,''))
      order by criado_em desc
      limit 1
    );

    get diagnostics v_movimentos_atualizados = row_count;
    if v_movimentos_atualizados <> 1 then
      raise exception 'Nao foi possivel registrar a producao com volume pendente.';
    end if;
  end if;

  return v_resultado || jsonb_build_object(
    'litros_produzidos', case when v_volume_pendente then 0 else v_litros end,
    'status', case when v_volume_pendente then 'INSUMOS_REGISTRADOS' else 'FERMENTANDO' end,
    'volume_pendente', v_volume_pendente
  );
end;
$$;

revoke all on function public.erp_iniciar_producao(
  text,text,numeric,text,text,text,uuid,numeric,jsonb
) from public, anon;

grant execute on function public.erp_iniciar_producao(
  text,text,numeric,text,text,text,uuid,numeric,jsonb
) to authenticated;

create or replace function public.erp_informar_volume_producao(
  p_producao_id uuid,
  p_litros_produzidos numeric,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_litros numeric := round(coalesce(p_litros_produzidos,0),3);
  v_producao public.producoes%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.app_tem_permissao('producao','editar') then
    raise exception 'Usuario sem permissao para informar o volume da producao.';
  end if;

  if p_producao_id is null or v_litros <= 0 then
    raise exception 'Selecione a producao e informe um volume maior que zero.';
  end if;

  select *
  into v_producao
  from public.producoes
  where id = p_producao_id
  for update;

  if not found then
    raise exception 'Producao nao encontrada.';
  end if;

  if coalesce(v_producao.litros_produzidos,0) > 0
     or coalesce(v_producao.status,'') <> 'INSUMOS_REGISTRADOS' then
    raise exception 'O volume desta producao ja foi informado.';
  end if;

  if exists (
    select 1
    from public.envases
    where producao_id = p_producao_id
  ) then
    raise exception 'Esta producao ja possui envase e nao pode receber o volume por esta etapa.';
  end if;

  update public.producoes
  set
    litros_produzidos = v_litros,
    status = 'FERMENTANDO',
    volume_informado_em = now()
  where id = p_producao_id;

  insert into public.movimentacoes (
    tipo, categoria, item_nome, quantidade,
    unidade, lote, observacao
  )
  values (
    'PRODUCAO', 'CERVEJA', v_producao.cerveja_nome,
    v_litros, 'L', v_producao.lote,
    concat_ws(
      ' - ',
      'Volume produzido informado apos o cadastro dos insumos',
      nullif(trim(coalesce(p_observacao,'')),'')
    )
  );

  return jsonb_build_object(
    'producao_id', p_producao_id,
    'lote', v_producao.lote,
    'cerveja_nome', v_producao.cerveja_nome,
    'litros_produzidos', v_litros,
    'status', 'FERMENTANDO',
    'insumos_baixados_novamente', false
  );
end;
$$;

revoke all on function public.erp_informar_volume_producao(
  uuid,numeric,text
) from public, anon;

grant execute on function public.erp_informar_volume_producao(
  uuid,numeric,text
) to authenticated;

notify pgrst, 'reload schema';

commit;
