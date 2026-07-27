# ERP Cervejaria da Lagoa

Aplicação web para controle de produção, estoque, lotes, envases, clientes,
saídas, retornos de barris, fermentos e operações da Phenomena.

O sistema é uma aplicação estática publicada no GitHub Pages. A autenticação,
os dados e as permissões são fornecidos pelo Supabase.

## Versão oficial

Os arquivos oficiais da aplicação ficam na raiz deste diretório:

- `index.html`: estrutura das telas;
- `styles.css`: aparência e adaptação para celular;
- `app.js`: inicialização, estado e núcleo do ERP;
- `js/operacoes.js`: produção, lotes, estoque, saídas e busca;
- `js/administracao.js`: correções, auditoria, backup e restauração;
- `js/acesso.js`: usuários, permissões, cadastro e login;
- `manifest.json`: instalação como aplicativo;
- imagens e ícones usados pelo site.

A pasta `Nova pasta` é uma cópia histórica e não deve ser publicada nem usada
como origem para novas alterações.

## Funcionalidades

- login por e-mail e Google;
- aprovação de usuários, perfis e permissões;
- dashboard operacional;
- produção, lotes, dry hopping e envase;
- estoque de cervejas, insumos e barris incompletos;
- clientes, saídas, retornos e códigos de barris;
- fermento reutilizável;
- controle financeiro e de estoque da Phenomena, incluindo retirada de barril
  incompleto pelo volume real;
- relatórios, auditoria, correções, backup e restauração.
- leitura paginada dos históricos e backup com conferência exata da quantidade
  de registros;
- gravação atômica das principais operações, evitando estoque alterado sem o
  histórico correspondente.

## Publicação do site

Publique somente estes arquivos no GitHub Pages:

```text
index.html
styles.css
app.js
js/operacoes.js
js/administracao.js
js/acesso.js
manifest.json
logo-cervejaria-da-lagoa.png
icon-192.png
icon-512.png
apple-touch-icon.png
social-preview-cervejaria-da-lagoa-v1.jpg
```

Não publique os arquivos de migração, backups, planilhas ou a pasta
`Nova pasta`. Eles podem conter dados operacionais reais.

## Banco de dados

Antes de executar qualquer SQL, gere um backup pelo próprio ERP.

Para uma instalação nova:

1. Execute `01_BANCO_COMPLETO.sql` no editor SQL do Supabase.
2. Execute `06_BARRIL_INCOMPLETO_DISPONIVEL.sql`.
3. Execute `07_PAGAMENTO_PHENOMENA_FIFO.sql`.
4. Execute `08_RETIRADA_PHENOMENA_VOLUME_REAL.sql`.
5. Execute `10_INTEGRIDADE_E_OPERACOES_ATOMICAS.sql`.
6. Configure os provedores de autenticação desejados no Supabase.
7. Cadastre o primeiro usuário. O SQL de controle de acesso transforma os
   usuários já existentes no momento da instalação em administradores ativos.

Os demais SQLs são históricos ou incrementais. Não execute todos novamente
em um banco já configurado.

No banco da Cervejaria da Lagoa que já recebeu o SQL 08, execute
`09_CORRIGIR_VINCULO_ANARCHY_BRAZZA.sql` para vincular o barril incompleto de
28 L ao primeiro lançamento da ANARCHY, destinado ao Brazza. A correção
estrutura o envase antigo como 18 barris completos + 1 incompleto de 28 L,
mantendo inalterado o estoque atual de 15 barris completos.

Em um banco já atualizado, gere um backup e execute
`10_INTEGRIDADE_E_OPERACOES_ATOMICAS.sql` antes de publicar esta versão do
site. O SQL adiciona validações de estoque e faz com que entrada de cerveja,
saída múltipla, produção, envase e dry hopping sejam gravados por inteiro ou
cancelados por inteiro.

### Migração dos dados antigos

`01_ZERAR_ERP_ANTES_DA_MIGRACAO.sql` apaga os dados operacionais. Ele só pode
ser usado, após backup, imediatamente antes de
`02_MIGRAR_GOOGLE_SHEETS_PARA_ERP.sql`.

Esses arquivos e `MIGRACAO_GOOGLE_SHEETS_PARA_ERP.json` contêm dados reais e
devem permanecer privados.

Consulte [ORDEM_SQL.md](ORDEM_SQL.md) antes de alterar o banco.

## Manutenção

O código não precisa de compilação: o navegador carrega os arquivos diretamente.

Para executar a verificação local, use Node.js:

```text
node tools/validate-project.mjs
```

Ela verifica:

- sintaxe do JavaScript;
- nomes de funções duplicados;
- ações do HTML sem função correspondente;
- presença dos arquivos essenciais.

O script `tools/cleanup-shadowed-functions.mjs` registra o procedimento usado
para consolidar o antigo arquivo único. O script `tools/split-app.mjs` registra
a separação feita depois da consolidação. Eles são ferramentas de migração e
não fazem parte da execução normal do ERP.

## Segurança

A chave `anon` do Supabase pode existir no navegador, mas a proteção real
depende das políticas de Row Level Security. Nunca coloque uma chave
`service_role`, senha ou token administrativo no projeto.

O acesso visual da interface não substitui as políticas do banco. Mudanças em
perfis e permissões devem sempre preservar as políticas presentes em
`01_BANCO_COMPLETO.sql`, `06_BARRIL_INCOMPLETO_DISPONIVEL.sql` e
`07_PAGAMENTO_PHENOMENA_FIFO.sql` e
`08_RETIRADA_PHENOMENA_VOLUME_REAL.sql` e
`10_INTEGRIDADE_E_OPERACOES_ATOMICAS.sql`.
