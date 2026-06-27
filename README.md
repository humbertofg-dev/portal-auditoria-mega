# Portal Auditoria MEGA

Sistema de auditoria para acompanhamento de justificativas de ajustes manuais de estoque.
As lojas registram tudo via **Google Forms**; este Portal lê automaticamente as respostas
(via Google Sheets) e concentra toda a análise, indicadores e controle de risco para a
equipe de Auditoria.

## Início rápido

```bash
# Backend
cd backend && cp .env.example .env && npm install
npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed
npm run dev

# Frontend (em outro terminal)
cd frontend && cp .env.example .env && npm install
npm run dev
```

Acesse `http://localhost:5173`. Login padrão criado pelo seed:
- **E-mail:** `admin@megathorra.com.br`
- **Senha:** `TrocarSenha123!`

## Documentação completa

- [`docs/README.md`](docs/README.md) — arquitetura, stack, estrutura de pastas, decisões do MVP
- [`docs/integracao-google-sheets.md`](docs/integracao-google-sheets.md) — passo a passo da
  integração (Service Account, mapeamento de colunas, testes)
- [`docs/modelo-dados.md`](docs/modelo-dados.md) — entidades e relacionamentos do banco de dados

## Escopo desta entrega (MVP)

✅ Dashboard executivo com cards, gráficos e alertas automáticos
✅ Tela de Justificativas com filtros, busca, ordenação, paginação e detalhamento completo
✅ Análise da Auditoria (status, parecer técnico, histórico, comentários)
✅ Índice de risco (semáforo 🟢🟡🟠🔴) calculado automaticamente
✅ 4 regras de alerta automático (valor diário, frequência mensal, pendência prolongada, crescimento regional)
✅ Indicadores (Top lojas, evolução temporal, motivos, treemap de produtos, heatmap regional, curva ABC)
✅ Ranking (lojas, produtos, gerentes, regionais)
✅ Exportação em Excel, CSV e PDF
✅ Autenticação JWT com 3 perfis (Administrador, Auditoria, Consulta)
✅ Logs de auditoria do próprio sistema
✅ Integração com Google Sheets via polling automático

⏳ Módulo de Inteligência Artificial — deixado para uma fase 2, por decisão de escopo (ver
`docs/README.md`, seção 6).
