-- Consulta somente de leitura.
-- Exibe o envase da Anarchy verticalmente para facilitar a conferência.

with envase as (
  select *
  from public.envases
  where upper(trim(cerveja_nome)) = 'ANARCHY'
    and origem = 'PHENOMENA'
    and data_envase = date '2026-07-22'
  order by criado_em
  limit 1
)
select campo, valor
from (
  select 1 ordem, 'envase_id' campo, id::text valor from envase
  union all select 2, 'producao_id', producao_id::text from envase
  union all select 3, 'lote', coalesce(lote,'') from envase
  union all select 4, 'q30', coalesce(q30,0)::text from envase
  union all select 5, 'litros_barris', coalesce(litros_barris,0)::text from envase
  union all select 6, 'litros_incompleto_bar', coalesce(litros_incompleto_bar,0)::text from envase
  union all select 7, 'litros_incompleto', coalesce(litros_incompleto,0)::text from envase
  union all select 8, 'litros_bar_proprio', coalesce(litros_bar_proprio,0)::text from envase
  union all select 9, 'barril_incompleto_tamanho', coalesce(barril_incompleto_tamanho,0)::text from envase
  union all select 10, 'litros_total', coalesce(litros_total,0)::text from envase
  union all select 11, 'perda', coalesce(perda,0)::text from envase
  union all select 12, 'perda_informada', coalesce(perda_informada,0)::text from envase
  union all select 13, 'saldo_apos', coalesce(saldo_apos,0)::text from envase
  union all select 14, 'finalizado', coalesce(finalizado,false)::text from envase
  union all select 15, 'observacao', coalesce(observacao,'') from envase
) dados
order by ordem;
