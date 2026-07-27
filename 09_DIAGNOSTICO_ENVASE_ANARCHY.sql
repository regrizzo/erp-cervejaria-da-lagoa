-- Consulta somente de leitura.
-- Procura o envase que originou o barril incompleto de 28 L.

select
  id,
  producao_id,
  lote,
  cerveja_nome,
  origem,
  q30,
  litros_barris,
  litros_incompleto_bar,
  litros_incompleto,
  barril_incompleto_tamanho,
  barril_incompleto_codigo,
  litros_total,
  data_envase,
  observacao,
  criado_em
from public.envases
where upper(trim(cerveja_nome)) like '%ANARCHY%'
  and (
    round(coalesce(litros_incompleto,0),3) > 0
    or round(coalesce(litros_incompleto_bar,0),3) > 0
    or round(coalesce(litros_total,0),3) = 28
  )
order by criado_em;
