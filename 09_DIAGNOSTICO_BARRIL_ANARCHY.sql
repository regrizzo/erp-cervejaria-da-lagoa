-- Consulta somente de leitura.
-- Não altera nenhum dado do ERP.

select
  id,
  cerveja_nome,
  origem,
  capacidade_litros,
  litros_atuais,
  status,
  codigo,
  lote,
  observacao,
  criado_em,
  atualizado_em
from public.barris_incompletos
where upper(trim(cerveja_nome)) like '%ANARCHY%'
order by criado_em;
