-- ============================================================
-- ERP CERVEJARIA DA LAGOA
-- PAGAMENTO AUTOMÁTICO PHENOMENA (FIFO)
--
-- Execute UMA VEZ no SQL Editor do Supabase antes de publicar
-- os arquivos atualizados do site.
-- ============================================================

begin;

create table if not exists public.phenomena_recebimentos (
  id uuid primary key default gen_random_uuid(),
  valor numeric not null check (valor > 0),
  valor_aplicado numeric not null default 0,
  debitos_quitados integer not null default 0,
  debitos_parciais integer not null default 0,
  quantidade_alocacoes integer not null default 0,
  responsavel text,
  observacao text,
  criado_em timestamp with time zone not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  criado_por_nome text
);

alter table public.phenomena_pagamentos
  add column if not exists recebimento_id uuid
  references public.phenomena_recebimentos(id) on delete set null;

create index if not exists phenomena_pagamentos_recebimento_idx
  on public.phenomena_pagamentos(recebimento_id);

create index if not exists phenomena_debitos_fifo_idx
  on public.phenomena_debitos(criado_em, id)
  where status <> 'PAGO';

drop trigger if exists trg_registrar_autor on public.phenomena_recebimentos;
create trigger trg_registrar_autor
before insert on public.phenomena_recebimentos
for each row execute function public.app_registrar_autor();

alter table public.phenomena_recebimentos enable row level security;

drop policy if exists phenomena_recebimentos_select_acesso
  on public.phenomena_recebimentos;
drop policy if exists phenomena_recebimentos_insert_acesso
  on public.phenomena_recebimentos;
drop policy if exists phenomena_recebimentos_update_admin
  on public.phenomena_recebimentos;
drop policy if exists phenomena_recebimentos_delete_admin
  on public.phenomena_recebimentos;

create policy phenomena_recebimentos_select_acesso
on public.phenomena_recebimentos
for select to authenticated
using (public.app_tem_permissao('phenomena','ver'));

create policy phenomena_recebimentos_insert_acesso
on public.phenomena_recebimentos
for insert to authenticated
with check (public.app_tem_permissao('phenomena','editar'));

create policy phenomena_recebimentos_update_admin
on public.phenomena_recebimentos
for update to authenticated
using (public.app_eh_admin())
with check (public.app_eh_admin());

create policy phenomena_recebimentos_delete_admin
on public.phenomena_recebimentos
for delete to authenticated
using (public.app_eh_admin());

grant select, insert, update, delete
on public.phenomena_recebimentos to authenticated;

create or replace function public.erp_registrar_pagamento_phenomena_fifo(
  p_valor numeric,
  p_responsavel text default null,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valor numeric := round(coalesce(p_valor,0),2);
  v_total_aberto numeric := 0;
  v_restante numeric;
  v_aberto numeric;
  v_aplicar numeric;
  v_novo_pago numeric;
  v_recebimento_id uuid;
  v_debito record;
  v_quitados integer := 0;
  v_parciais integer := 0;
  v_alocacoes integer := 0;
  v_aplicacoes jsonb := '[]'::jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.app_tem_permissao('phenomena','editar') then
    raise exception 'Usuário sem permissão para registrar pagamentos da Phenomena.';
  end if;

  if v_valor <= 0 then
    raise exception 'Informe um valor de pagamento maior que zero.';
  end if;

  -- Bloqueia os débitos durante toda a distribuição para impedir que
  -- pagamentos simultâneos usem o mesmo saldo.
  for v_debito in
    select id, valor_total, valor_pago
    from public.phenomena_debitos
    where coalesce(status,'ABERTO') <> 'PAGO'
      and round(greatest(coalesce(valor_total,0) - coalesce(valor_pago,0),0),2) > 0
    order by criado_em asc nulls first, id asc
    for update
  loop
    v_total_aberto := v_total_aberto
      + round(greatest(coalesce(v_debito.valor_total,0) - coalesce(v_debito.valor_pago,0),0),2);
  end loop;

  v_total_aberto := round(v_total_aberto,2);

  if v_total_aberto <= 0 then
    raise exception 'Não há débitos abertos da Phenomena.';
  end if;

  if v_valor > v_total_aberto then
    raise exception 'O pagamento de R$ % excede o saldo aberto de R$ %.',
      to_char(v_valor,'FM999999990D00'),
      to_char(v_total_aberto,'FM999999990D00');
  end if;

  insert into public.phenomena_recebimentos (
    valor,
    responsavel,
    observacao
  )
  values (
    v_valor,
    nullif(trim(coalesce(p_responsavel,'')),''),
    nullif(trim(coalesce(p_observacao,'')),'')
  )
  returning id into v_recebimento_id;

  v_restante := v_valor;

  for v_debito in
    select *
    from public.phenomena_debitos
    where coalesce(status,'ABERTO') <> 'PAGO'
      and round(greatest(coalesce(valor_total,0) - coalesce(valor_pago,0),0),2) > 0
    order by criado_em asc nulls first, id asc
    for update
  loop
    exit when v_restante <= 0;

    v_aberto := round(
      greatest(coalesce(v_debito.valor_total,0) - coalesce(v_debito.valor_pago,0),0),
      2
    );
    v_aplicar := least(v_restante, v_aberto);
    v_novo_pago := round(coalesce(v_debito.valor_pago,0) + v_aplicar,2);

    insert into public.phenomena_pagamentos (
      recebimento_id,
      debito_id,
      valor,
      responsavel,
      observacao
    )
    values (
      v_recebimento_id,
      v_debito.id,
      v_aplicar,
      nullif(trim(coalesce(p_responsavel,'')),''),
      nullif(trim(coalesce(p_observacao,'')),'')
    );

    update public.phenomena_debitos
    set
      valor_pago = v_novo_pago,
      status = case
        when v_novo_pago >= round(coalesce(valor_total,0),2) then 'PAGO'
        else 'PARCIAL'
      end,
      pago_em = case
        when v_novo_pago >= round(coalesce(valor_total,0),2) then now()
        else null
      end
    where id = v_debito.id;

    if v_aplicar >= v_aberto then
      v_quitados := v_quitados + 1;
    else
      v_parciais := v_parciais + 1;
    end if;

    v_alocacoes := v_alocacoes + 1;
    v_aplicacoes := v_aplicacoes || jsonb_build_array(
      jsonb_build_object(
        'debito_id', v_debito.id,
        'cerveja', v_debito.cerveja_nome,
        'valor_aplicado', v_aplicar,
        'saldo_apos', round(v_aberto - v_aplicar,2)
      )
    );

    v_restante := round(v_restante - v_aplicar,2);
  end loop;

  if v_restante <> 0 then
    raise exception 'Não foi possível distribuir integralmente o pagamento.';
  end if;

  update public.phenomena_recebimentos
  set
    valor_aplicado = v_valor,
    debitos_quitados = v_quitados,
    debitos_parciais = v_parciais,
    quantidade_alocacoes = v_alocacoes
  where id = v_recebimento_id;

  insert into public.movimentacoes (
    tipo,
    categoria,
    item_nome,
    quantidade,
    unidade,
    observacao,
    responsavel
  )
  values (
    'PAGAMENTO PHENOMENA',
    'FINANCEIRO',
    'PAGAMENTO AUTOMÁTICO',
    v_valor,
    'R$',
    concat(
      'Recebimento ', v_recebimento_id,
      ' distribuído do débito mais antigo para o mais novo.',
      case
        when nullif(trim(coalesce(p_observacao,'')),'') is not null
        then ' ' || trim(p_observacao)
        else ''
      end
    ),
    nullif(trim(coalesce(p_responsavel,'')),'')
  );

  return jsonb_build_object(
    'recebimento_id', v_recebimento_id,
    'valor', v_valor,
    'debitos_quitados', v_quitados,
    'debitos_parciais', v_parciais,
    'quantidade_alocacoes', v_alocacoes,
    'saldo_aberto_antes', v_total_aberto,
    'saldo_aberto_depois', round(v_total_aberto - v_valor,2),
    'aplicacoes', v_aplicacoes
  );
end;
$$;

revoke all on function public.erp_registrar_pagamento_phenomena_fifo(numeric,text,text)
from public, anon;

grant execute
on function public.erp_registrar_pagamento_phenomena_fifo(numeric,text,text)
to authenticated;

commit;

notify pgrst, 'reload schema';
