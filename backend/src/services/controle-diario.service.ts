import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";

/**
 * Quando uma nova Justificativa é importada do Google Forms (via polling do
 * Sheets), esta função verifica se existe um Item de Controle Diário aguardando
 * para a mesma loja na mesma data, e atualiza seu status automaticamente para
 * JUSTIFICATIVA_RECEBIDA — sem intervenção manual da Auditoria.
 *
 * Isso implementa a "Etapa 3 – Monitoramento Automático" do módulo Central de
 * Controle Diário: "Sempre que uma nova resposta chegar, localizar a loja e
 * atualizar o status."
 */
export async function vincularJustificativaAoControleDiario(
  justificativaId: string
): Promise<void> {
  try {
    const justificativa = await prisma.justificativa.findUnique({
      where: { id: justificativaId },
      select: { lojaId: true, dataEnvio: true, valorAjustado: true, responsavel: true },
    });

    if (!justificativa?.lojaId) return;

    // Encontra a data do envio (sem hora, para casar com a data do controle)
    const dataEnvio = new Date(justificativa.dataEnvio);
    dataEnvio.setHours(0, 0, 0, 0);

    // Busca o controle do dia correspondente
    const controle = await prisma.controleDiario.findUnique({
      where: { data: dataEnvio },
    });

    if (!controle || controle.fechado) return;

    // Busca o item de controle para esta loja (se existir)
    const item = await prisma.itemControleDiario.findUnique({
      where: {
        controleDiarioId_lojaId: {
          controleDiarioId: controle.id,
          lojaId: justificativa.lojaId,
        },
      },
    });

    if (!item || item.status !== "AGUARDANDO_JUSTIFICATIVA") return;

    // Atualiza o status para JUSTIFICATIVA_RECEBIDA
    await prisma.itemControleDiario.update({
      where: { id: item.id },
      data: {
        status: "JUSTIFICATIVA_RECEBIDA",
        justificativaId,
        horaEnvio: justificativa.dataEnvio,
        responsavel: justificativa.responsavel,
        valorInformado: justificativa.valorAjustado,
      },
    });

    logger.info(
      `Controle diário atualizado: loja ${justificativa.lojaId} → JUSTIFICATIVA_RECEBIDA`
    );
  } catch (erro) {
    logger.error("Erro ao vincular justificativa ao controle diário", { erro, justificativaId });
  }
}
