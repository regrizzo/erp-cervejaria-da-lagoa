# Ordem dos arquivos SQL

Este documento identifica a finalidade dos SQLs do ERP. Sempre gere um backup
antes de alterar o banco.

## Instalação nova

Execute apenas:

1. `01_BANCO_COMPLETO.sql`
2. `06_BARRIL_INCOMPLETO_DISPONIVEL.sql`
3. `07_PAGAMENTO_PHENOMENA_FIFO.sql`
4. `08_RETIRADA_PHENOMENA_VOLUME_REAL.sql`
5. `10_INTEGRIDADE_E_OPERACOES_ATOMICAS.sql`

O primeiro arquivo consolida a estrutura original, envase detalhado, retornos,
Phenomena, correções, restauração e controle de acesso. O segundo cria o
controle de barris incompletos disponíveis. O terceiro registra pagamentos da
Phenomena por valor e os distribui do débito mais antigo para o mais novo. O
quarto permite retirar barris incompletos da Phenomena pelo volume real. O
quinto protege valores de estoque, reforça a auditoria e torna atômicas as
operações de entrada, saída, produção, envase e dry hopping.

## Banco existente

Não repita toda a sequência automaticamente. Confira quais atualizações já
foram aplicadas. Na versão imediatamente anterior ao controle de barril
incompleto, execute somente:

1. faça um backup no ERP;
2. execute `06_BARRIL_INCOMPLETO_DISPONIVEL.sql`;
3. publique os arquivos atuais do site.

Para ativar o pagamento automático da Phenomena em um banco já atualizado:

1. faça um backup no ERP;
2. execute `07_PAGAMENTO_PHENOMENA_FIFO.sql`;
3. publique os arquivos correspondentes do site.

Para ativar a retirada de barril incompleto pelo volume real:

1. faça um backup no ERP;
2. execute `08_RETIRADA_PHENOMENA_VOLUME_REAL.sql`;
3. publique os arquivos correspondentes do site.

O SQL 08 também corrige de forma restrita o lançamento da ANARCHY de
24/07/2026, de 30 L / R$ 90,00 para 28 L / R$ 84,00. A correção só é aplicada
quando o banco contém exatamente um débito e um barril incompleto compatíveis.

### Correção do vínculo Anarchy / Brazza

Se o SQL 08 já foi executado no banco da Cervejaria da Lagoa, execute depois:

1. `09_CORRIGIR_VINCULO_ANARCHY_BRAZZA.sql`.

O SQL 09 realoca o barril incompleto de 28 L para o primeiro lançamento da
ANARCHY, composto por Renan 30 L, Brazza 28 L e Layback 30 L. O primeiro
lançamento passa a 88 L / R$ 264,00 e o lançamento seguinte retorna a
30 L / R$ 90,00. O envase histórico passa de 19 barris completos para
18 completos + 1 incompleto de 28 L, mantendo inalterado o estoque atual de
15 barris completos.

### Integridade e operações atômicas

Depois das atualizações anteriores, aplique a proteção atual:

1. faça e guarde um backup;
2. execute `10_INTEGRIDADE_E_OPERACOES_ATOMICAS.sql`;
3. confirme que o Supabase mostrou sucesso;
4. só então publique os arquivos atuais do site.

O SQL 10 não apaga o histórico existente. As novas validações são aplicadas a
novos registros e a registros alterados. Entrada de cerveja, saída múltipla,
produção, envase e dry hopping passam a ser concluídos como uma única operação:
se alguma etapa falhar, todas as alterações daquela operação são canceladas.

## Arquivos históricos

Estes arquivos estão mantidos como referência e não devem ser executados depois
do banco completo:

- `01_CRIAR_TABELAS.sql`;
- `01_SUPABASE_COMPLETO_APPS_SCRIPT_V19_CONVERTIDO.sql`;
- `02_AJUSTE_LOTES_POR_CERVEJA.sql`;
- `02_SEGURANCA_LOGIN.sql`;
- `03_ENVASE_DETALHADO.sql`;
- `03_PHENOMENA_DEBITOS.sql`;
- `04_CORRECOES_E_RESTAURACAO.sql`;
- `04_RETORNOS_CONFIGURACOES.sql`;
- `05_CONTROLE_ACESSO_USUARIOS.sql`.

Eles representam etapas que já estão consolidadas em
`01_BANCO_COMPLETO.sql`.

## Migração destrutiva

Use esta sequência somente para substituir os dados do ERP pelos dados
convertidos do Google Sheets:

1. gere e guarde um backup;
2. execute `01_ZERAR_ERP_ANTES_DA_MIGRACAO.sql`;
3. execute `02_MIGRAR_GOOGLE_SHEETS_PARA_ERP.sql`;
4. confira estoques, lotes, clientes, saídas e retornos antes de liberar o uso.

O primeiro passo SQL apaga dados operacionais. Não execute essa sequência para
uma atualização normal.
