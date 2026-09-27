-- ==========================================================
-- ERP CERVEJARIA DA LAGOA
-- ORIGEM NAS SAIDAS E ENTRADAS MULTIPLAS
--
-- 1. A saida comum baixa somente PRODUCAO ou ITAPEMA.
-- 2. Cada item pode informar exatamente a origem escolhida.
-- 3. Varias cervejas de Itapema entram em uma unica operacao.
-- 4. Varias compras de insumos entram em uma unica operacao.
-- 5. Qualquer erro cancela o lote inteiro.
-- ==========================================================

begin;

create or replace function public.erp_registrar_entrada_cerveja_multipla(
  p_origem text,
  p_itens jsonb,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origem text := upper(trim(coalesce(p_origem,'')));
  v_item jsonb;
  v_resultado jsonb;
  v_resultados jsonb := '[]'::jsonb;
  v_quantidade integer := 0;
  v_litros numeric := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.app_tem_permissao('estoque','editar') then
    raise exception 'Usuario sem permissao para registrar entrada de cerveja.';
  end if;

  if v_origem <> 'ITAPEMA' then
    raise exception 'A entrada multipla de cerveja e exclusiva de Itapema.';
  end if;

  if p_itens is null
     or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) = 0 then
    raise exception 'Adicione ao menos uma cerveja.';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_itens)
  loop
    v_resultado := public.erp_registrar_entrada_cerveja(
      trim(coalesce(v_item->>'cerveja_nome','')),
      v_origem,
      coalesce((v_item->>'q10')::integer,0),
      coalesce((v_item->>'q20')::integer,0),
      coalesce((v_item->>'q30')::integer,0),
      coalesce((v_item->>'q50')::integer,0),
      nullif(trim(coalesce(p_observacao,'')),'')
    );
    v_resultados := v_resultados || jsonb_build_array(v_resultado);
    v_quantidade := v_quantidade + 1;
    v_litros := v_litros + coalesce((v_resultado->>'litros')::numeric,0);
  end loop;

  return jsonb_build_object(
    'origem', v_origem,
    'quantidade_itens', v_quantidade,
    'litros', v_litros,
    'itens', v_resultados
  );
end;
$$;

revoke all on function public.erp_registrar_entrada_cerveja_multipla(
  text,jsonb,text
) from public, anon;

grant execute on function public.erp_registrar_entrada_cerveja_multipla(
  text,jsonb,text
) to authenticated;


create or replace function public.erp_registrar_entrada_insumos_multipla(
  p_itens jsonb,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_tipo text;
  v_nome text;
  v_quantidade numeric;
  v_valor_total numeric;
  v_fornecedor text;
  v_validade date;
  v_lote_fornecedor text;
  v_insumo_id uuid;
  v_unidade text;
  v_quantidade_itens integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.app_tem_permissao('estoque','editar') then
    raise exception 'Usuario sem permissao para registrar entrada de insumos.';
  end if;

  if p_itens is null
     or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) = 0 then
    raise exception 'Adicione ao menos um insumo.';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_itens)
  loop
    v_tipo := upper(trim(coalesce(v_item->>'tipo','')));
    v_nome := trim(coalesce(v_item->>'nome',''));
    v_quantidade := round(coalesce((v_item->>'quantidade')::numeric,0),3);
    v_valor_total := round(coalesce((v_item->>'valor_total')::numeric,0),2);
    v_fornecedor := nullif(trim(coalesce(v_item->>'fornecedor','')),'');
    v_validade := nullif(trim(coalesce(v_item->>'validade','')),'')::date;
    v_lote_fornecedor := nullif(trim(coalesce(v_item->>'lote_fornecedor','')),'');

    if v_tipo not in ('MALTE','LUPULO','FERMENTO') then
      raise exception 'Tipo de insumo invalido.';
    end if;
    if v_nome = '' or v_quantidade <= 0 then
      raise exception 'Confira o insumo e a quantidade de cada item.';
    end if;
    if v_valor_total < 0 then
      raise exception 'O valor total nao pode ser negativo.';
    end if;

    select id, unidade
    into v_insumo_id, v_unidade
    from public.insumos
    where tipo = v_tipo
      and nome = v_nome
      and coalesce(ativo,true)
    limit 1;

    if v_insumo_id is null then
      raise exception 'Insumo % / % nao encontrado ou inativo.', v_tipo, v_nome;
    end if;

    insert into public.estoque_insumos (
      insumo_id, tipo, nome, unidade, quantidade, atualizado_em
    )
    values (
      v_insumo_id, v_tipo, v_nome, v_unidade, v_quantidade, now()
    )
    on conflict (tipo, nome)
    do update set
      insumo_id = excluded.insumo_id,
      unidade = excluded.unidade,
      quantidade = coalesce(public.estoque_insumos.quantidade,0) + excluded.quantidade,
      atualizado_em = now();

    insert into public.entradas_insumos (
      insumo_id, tipo, nome, unidade, quantidade,
      fornecedor, valor_total, validade, lote_fornecedor, observacao
    )
    values (
      v_insumo_id, v_tipo, v_nome, v_unidade, v_quantidade,
      v_fornecedor, v_valor_total, v_validade, v_lote_fornecedor,
      nullif(trim(coalesce(p_observacao,'')),'')
    );

    insert into public.movimentacoes (
      tipo, categoria, item_nome, quantidade,
      unidade, origem, observacao
    )
    values (
      'ENTRADA INSUMO', 'INSUMO', v_nome, v_quantidade,
      v_unidade, 'COMPRA', nullif(trim(coalesce(p_observacao,'')),'')
    );

    v_quantidade_itens := v_quantidade_itens + 1;
  end loop;

  return jsonb_build_object('quantidade_itens', v_quantidade_itens);
end;
$$;

revoke all on function public.erp_registrar_entrada_insumos_multipla(
  jsonb,text
) from public, anon;

grant execute on function public.erp_registrar_entrada_insumos_multipla(
  jsonb,text
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
  v_origem_solicitada text;
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
  v_baixas jsonb;
  v_origem_baixada text;
  v_quantidade_itens integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not public.app_tem_permissao('saidas','editar') then
    raise exception 'Usuario sem permissao para registrar saidas.';
  end if;

  select nome
  into v_cliente_nome
  from public.clientes
  where id = p_cliente_id
    and coalesce(ativo,true)
  limit 1;

  if v_cliente_nome is null then
    raise exception 'Cliente nao encontrado ou inativo.';
  end if;

  if p_itens is null
     or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) = 0 then
    raise exception 'Adicione ao menos um item a saida.';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_itens)
    order by value->>'cerveja_nome', value->>'origem'
  loop
    v_cerveja_nome := trim(coalesce(v_item->>'cerveja_nome',''));
    v_origem_solicitada := upper(trim(coalesce(v_item->>'origem','')));
    v_q10 := coalesce((v_item->>'q10')::integer,0);
    v_q20 := coalesce((v_item->>'q20')::integer,0);
    v_q30 := coalesce((v_item->>'q30')::integer,0);
    v_q50 := coalesce((v_item->>'q50')::integer,0);

    if v_cerveja_nome = '' then
      raise exception 'Ha item sem cerveja selecionada.';
    end if;
    if v_origem_solicitada <> ''
       and v_origem_solicitada not in ('PRODUCAO','ITAPEMA') then
      raise exception 'Origem invalida para a saida comum de %.', v_cerveja_nome;
    end if;
    if least(v_q10,v_q20,v_q30,v_q50) < 0 then
      raise exception 'As quantidades de barris nao podem ser negativas.';
    end if;

    v_litros_item := v_q10 * 10 + v_q20 * 20 + v_q30 * 30 + v_q50 * 50;
    if v_litros_item <= 0 then
      raise exception 'A saida de % nao possui barris.', v_cerveja_nome;
    end if;

    select id
    into v_cerveja_id
    from public.cervejas
    where nome = v_cerveja_nome
      and coalesce(ativo,true)
    limit 1;

    if v_cerveja_id is null then
      raise exception 'Cerveja % nao encontrada ou inativa.', v_cerveja_nome;
    end if;

    v_rest_q10 := v_q10;
    v_rest_q20 := v_q20;
    v_rest_q30 := v_q30;
    v_rest_q50 := v_q50;
    v_litros_producao := 0;
    v_litros_itapema := 0;
    v_baixas := '[]'::jsonb;

    for v_estoque in
      select *
      from public.estoque_cerveja
      where cerveja_nome = v_cerveja_nome
        and origem in ('PRODUCAO','ITAPEMA')
        and (v_origem_solicitada = '' or origem = v_origem_solicitada)
      order by case origem
        when 'PRODUCAO' then 1
        when 'ITAPEMA' then 2
        else 3
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
      v_litros_origem := v_usar_q10 * 10 + v_usar_q20 * 20
        + v_usar_q30 * 30 + v_usar_q50 * 50;

      if v_litros_origem > 0 then
        update public.estoque_cerveja
        set
          q10 = coalesce(v_estoque.q10,0) - v_usar_q10,
          q20 = coalesce(v_estoque.q20,0) - v_usar_q20,
          q30 = coalesce(v_estoque.q30,0) - v_usar_q30,
          q50 = coalesce(v_estoque.q50,0) - v_usar_q50,
          litros = (coalesce(v_estoque.q10,0) - v_usar_q10) * 10
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

        if v_estoque.origem = 'PRODUCAO' then
          v_litros_producao := v_litros_producao + v_litros_origem;
        elsif v_estoque.origem = 'ITAPEMA' then
          v_litros_itapema := v_litros_itapema + v_litros_origem;
        end if;
      end if;
    end loop;

    if v_rest_q10 > 0 or v_rest_q20 > 0
       or v_rest_q30 > 0 or v_rest_q50 > 0 then
      raise exception
        'Estoque insuficiente para % em %. Faltam: 10L=%, 20L=%, 30L=%, 50L=%.',
        v_cerveja_nome,
        case when v_origem_solicitada = '' then 'PRODUCAO/ITAPEMA' else v_origem_solicitada end,
        v_rest_q10, v_rest_q20, v_rest_q30, v_rest_q50;
    end if;

    v_origem_baixada := concat_ws(
      ' | ',
      case when v_litros_producao > 0
        then 'PRODUCAO: ' || trim(to_char(v_litros_producao,'FM999999990D999')) || 'L'
      end,
      case when v_litros_itapema > 0
        then 'ITAPEMA: ' || trim(to_char(v_litros_itapema,'FM999999990D999')) || 'L'
      end
    );

    insert into public.saidas (
      grupo_saida, cliente_id, cliente_nome,
      cerveja_id, cerveja_nome, q10, q20, q30, q50, litros,
      codigos_barris, origem_baixada, detalhes_baixa,
      responsavel, observacao
    )
    values (
      v_grupo_saida, p_cliente_id, v_cliente_nome,
      v_cerveja_id, v_cerveja_nome, v_q10, v_q20, v_q30, v_q50, v_litros_item,
      nullif(trim(coalesce(v_item->>'codigos_barris','')),''),
      v_origem_baixada, v_baixas,
      nullif(trim(coalesce(p_responsavel,'')),''),
      nullif(trim(coalesce(p_observacao,'')),'')
    );

    insert into public.movimentacoes (
      tipo, categoria, item_nome, quantidade, unidade,
      destino, cliente_nome, observacao, responsavel
    )
    values (
      'SAIDA ESTOQUE', 'CERVEJA', v_cerveja_nome, -abs(v_litros_item), 'L',
      v_cliente_nome, v_cliente_nome,
      concat_ws(
        ' - ',
        nullif(v_origem_baixada,''),
        case when nullif(trim(coalesce(v_item->>'codigos_barris','')),'') is not null
          then 'Codigos: ' || trim(v_item->>'codigos_barris')
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

commit;

-- Conferencia sem alterar dados:
select
  to_regprocedure('public.erp_registrar_entrada_cerveja_multipla(text,jsonb,text)') is not null
    as entrada_cerveja_multipla_ok,
  to_regprocedure('public.erp_registrar_entrada_insumos_multipla(jsonb,text)') is not null
    as entrada_insumos_multipla_ok,
  to_regprocedure('public.erp_registrar_saida_multipla(uuid,jsonb,text,text)') is not null
    as saida_por_origem_ok;
