import { Router } from "express";
import { PerfilUsuario } from "@prisma/client";
import { prisma } from "@/config/prisma";
import { autenticar, autorizar } from "@/middleware/auth.middleware";
import { sincronizarPlanilha, obterStatusSincronizacao } from "@/services/sheets-sync.service";
import { testarConexaoPlanilha } from "@/services/google-sheets.service";

export const syncRouter = Router();
export const logsRouter = Router();

syncRouter.use(autenticar);
logsRouter.use(autenticar);

// Status da última sincronização — o frontend faz polling neste endpoint
// para saber se há dados novos e atualizar dashboards sem reload de página.
syncRouter.get("/status", async (_req, res) => {
  const status = await obterStatusSincronizacao();
  res.json(
    status ?? {
      fonte: "google_sheets_respostas",
      ultimaSincronia: null,
      ultimoStatus: "NUNCA_EXECUTADO",
    }
  );
});

// Força uma sincronização imediata (botão "Atualizar agora" na tela de Configurações)
syncRouter.post(
  "/forcar",
  autorizar([PerfilUsuario.ADMINISTRADOR, PerfilUsuario.AUDITORIA]),
  async (_req, res) => {
    const resultado = await sincronizarPlanilha();
    res.json(resultado);
  }
);

// Testa as credenciais/configuração da planilha (tela de Configurações)
syncRouter.get("/testar-conexao", autorizar([PerfilUsuario.ADMINISTRADOR]), async (_req, res) => {
  const resultado = await testarConexaoPlanilha();
  res.json(resultado);
});

// ----------------------------------------------------------------------------
// LOGS (trilha de auditoria do próprio sistema, conforme LGPD/governança)
// ----------------------------------------------------------------------------

logsRouter.get("/", autorizar([PerfilUsuario.ADMINISTRADOR]), async (req, res) => {
  const pagina = Math.max(1, Number(req.query.pagina ?? 1));
  const porPagina = Math.min(100, Math.max(1, Number(req.query.porPagina ?? 50)));

  const [itens, total] = await Promise.all([
    prisma.logAcesso.findMany({
      include: { usuario: { select: { nome: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.logAcesso.count(),
  ]);

  res.json({ itens, paginacao: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) } });
});
