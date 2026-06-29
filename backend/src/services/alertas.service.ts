import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { logger } from "../utils/logger";

// ============================================================================
// REGRAS DE ALERTA (conforme especificação do Portal):
//
// 1. Loja ultrapassar R$100,00 em ajustes no dia        -> VALOR_DIARIO_EXCEDIDO
// 2. Loja com mais de 3 justificativas no mês            -> FREQUENCIA_MENSAL_EXCEDIDA
// 3. Justificativa pendente por mais de 24h               -> PENDENCIA_PROLONGADA
// 4. Regional com crescimento > 30% nas ocorrências       -> CRESCIMENTO_REGIONAL
//
// Todas as regras são idempotentes: antes de criar um alerta, verificam se já
// existe um alerta não resolvido equivalente, evitando duplicação a cada polling.
// ============================================================================

async function existeAlertaAtivo(params: {
  tipo: "VALOR_DIARIO_EXCEDIDO" | "FREQUENCIA_MENSAL_EXCEDIDA" | "PENDENCIA_PROLONGADA" | "CRESCIMENTO_REGIONAL";
  lojaId?: string;
  regionalId?: string;
  justificativaId?: string;
  desde: Date;
}) {
  return prisma.alerta.findFirst({
    where: {
      tipo: params.tipo,
      lojaId: params.lojaId,
      regionalId: params.regionalId,
      justificativaId: params.justificativaId,
      resolvido: false,
      createdAt: { gte: params.desde },
    },
  });
}

async function verificarValorDiarioExcedido() {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const ajustesHoje = await prisma.justificativa.groupBy({
    by: ["lojaId"],
    where: { dataEnvio: { gte: inicioHoje }, lojaId: { not: null } },
    _sum: { valorAjustado: true },
  });

  for (const grupo of ajustesHoje) {
    const total = Number(grupo._sum.valorAjustado ?? 0);
    if (total > env.ALERTA_VALOR_DIARIO_LIMITE && grupo.lojaId) {
      const jaExiste = await existeAlertaAtivo({
        tipo: "VALOR_DIARIO_EXCEDIDO",
        lojaId: grupo.lojaId,
        desde: inicioHoje,
      });
      if (jaExiste) continue;

      const loja = await prisma.loja.findUnique({ where: { id: grupo.lojaId } });

      await prisma.alerta.create({
        data: {
          tipo: "VALOR_DIARIO_EXCEDIDO",
          severidade: "ATENCAO",
          titulo: `Loja ${loja?.nome ?? grupo.lojaId} ultrapassou o limite diário de ajustes`,
          descricao: `Valor ajustado hoje: R$ ${total.toFixed(2)} (limite: R$ ${env.ALERTA_VALOR_DIARIO_LIMITE.toFixed(2)}).`,
          lojaId: grupo.lojaId,
        },
      });
    }
  }
}

async function verificarFrequenciaMensalExcedida() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const ajustesNoMes = await prisma.justificativa.groupBy({
    by: ["lojaId"],
    where: { dataEnvio: { gte: inicioMes }, lojaId: { not: null } },
    _count: { id: true },
  });

  for (const grupo of ajustesNoMes) {
    if (grupo._count.id > env.ALERTA_FREQUENCIA_MENSAL_LIMITE && grupo.lojaId) {
      const jaExiste = await existeAlertaAtivo({
        tipo: "FREQUENCIA_MENSAL_EXCEDIDA",
        lojaId: grupo.lojaId,
        desde: inicioMes,
      });
      if (jaExiste) continue;

      const loja = await prisma.loja.findUnique({ where: { id: grupo.lojaId } });

      await prisma.alerta.create({
        data: {
          tipo: "FREQUENCIA_MENSAL_EXCEDIDA",
          severidade: "ATENCAO",
          titulo: `Loja ${loja?.nome ?? grupo.lojaId} reincidente no mês`,
          descricao: `${grupo._count.id} justificativas registradas este mês (limite: ${env.ALERTA_FREQUENCIA_MENSAL_LIMITE}).`,
          lojaId: grupo.lojaId,
        },
      });
    }
  }
}

async function verificarPendenciaProlongada() {
  const limite = new Date();
  limite.setHours(limite.getHours() - env.ALERTA_PENDENCIA_HORAS_LIMITE);

  const pendentes = await prisma.justificativa.findMany({
    where: {
      status: { in: ["RECEBIDO", "EM_ANALISE", "SOLICITADO_COMPLEMENTACAO"] },
      createdAt: { lte: limite },
    },
    include: { loja: true },
  });

  for (const justificativa of pendentes) {
    const jaExiste = await existeAlertaAtivo({
      tipo: "PENDENCIA_PROLONGADA",
      justificativaId: justificativa.id,
      desde: new Date(0), // alertas de pendência não se repetem enquanto não resolvidos
    });
    if (jaExiste) continue;

    await prisma.alerta.create({
      data: {
        tipo: "PENDENCIA_PROLONGADA",
        severidade: "CRITICO",
        titulo: `Justificativa pendente há mais de ${env.ALERTA_PENDENCIA_HORAS_LIMITE}h`,
        descricao: `Justificativa da loja ${justificativa.loja?.nome ?? justificativa.lojaCodigoBruto} aguarda análise desde ${justificativa.createdAt.toLocaleString("pt-BR")}.`,
        lojaId: justificativa.lojaId ?? undefined,
        justificativaId: justificativa.id,
      },
    });
  }
}

async function verificarCrescimentoRegional() {
  const hoje = new Date();
  const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

  const regionais = await prisma.regional.findMany({ include: { lojas: true } });

  for (const regional of regionais) {
    const lojaIds = regional.lojas.map((l: { id: string }) => l.id);
    if (lojaIds.length === 0) continue;

    const [ocorrenciasMesAtual, ocorrenciasMesAnterior] = await Promise.all([
      prisma.justificativa.count({
        where: { lojaId: { in: lojaIds }, dataEnvio: { gte: inicioMesAtual } },
      }),
      prisma.justificativa.count({
        where: {
          lojaId: { in: lojaIds },
          dataEnvio: { gte: inicioMesAnterior, lt: inicioMesAtual },
        },
      }),
    ]);

    if (ocorrenciasMesAnterior === 0) continue; // sem base de comparação

    const crescimentoPercentual =
      ((ocorrenciasMesAtual - ocorrenciasMesAnterior) / ocorrenciasMesAnterior) * 100;

    if (crescimentoPercentual > env.ALERTA_CRESCIMENTO_REGIONAL_PERCENTUAL) {
      const jaExiste = await existeAlertaAtivo({
        tipo: "CRESCIMENTO_REGIONAL",
        regionalId: regional.id,
        desde: inicioMesAtual,
      });
      if (jaExiste) continue;

      await prisma.alerta.create({
        data: {
          tipo: "CRESCIMENTO_REGIONAL",
          severidade: "CRITICO",
          titulo: `Crescimento de ${crescimentoPercentual.toFixed(0)}% nas ocorrências da regional ${regional.nome}`,
          descricao: `${ocorrenciasMesAnterior} ocorrências no mês anterior para ${ocorrenciasMesAtual} no mês atual.`,
          regionalId: regional.id,
        },
      });
    }
  }
}

export async function verificarRegrasDeAlerta(): Promise<void> {
  await Promise.all([
    verificarValorDiarioExcedido(),
    verificarFrequenciaMensalExcedida(),
    verificarPendenciaProlongada(),
    verificarCrescimentoRegional(),
  ]).catch((erro) => {
    logger.error("Erro ao executar verificação de regras de alerta", { erro });
    throw erro;
  });
}
