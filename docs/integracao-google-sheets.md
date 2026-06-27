# Integração com Google Sheets

## Por que preciso da planilha, e não só do link do Forms?

O Google Forms **não armazena** as respostas por si só de forma acessível por API — ele precisa
estar vinculado a uma **Google Sheets** (Respostas → ícone verde do Sheets → "Criar planilha de
respostas"). É **essa planilha** que o Portal lê, não o link do formulário.

Se você já tem o link do Forms mas ainda não vinculou uma planilha:
1. Abra o Forms → aba **Respostas**.
2. Clique no ícone do Google Sheets (canto superior direito da aba Respostas).
3. Escolha **"Criar uma nova planilha"** (recomendado) ou selecione uma existente.
4. Copie o **ID da planilha** gerada — é a sequência longa de letras/números na URL, entre
   `/d/` e `/edit`:
   ```
   https://docs.google.com/spreadsheets/d/ESTE_TRECHO_É_O_ID/edit
   ```

---

## Passo a passo: criando a Service Account

A Service Account é uma "conta robô" do Google que o backend usa para ler a planilha sem precisar
de login interativo.

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um projeto novo (ou use um existente) — ex: `portal-auditoria-mega`.
3. No menu, vá em **APIs e Serviços → Biblioteca**, busque **Google Sheets API** e clique em
   **Ativar**.
4. Vá em **APIs e Serviços → Credenciais → Criar Credenciais → Conta de Serviço**.
5. Dê um nome (ex: `portal-auditoria-sheets-reader`) e conclua a criação.
6. Na lista de contas de serviço, clique na que você criou → aba **Chaves** → **Adicionar chave →
   Criar nova chave → JSON**. Um arquivo `.json` será baixado.
7. Abra o arquivo JSON. Você vai precisar de dois campos dele:
   - `client_email` → vai para `GOOGLE_SHEETS_CLIENT_EMAIL` no `.env`
   - `private_key` → vai para `GOOGLE_SHEETS_PRIVATE_KEY` no `.env` (mantenha as quebras de linha
     como `\n`, exatamente como aparecem no arquivo JSON original)

---

## Compartilhando a planilha com a Service Account

A Service Account só consegue ler a planilha se for explicitamente convidada, como qualquer
colaborador do Google Sheets:

1. Abra a planilha de respostas do Forms.
2. Clique em **Compartilhar** (canto superior direito).
3. Cole o `client_email` da Service Account (algo como
   `portal-auditoria-sheets-reader@seu-projeto.iam.gserviceaccount.com`).
4. Defina a permissão como **Leitor**.
5. Envie o convite (não precisa de confirmação por e-mail, é uma conta de serviço).

---

## Preenchendo o `.env` do backend

```env
GOOGLE_SHEETS_CLIENT_EMAIL="portal-auditoria-sheets-reader@seu-projeto.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...resto-da-chave...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID="1aBcDeFGhiJKLmnoPQRstuVWxyz1234567890"
GOOGLE_SHEETS_RANGE="Respostas ao formulário 1!A:Z"
```

`GOOGLE_SHEETS_RANGE` deve apontar para a aba (sheet) dentro da planilha onde as respostas do
Forms são salvas — por padrão, o Google nomeia essa aba como **"Respostas ao formulário 1"**.
Se você renomeou a aba, ajuste aqui.

---

## Ajustando o mapeamento de colunas

O Portal traduz cada linha da planilha usando o **título exato da pergunta no Forms** como chave
(é assim que o Google Sheets nomeia as colunas automaticamente). Esse mapeamento está em:

```
backend/src/services/sheets-sync.service.ts
```

**Este projeto já vem configurado com o mapeamento real do formulário da empresa:**

```ts
const COLUNAS = {
  TIMESTAMP: "Carimbo de data/hora",
  LOJA: "Loja",
  RESPONSAVEL: "Responsável pelo preenchimento",
  DATA_OCORRENCIA: "Data do ajuste",
  VALOR: "Valor Total do Ajuste (R$)",
  QUANTIDADE: "Quantidade de produtos envolvidos",
  PRODUTOS_CODIGOS: "Códigos dos produtos",
  MOTIVO: "Por qual motivo está ocorrendo o ajuste?",
  JUSTIFICATIVA_DETALHE: "Descreva detalhadamente abaixo a justifica do ajuste.",
  ACOES_REINCIDENCIA: "Quais ações foram tomadas para evitar a reincidência deste saldo?",
  ANEXOS: "Anexos - Adicione foto, relatório ou documentos",
} as const;
```

Se você editar as perguntas do Forms no futuro (adicionar, remover ou renomear), volte a este
arquivo e ajuste o lado direito de cada linha para corresponder palavra por palavra ao novo
título da coluna (sensível a acentos e maiúsculas/minúsculas).

### Particularidades deste formulário, já tratadas no código

- **O campo "Loja" é uma lista suspensa (dropdown) que envia apenas o CÓDIGO da loja** (ex:
  `0123`), não o nome. **Para o vínculo automático funcionar, cadastre a loja no Portal (tela
  Lojas) com o campo "Código" digitado exatamente igual ao valor das opções do dropdown do
  Forms** — incluindo zeros à esquerda, se houver. Como tolerância extra, o sistema também
  compara os códigos ignorando zeros à esquerda (ex: aceita `123` cadastrado no Portal mesmo que
  o Forms envie `0123`), mas o ideal é manter os dois exatamente iguais para evitar qualquer
  ambiguidade.
- **"Responsável pelo preenchimento"** é a mesma pessoa usada como "gerente" para o Ranking de
  Gerentes — o Forms não tem uma segunda pergunta para isso, então os dois campos do banco
  (`responsavel` e `gerenteBruto`) recebem o mesmo valor.
- **Não há pergunta de "Nome do Produto"**, apenas "Códigos dos produtos". O Portal exibe o
  código onde normalmente mostraria o nome.
- **"Códigos dos produtos" pode listar mais de um item** na mesma resposta (separados por vírgula
  ou quebra de linha). O Portal **expande automaticamente** cada resposta em uma Justificativa por
  código de produto, para que os indicadores por produto (Top Produtos, Treemap, Curva ABC) sejam
  calculados corretamente. O valor total do ajuste é atribuído ao primeiro produto da lista; os
  demais entram com valor R$ 0,00, para não duplicar o total financeiro — mas o **índice de risco**
  considera o valor total da submissão (somando todos os itens), não o valor do item isolado.
- **"Data do ajuste"** é importada separadamente de "Carimbo de data/hora" (campo `dataOcorrencia`
  no banco), permitindo no futuro calcular o "Tempo Médio de Envio da Loja" (tempo entre o ajuste
  ocorrer de fato e a loja registrar no Forms) — esse indicador ainda não está exposto no
  Dashboard nesta entrega, mas o dado já está sendo coletado e armazenado.
- **"Quais ações foram tomadas para evitar a reincidência"** é concatenada ao texto de
  detalhamento da justificativa (`motivoDetalhe`), visível no modal de detalhamento de cada
  justificativa no Portal.
- A pergunta de confirmação **"Declaro que as informações são verdadeiras"** não é importada —
  é apenas uma validação binária do próprio Forms, sem valor analítico para o Portal.

---

## Ajustando o mapeamento de colunas (caso o formulário mude)

> **Dica:** depois de ajustar, use **Configurações → Testar Conexão** no Portal. Se a leitura
> funcionar mas os dados vierem em branco nos campos esperados, é sinal de que algum título de
> coluna está digitado diferente do Forms.

---

## Testando a integração

Com o backend rodando (`npm run dev`), você pode validar de duas formas:

1. **Pela interface**: tela **Configurações** → botão **Testar Conexão**. Mostra quantas linhas
   foram encontradas.
2. **Forçando uma sincronização manual**: botão **Atualizar Agora** na mesma tela, ou via API:
   ```bash
   curl -X POST http://localhost:3001/api/sync/forcar \
     -H "Authorization: Bearer SEU_TOKEN_JWT"
   ```

O polling automático já roda em segundo plano a cada `SHEETS_POLLING_INTERVAL_MS` (padrão: 30
segundos) a partir do momento em que o backend é iniciado — não é necessário fazer nada manualmente
em produção.

---

## Alternativa: Webhook via Apps Script

Caso no futuro você queira sincronização verdadeiramente instantânea (em vez de esperar o próximo
ciclo de polling), é possível configurar um gatilho na própria planilha:

1. Na planilha, vá em **Extensões → Apps Script**.
2. Cole um script que, no evento `onFormSubmit`, faça um `UrlFetchApp.fetch(...)` em formato POST
   para um endpoint do backend (ex: `POST /api/sync/forcar` ou um endpoint dedicado de webhook).
3. Em **Acionadores** (ícone de relógio), configure o gatilho **Ao enviar formulário** apontando
   para essa função.

Essa abordagem não está implementada nesta entrega (o MVP usa polling, por ser mais simples de
manter sem depender de manter um script publicado no Google Workspace), mas a arquitetura do
backend já suporta adicioná-la sem mudanças estruturais: bastaria criar uma rota que chama a mesma
função `sincronizarPlanilha()` já usada pelo polling.

---

## Perguntas frequentes

**"As respostas antigas, de antes de eu configurar o Portal, também serão importadas?"**
Sim. Na primeira sincronização, o Portal lê todas as linhas existentes na planilha e as importa
como justificativas, com o status inicial `RECEBIDO`.

**"E se eu editar uma resposta diretamente na planilha?"**
O Portal identifica cada linha por um identificador derivado do número da linha + timestamp do
Forms. Edições em campos de uma linha já importada **não são re-sincronizadas automaticamente**
neste MVP — apenas linhas novas geram novos registros. Edição de respostas antigas deve ser feita
no próprio Portal (tela de Justificativas → Análise), não na planilha.

**"Posso usar uma planilha que já tenha outras abas/dados, além das respostas do Forms?"**
Sim, desde que `GOOGLE_SHEETS_RANGE` aponte especificamente para a aba e o intervalo de colunas
corretos.
