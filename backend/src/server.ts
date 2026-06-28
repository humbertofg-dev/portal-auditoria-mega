import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { iniciarPollingSheets } from "./jobs/sheets-polling.job";

import { authRouter } from "./routes/auth.routes";
import { justificativasRouter } from "./routes/justificativas.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { lojasRouter, regionaisRouter } from "./routes/lojas-regionais.routes";
import { usuariosRouter } from "./routes/usuarios.routes";
import { syncRouter, logsRouter } from "./routes/sync-logs.routes";
import { exportacaoRouter } from "./routes/exportacao.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "5mb" }));

// Rate limit geral para mitigar abuso/força-bruta na API.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Rate limit mais restritivo especificamente no login.
app.use(
  "/api/auth/login",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false })
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/justificativas", justificativasRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/lojas", lojasRouter);
app.use("/api/regionais", regionaisRouter);
app.use("/api/usuarios", usuariosRouter);
app.use("/api/sync", syncRouter);
app.use("/api/logs", logsRouter);
app.use("/api/exportacao", exportacaoRouter);

// Handler de 404 para rotas de API não encontradas.
app.use("/api", (_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

// Handler de erro centralizado.
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error("Erro não tratado na API", { erro: err.message, stack: err.stack });
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
);

app.listen(env.PORT, () => {
  logger.info(`Portal Auditoria MEGA - API rodando na porta ${env.PORT} (${env.NODE_ENV})`);
  iniciarPollingSheets();
});
