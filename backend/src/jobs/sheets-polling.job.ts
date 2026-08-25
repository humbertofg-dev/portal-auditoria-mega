import { env } from "../config/env";
import { logger } from "../utils/logger";
import { sincronizarPlanilha } from "../services/sheets-sync.service";

let intervalo: NodeJS.Timeout | null = null;
let sincronizando = false;

/**
 * Inicia o polling periódico da planilha do Google Sheets.
 * Intervalo padrão aumentado para 120s (era 30s) para reduzir transferência
 * de rede e evitar esgotar o limite mensal do banco de dados gratuito.
 * O valor ainda pode ser sobrescrito via SHEETS_POLLING_INTERVAL_MS no .env.
 */
export function iniciarPollingSheets(): void {
  if (intervalo) {
    logger.warn("Polling do Google Sheets já está em execução. Ignorando nova inicialização.");
    return;
  }

  // Garante mínimo de 60s para proteger a cota de transferência de rede.
  const intervaloCofigurado = env.SHEETS_POLLING_INTERVAL_MS;
  const intervaloFinal = Math.max(intervaloCofigurado, 60000);

  if (intervaloFinal !== intervaloCofigurado) {
    logger.warn(
      `SHEETS_POLLING_INTERVAL_MS (${intervaloCofigurado}ms) é menor que o mínimo seguro de 60s. Usando 60s.`
    );
  }

  logger.info(`Iniciando polling do Google Sheets a cada ${intervaloFinal / 1000}s.`);

  executarSincronizacaoSegura();
  intervalo = setInterval(executarSincronizacaoSegura, intervaloFinal);
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
