# Portal Auditoria MEGA

Sistema corporativo de auditoria para acompanhamento de justificativas de ajustes manuais de estoque.

> **As lojas não acessam este sistema.** Elas preenchem exclusivamente um **Google Forms**.
> O Portal lê automaticamente as respostas armazenadas na **Google Sheets** vinculada ao Forms
> e concentra toda a inteligência (dashboards, alertas, risco, análise) para a equipe de Auditoria.

---

## 1. Visão geral da arquitetura

```
┌──────────────┐      respostas       ┌──────────────────┐
│ Google Forms │ ───────────────────► │  Google Sheets    │
│ (só lojas)   │                      │ (planilha de      │
└──────────────┘                      │  respostas)        │
                                       └─────────┬─────────┘
                                                 │ polling (a cada N segundos)
                                                 │ Google Sheets API (Service Account)
                                                 ▼
                                       ┌───────────────────┐
                                       │  Backend (Node.js) │
                                       │  Express + Prisma  │
                                       │  PostgreSQL         │
                                       └─────────┬─────────┘
                                                 │ REST API (JWT)
                                                 ▼
                                       ┌───────────────────┐
                                       │ Frontend (React)   │
                                       │ Portal da Auditoria │
                                       │ (Dashboard, etc.)   │
                                       └───────────────────┘
```

**Atualização "em tempo real":** o backend faz **polling** periódico da planilha (padrão: 30s,
configurável). A cada ciclo, novas linhas viram registros de `Justificativa`, o índice de risco é
recalculado e as regras de alerta são reavaliadas. O frontend, por sua vez, faz polling leve dos
próprios endpoints (10–20s) para refletir essas mudanças sem que o usuário precise atualizar a página.

> Por que polling e não webhook nativo? O Google Sheets não oferece webhooks nativos para
> sistemas externos. A forma "tempo real" de fato seria um **Google Apps Script** publicado a
> partir da própria planilha, fazendo um `POST` para um endpoint do backend a cada nova resposta.
> Essa opção está documentada em [`docs/integracao-google-sheets.md`](docs/integracao-google-sheets.md#alternativa-webhook-via-apps-script)
> como evolução futura, mas o MVP atual usa polling por ser mais simples de operar e não depender
> de manter um script publicado no Google Workspace da empresa.

---

## 2. Stack técnica

| Camada      | Tecnologia |
|-------------|------------|
| Frontend    | React 18 + TypeScript + Vite + Tailwind CSS + Recharts + React Router |
| Backend     | Node.js + Express + TypeScript |
| Banco       | PostgreSQL + Prisma ORM |
| Autenticação| JWT (perfis: Administrador, Auditoria, Consulta) |
| Integração  | Google Sheets API v4 (Service Account, somente leitura) |
| Exportação  | ExcelJS (Excel), CSV nativo, PDFKit (PDF) |

---

## 3. Estrutura de pastas

```
portal-auditoria-mega/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Modelo de dados completo
│   │   └── seed.ts             # Usuário admin + dados iniciais
│   ├── src/
│   │   ├── config/             # env, prisma client
│   │   ├── middleware/         # autenticação/autorização JWT
│   │   ├── routes/             # endpoints REST por domínio
│   │   ├── services/           # regras de negócio (Sheets, risco, alertas, exportação)
│   │   ├── jobs/                # polling do Google Sheets
│   │   ├── utils/               # filtros, logger
│   │   └── server.ts           # bootstrap do Express
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/          # layout, ui, dashboard, justificativas
│   │   ├── pages/               # uma página por item do menu lateral
│   │   ├── services/            # chamadas à API
│   │   ├── contexts/            # autenticação
│   │   ├── hooks/               # usePolling (atualização automática)
│   │   └── types/                # tipos compartilhados com o backend
│   └── .env.example
└── docs/
    ├── integracao-google-sheets.md
    └── modelo-dados.md
```

---

## 4. Como executar localmente

### 4.1. Pré-requisitos
- Node.js 20+
- PostgreSQL 14+ (local ou um serviço gerenciado)
- Uma conta Google com acesso ao Google Cloud Console (para a Service Account)

### 4.2. Backend

```bash
cd backend
cp .env.example .env
# edite o .env com sua DATABASE_URL, JWT_SECRET e credenciais do Google Sheets
npm install
npm run prisma:generate
npm run prisma:migrate      # cria as tabelas no banco
npm run prisma:seed         # cria o usuário administrador padrão
npm run dev                 # inicia a API em http://localhost:3001
```

Usuário administrador padrão criado pelo seed:
- **E-mail:** `admin@megathorra.com.br`
- **Senha:** `TrocarSenha123!` — **troque imediatamente após o primeiro acesso.**

### 4.3. Frontend

```bash
cd frontend
cp .env.example .env
# garanta que VITE_API_URL aponta para o backend (padrão: http://localhost:3001/api)
npm install
npm run dev                 # inicia o portal em http://localhost:5173
```

### 4.4. Integração com Google Sheets

Siga o passo a passo completo em [`docs/integracao-google-sheets.md`](docs/integracao-google-sheets.md).
Resumo:
1. Crie um projeto no Google Cloud Console e habilite a **Google Sheets API**.
2. Crie uma **Service Account** e gere uma chave JSON.
3. Compartilhe a planilha de respostas do Forms com o e-mail da Service Account (permissão **Leitor**).
4. Preencha `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`
   e `GOOGLE_SHEETS_RANGE` no `.env` do backend.
5. Ajuste o mapeamento de colunas em `backend/src/services/sheets-sync.service.ts` (objeto `COLUNAS`)
   para bater exatamente com os títulos das perguntas do seu Forms.
6. Use a tela **Configurações → Testar Conexão** no Portal para validar.

---

## 5. Perfis de acesso

| Perfil          | Pode visualizar | Pode analisar justificativas | Pode gerenciar usuários/config |
|------------------|:---:|:---:|:---:|
| **Consulta**     | ✅ | ❌ | ❌ |
| **Auditoria**     | ✅ | ✅ | ❌ |
| **Administrador** | ✅ | ✅ | ✅ |

---

## 6. Decisões importantes e limitações conhecidas do MVP

- **Sem módulo de IA nesta entrega.** O brief original previa um módulo de IA (resumos
  executivos, detecção de padrões, classificação automática). Por decisão do escopo do MVP,
  essa camada foi deixada para uma segunda fase. O índice de risco (semáforo 🟢🟡🟠🔴) já está
  implementado com regras estatísticas transparentes (ver `backend/src/services/risco.service.ts`),
  servindo de base para a IA ser plugada depois sem refatoração estrutural.
- **Uma resposta do Forms pode gerar várias Justificativas.** Como o formulário permite informar
  vários códigos de produto numa única resposta, o Portal expande cada resposta em uma
  Justificativa por produto (campo `submissaoId` agrupa os itens da mesma resposta original). O
  valor financeiro total fica no primeiro item; os demais ficam com valor R$ 0,00 para não
  duplicar o total nos dashboards — mas o índice de risco usa o valor total da submissão. Ver
  detalhes em `docs/integracao-google-sheets.md`.
- **"Tempo médio de envio da loja"** (do fato gerador até o registro no Forms) já é calculável
  com os dados atuais, já que o Forms tem um campo próprio de "Data do ajuste" (`dataOcorrencia`),
  separado do "Carimbo de data/hora" de envio. Esse indicador ainda não está exposto no Dashboard
  nesta entrega, mas o dado já está sendo coletado e fica disponível para uma próxima iteração.
- **Vínculo Loja ↔ Justificativa depende de cadastro prévio.** Se o código/nome da loja informado
  no Forms não corresponder a nenhuma loja cadastrada no Portal (tela **Lojas**), a justificativa
  ainda é importada, mas fica sem regional/cidade associada até a loja ser cadastrada.
- **Limite de exportação:** 5.000 linhas por exportação, para evitar exportações descontroladas
  que sobrecarreguem o servidor. Ajustável em `backend/src/routes/exportacao.routes.ts`.

---

## 7. Próximos passos sugeridos (fora do escopo deste MVP)

- Módulo de IA (resumo executivo, detecção de reincidência, recomendações automatizadas).
- Webhook via Google Apps Script para sincronização instantânea (em vez de polling).
- Testes automatizados (unitários e E2E).
- Pipeline de CI/CD e containerização (Docker) para implantação.
