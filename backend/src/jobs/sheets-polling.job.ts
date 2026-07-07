import { env } from "../config/env";
import { logger } from "../utils/logger";
import { sincronizarPlanilha } from "../services/sheets-sync.service";

let intervalo: NodeJS.Timeout | null = null;
let sincronizando = false;

/**
 * Inicia o polling periódico da planilha do Google Sheets.
 * A cada SHEETS_POLLING_INTERVAL_MS, busca novas linhas e atualiza o banco.
 * O frontend, por sua vez, faz polling do endpoint /api/sync/status e dos
 * próprios dados (dashboard, justificativas) para refletir as mudanças
 * "em tempo real" sem necessidade de recarregar a página.
 */
export function iniciarPollingSheets(): void {
  if (intervalo) {
    logger.warn("Polling do Google Sheets já está em execução. Ignorando nova inicialização.");
    return;
  }

  logger.info(
    `Iniciando polling do Google Sheets a cada ${env.SHEETS_POLLING_INTERVAL_MS / 1000}s.`
  );

  // Executa imediatamente ao iniciar, depois respeita o intervalo configurado.
  executarSincronizacaoSegura();

  intervalo = setInterval(executarSincronizacaoSegura, env.SHEETS_POLLING_INTERVAL_MS);
}

export function pararPollingSheets(): void {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
    logger.info("Polling do Google Sheets interrompido.");
  }
}

async function executarSincronizacaoSegura(): Promise<void> {
  if (sincronizando) {
    logger.debug("Sincronização anterior ainda em andamento, pulando este ciclo.");
    return;
  }

  sincronizando = true;
  try {
    const resultado = await sincronizarPlanilha();
    if (resultado.erros.length > 0) {
      logger.warn("Sincronização concluída com erros", { erros: resultado.erros });
    }
  } catch (erro) {
    logger.error("Falha inesperada no ciclo de polling do Google Sheets", { erro });
  } finally {
    sincronizando = false;
  }
}
