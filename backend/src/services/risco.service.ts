import { prisma } from "@/config/prisma";
import { NivelRisco } from "@prisma/client";

// ============================================================================
// ÍNDICE DE RISCO
//
// Combina, em uma pontuação de 0 a 100, os seguintes fatores do brief:
//   - Valor ajustado da justificativa
//   - Quantidade de ajustes da loja no mês
//   - Reincidência da loja (justificativas anteriores)
//   - Tempo para envio (loja demorou para registrar o ajuste)
//   - Quantidade de produtos distintos ajustados pela loja
//   - Histórico da loja (alertas já gerados)
//
// O resultado mapeia para o semáforo: 🟢 Baixo, 🟡 Médio, 🟠 Alto, 🔴 Crítico.
// Os pesos abaixo são um ponto de partida transparente e fácil de ajustar;
// não são uma fórmula estatística validada - documentar isso para a Auditoria.
// ============================================================================

const PESOS = {
  valor: 0.35,
  frequenciaMensal: 0.25,
  reincidencia: 0.2,
  diversidadeProdutos: 0.1,
  alertasHistoricos: 0.1,
};

// Normaliza um valor para a faixa 0-100 dado um teto de referência.
function normalizar(valor: number, teto: number): number {
  if (teto <= 0) return 0;
  return Math.min(100, (valor / teto) * 100);
}

function scoreParaNivel(score: number): NivelRisco {
  if (score >= 75) return "CRITICO";
  if (score >= 50) return "ALTO";
  if (score >= 25) return "MEDIO";
  return "BAIXO";
}

export async function calcularRiscoJustificativa(justificativaId: string): Promise<void> {
  const justificativa = await prisma.justificativa.findUnique({
    where: { id: justificativaId },
  });

  if (!justificativa || !justificativa.lojaId) {
    // Sem loja identificada, atribui risco médio por padrão (requer atenção manual).
    await prisma.justificativa.update({
      where: { id: justificativaId },
      data: { nivelRisco: "MEDIO", scoreRisco: 50 },
    });
    return;
  }

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [justificativasNoMes, totalHistoricoLoja, alertasHistoricos, itensDaMesmaSubmissao] =
    await Promise.all([
      prisma.justificativa.findMany({
        where: { lojaId: justificativa.lojaId, dataEnvio: { gte: inicioMes } },
      }),
      prisma.justificativa.count({ where: { lojaId: justificativa.lojaId } }),
      prisma.alerta.count({ where: { lojaId: justificativa.lojaId } }),
      // Uma única resposta do Forms pode gerar várias Justificativas (uma por
      // código de produto). O valor "real" da ocorrência é o total da submissão,
      // não o valor do item isolado (que pode ser R$ 0,00 para itens secundários).
      justificativa.submissaoId
        ? prisma.justificativa.findMany({ where: { submissaoId: justificativa.submissaoId } })
        : Promise.resolve([justificativa]),
    ]);

  const valorTotalSubmissao = itensDaMesmaSubmissao.reduce(
    (acc, item) => acc + Number(item.valorAjustado),
    0
  );

  const valorScore = normalizar(valorTotalSubmissao, 500); // teto de referência: R$500
  const frequenciaScore = normalizar(justificativasNoMes.length, 10); // teto: 10 ajustes/mês
  const reincidenciaScore = normalizar(totalHistoricoLoja, 20); // teto: 20 ajustes no histórico
  const produtosDistintos = new Set(
    justificativasNoMes.map((j) => j.produtoCodigo).filter(Boolean)
  ).size;
  const diversidadeScore = normalizar(produtosDistintos, 10);
  const alertasScore = normalizar(alertasHistoricos, 5);

  const scoreFinal =
    valorScore * PESOS.valor +
    frequenciaScore * PESOS.frequenciaMensal +
    reincidenciaScore * PESOS.reincidencia +
    diversidadeScore * PESOS.diversidadeProdutos +
    alertasScore * PESOS.alertasHistoricos;

  await prisma.justificativa.update({
    where: { id: justificativaId },
    data: {
      scoreRisco: Math.round(scoreFinal * 100) / 100,
      nivelRisco: scoreParaNivel(scoreFinal),
    },
  });
}

/**
 * Recalcula o risco de todas as justificativas em aberto de uma loja.
 * Útil para rodar periodicamente, já que o risco de uma justificativa antiga
 * pode mudar conforme a loja acumula mais ocorrências.
 */
export async function recalcularRiscoLoja(lojaId: string): Promise<void> {
  const justificativasAbertas = await prisma.justificativa.findMany({
    where: { lojaId, status: { in: ["RECEBIDO", "EM_ANALISE", "SOLICITADO_COMPLEMENTACAO"] } },
    select: { id: true },
  });

  for (const j of justificativasAbertas) {
    await calcularRiscoJustificativa(j.id);
  }
}
