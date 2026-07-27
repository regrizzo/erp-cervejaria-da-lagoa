# Ordem dos arquivos SQL

Este documento identifica a finalidade dos SQLs do ERP. Sempre gere um backup
antes de alterar o banco.

## Instalação nova

Execute apenas:

1. `01_BANCO_COMPLETO.sql`
2. `06_BARRIL_INCOMPLETO_DISPONIVEL.sql`

O primeiro arquivo consolida a estrutura original, envase detalhado, retornos,
Phenomena, correções, restauração e controle de acesso. O segundo é uma
atualização posterior que cria o controle de barris incompletos disponíveis.

## Banco existente

Não repita toda a sequência automaticamente. Confira quais atualizações já
foram aplicadas. Na versão imediatamente anterior ao controle de barril
incompleto, execute somente:

1. faça um backup no ERP;
2. execute `06_BARRIL_INCOMPLETO_DISPONIVEL.sql`;
3. publique os arquivos atuais do site.

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
