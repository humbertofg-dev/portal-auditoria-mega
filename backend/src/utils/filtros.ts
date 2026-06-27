import { Request } from "express";
import { Prisma, StatusJustificativa, NivelRisco } from "@prisma/client";

/**
 * Lê os filtros globais (query params) que o brief especifica e monta
 * a cláusula `where` do Prisma correspondente. Usado tanto pelas rotas
 * de Dashboard/Indicadores quanto pela tela de Justificativas, garantindo
 * que "todos os gráficos respondam aos filtros", como pede a especificação.
 */
export function montarFiltrosJustificativa(req: Request): Prisma.JustificativaWhereInput {
  const {
    dataInicial,
    dataFinal,
    regionalId,
    lojaId,
    cidade,
    produtoCodigo,
    status,
    motivo,
    gerente,
    responsavel,
    valorMinimo,
    valorMaximo,
    busca,
  } = req.query as Record<string, string | undefined>;

  const where: Prisma.JustificativaWhereInput = {};

  if (dataInicial || dataFinal) {
    where.dataEnvio = {};
    if (dataInicial) where.dataEnvio.gte = new Date(dataInicial);
    if (dataFinal) {
      const fim = new Date(dataFinal);
      fim.setHours(23, 59, 59, 999);
      where.dataEnvio.lte = fim;
    }
  }

  if (lojaId) where.lojaId = lojaId;

  if (regionalId || cidade) {
    where.loja = {
      ...(regionalId ? { regionalId } : {}),
      ...(cidade ? { cidade: { equals: cidade, mode: "insensitive" } } : {}),
    };
  }

  if (produtoCodigo) where.produtoCodigo = { equals: produtoCodigo, mode: "insensitive" };

  if (status && isStatusValido(status)) where.status = status;

  if (motivo) where.motivo = { equals: motivo, mode: "insensitive" };

  if (gerente) where.gerenteBruto = { contains: gerente, mode: "insensitive" };

  if (responsavel) where.responsavel = { contains: responsavel, mode: "insensitive" };

  if (valorMinimo || valorMaximo) {
    where.valorAjustado = {};
    if (valorMinimo) where.valorAjustado.gte = Number(valorMinimo);
    if (valorMaximo) where.valorAjustado.lte = Number(valorMaximo);
  }

  if (busca) {
    where.OR = [
      { lojaCodigoBruto: { contains: busca, mode: "insensitive" } },
      { produtoNome: { contains: busca, mode: "insensitive" } },
      { motivo: { contains: busca, mode: "insensitive" } },
      { responsavel: { contains: busca, mode: "insensitive" } },
      { gerenteBruto: { contains: busca, mode: "insensitive" } },
    ];
  }

  return where;
}

function isStatusValido(valor: string): valor is StatusJustificativa {
  return ["RECEBIDO", "EM_ANALISE", "APROVADO", "REPROVADO", "SOLICITADO_COMPLEMENTACAO"].includes(
    valor
  );
}

export function isNivelRiscoValido(valor: string): valor is NivelRisco {
  return ["BAIXO", "MEDIO", "ALTO", "CRITICO"].includes(valor);
}
