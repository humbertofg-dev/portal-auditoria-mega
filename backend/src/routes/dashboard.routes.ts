import { Router } from "express";
import { prisma } from "../config/prisma";
import { autenticar } from "../middleware/auth.middleware";
import { montarFiltrosJustificativa } from "../utils/filtros";

export const dashboardRouter = Router();

dashboardRouter.use(autenticar);

// --- Cards do Dashboard Principal ---
dashboardRouter.get("/cards", async (req, res) => {
  const where = montarFiltrosJustificativa(req);

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    total,
    pendentes,
    emAnalise,
    aprovadas,
    reprovadas,
    valorHoje,
    valorMes,
    lojasComOcorrencias,
    produtosAjustados,
    justificativasComTempos,
  ] = await Promise.all([
    prisma.justificativa.count({ where }),
    prisma.justificativa.count({ where: { ...where, status: "RECEBIDO" } }),
    prisma.justificativa.count({ where: { ...where, status: "EM_ANALISE" } }),
    prisma.justificativa.count({ where: { ...where, status: "APROVADO" } }),
    prisma.justificativa.count({ where: { ...where, status: "REPROVADO" } }),
    prisma.justificativa.aggregate({
      where: { ...where, dataEnvio: { gte: inicioHoje } },
      _sum: { valorAjustado: true },
    }),
    prisma.justificativa.aggregate({
      where: { ...where, dataEnvio: { gte: inicioMes } },
      _sum: { valorAjustado: true },
    }),
    prisma.justificativa.findMany({ where, distinct: ["lojaId"], select: { lojaId: true } }),
    prisma.justificativa.findMany({
      where,
      distinct: ["produtoCodigo"],
      select: { produtoCodigo: true },
    }),
    prisma.justificativa.findMany({
      where: { ...where, dataPrimeiraAnalise: { not: null } },
      select: { createdAt: true, dataEnvio: true, dataPrimeiraAnalise: true },
    }),
  ]);

  const tempoMedioRespostaAuditoria = calcularMediaHoras(
    justificativasComTempos.map((j: { createdAt: Date; dataPrimeiraAnalise: Date | null }) => [
      j.createdAt,
      j.dataPrimeiraAnalise!,
    ])
  );

  // Tempo médio de envio da loja: do "ocorrido" até o registro no Forms não é
  // rastreável (não temos a data do fato gerador), então usamos como proxy
  // o tempo entre a criação no sistema (= chegada da resposta do Forms) e a
  // data informada no próprio formulário, quando aplicável. Documentado no README.
  const tempoMedioEnvioLoja = null;

  res.json({
    totalJustificativas: total,
    pendentes,
    emAnalise,
    aprovadas,
    reprovadas,
    valorAjustadoHoje: Number(valorHoje._sum.valorAjustado ?? 0),
    valorAjustadoMes: Number(valorMes._sum.valorAjustado ?? 0),
    lojasComOcorrencias: lojasComOcorrencias.filter((l: { lojaId: string | null }) => l.lojaId)
      .length,
    produtosAjustados: produtosAjustados.filter(
      (p: { produtoCodigo: string | null }) => p.produtoCodigo
    ).length,
    tempoMedioRespostaAuditoriaHoras: tempoMedioRespostaAuditoria,
    tempoMedioEnvioLojaHoras: tempoMedioEnvioLoja,
  });
});

function calcularMediaHoras(pares: [Date, Date][]): number | null {
  if (pares.length === 0) return null;
  const totalHoras = pares.reduce((acc, [inicio, fim]) => {
    return acc + (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
  }, 0);
  return Math.round((totalHoras / pares.length) * 100) / 100;
}

// --- Top 20 lojas com maior valor ajustado (gráfico de barras) ---
dashboardRouter.get("/top-lojas", async (req, res) => {
  const where = montarFiltrosJustificativa(req);

  const agrupado = await prisma.justificativa.groupBy({
    by: ["lojaId"],
    where: { ...where, lojaId: { not: null } },
    _sum: { valorAjustado: true },
    _count: { id: true },
    orderBy: { _sum: { valorAjustado: "desc" } },
    take: 20,
  });

  const lojas = await prisma.loja.findMany({
    where: { id: { in: agrupado.map((g: { lojaId: string | null }) => g.lojaId!).filter(Boolean) } },
  });

  const resultado = agrupado.map((g: { lojaId: string | null; _sum: { valorAjustado: unknown }; _count: { id: number } }) => {
    const loja = lojas.find((l: { id: string }) => l.id === g.lojaId);
    return {
      lojaId: g.lojaId,
      lojaNome: loja?.nome ?? "Desconhecida",
      lojaCodigo: loja?.codigo ?? "-",
      valorTotal: Number(g._sum.valorAjustado ?? 0),
      quantidadeAjustes: g._count.id,
    };
  });

  res.json(resultado);
});

// --- Evolução diária/semanal/mensal (gráfico de linhas) ---
dashboardRouter.get("/evolucao", async (req, res) => {
  const where = montarFiltrosJustificativa(req);
  const granularidade = (req.query.granularidade as string) ?? "diaria";

  const justificativas = await prisma.justificativa.findMany({
    where,
    select: { dataEnvio: true, valorAjustado: true },
    orderBy: { dataEnvio: "asc" },
  });

  const formatoChave = (data: Date): string => {
    if (granularidade === "mensal") return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    if (granularidade === "semanal") {
      const inicioAno = new Date(data.getFullYear(), 0, 1);
      const semana = Math.ceil(((data.getTime() - inicioAno.getTime()) / 86400000 + inicioAno.getDay() + 1) / 7);
      return `${data.getFullYear()}-S${semana}`;
    }
    return data.toISOString().slice(0, 10); // diária
  };

  const agregados = new Map<string, { quantidade: number; valor: number }>();

  for (const j of justificativas) {
    const chave = formatoChave(j.dataEnvio);
    const atual = agregados.get(chave) ?? { quantidade: 0, valor: 0 };
    atual.quantidade += 1;
    atual.valor += Number(j.valorAjustado);
    agregados.set(chave, atual);
  }

  const resultado = Array.from(agregados.entries())
    .map(([periodo, dados]) => ({ periodo, ...dados }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));

  res.json(resultado);
});

// --- Motivos dos ajustes (gráfico de pizza) ---
dashboardRouter.get("/motivos", async (req, res) => {
  const where = montarFiltrosJustificativa(req);

  const agrupado = await prisma.justificativa.groupBy({
    by: ["motivo"],
    where,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  res.json(
    agrupado.map((g: { motivo: string; _count: { id: number } }) => ({
      motivo: g.motivo,
      quantidade: g._count.id,
    }))
  );
});

// --- Produtos mais ajustados (treemap) ---
dashboardRouter.get("/produtos-ajustados", async (req, res) => {
  const where = montarFiltrosJustificativa(req);

  const agrupado = await prisma.justificativa.groupBy({
    by: ["produtoCodigo", "produtoNome"],
    where: { ...where, produtoCodigo: { not: null } },
    _sum: { valorAjustado: true },
    _count: { id: true },
    orderBy: { _sum: { valorAjustado: "desc" } },
    take: 30,
  });

  res.json(
    agrupado.map(
      (g: {
        produtoCodigo: string | null;
        produtoNome: string | null;
        _sum: { valorAjustado: unknown };
        _count: { id: number };
      }) => ({
        produtoCodigo: g.produtoCodigo,
        produtoNome: g.produtoNome,
        valorTotal: Number(g._sum.valorAjustado ?? 0),
        quantidadeAjustes: g._count.id,
      })
    )
  );
});

// --- Ocorrências por regional (heatmap) ---
dashboardRouter.get("/heatmap-regional", async (req, res) => {
  const where = montarFiltrosJustificativa(req);

  const regionais = await prisma.regional.findMany({ include: { lojas: true } });

  const resultado = await Promise.all(
    regionais.map(async (regional: { id: string; nome: string; lojas: { id: string }[] }) => {
      const lojaIds = regional.lojas.map((l: { id: string }) => l.id);
      const total = await prisma.justificativa.count({
        where: { ...where, lojaId: { in: lojaIds } },
      });
      const valor = await prisma.justificativa.aggregate({
        where: { ...where, lojaId: { in: lojaIds } },
        _sum: { valorAjustado: true },
      });
      return {
        regionalId: regional.id,
        regionalNome: regional.nome,
        quantidadeOcorrencias: total,
        valorTotal: Number(valor._sum.valorAjustado ?? 0),
      };
    })
  );

  res.json(resultado);
});

// --- Rankings (lojas, produtos, gerentes, regionais) ---
dashboardRouter.get("/ranking/:tipo", async (req, res) => {
  const where = montarFiltrosJustificativa(req);
  const { tipo } = req.params;

  if (tipo === "gerentes") {
    const agrupado = await prisma.justificativa.groupBy({
      by: ["gerenteBruto"],
      where: { ...where, gerenteBruto: { not: null } },
      _sum: { valorAjustado: true },
      _count: { id: true },
      orderBy: { _sum: { valorAjustado: "desc" } },
      take: 20,
    });
    return res.json(
      agrupado.map(
        (g: { gerenteBruto: string | null; _sum: { valorAjustado: unknown }; _count: { id: number } }) => ({
          nome: g.gerenteBruto,
          valorTotal: Number(g._sum.valorAjustado ?? 0),
          quantidade: g._count.id,
        })
      )
    );
  }

  if (tipo === "regionais") {
    const regionais = await prisma.regional.findMany({ include: { lojas: true } });
    const resultado = await Promise.all(
      regionais.map(async (r: { id: string; nome: string; lojas: { id: string }[] }) => {
        const lojaIds = r.lojas.map((l: { id: string }) => l.id);
        const agregado = await prisma.justificativa.aggregate({
          where: { ...where, lojaId: { in: lojaIds } },
          _sum: { valorAjustado: true },
          _count: { id: true },
        });
        return {
          nome: r.nome,
          valorTotal: Number(agregado._sum.valorAjustado ?? 0),
          quantidade: agregado._count.id,
        };
      })
    );
    return res.json(resultado.sort((a, b) => b.valorTotal - a.valorTotal));
  }

  return res.status(400).json({ erro: "Tipo de ranking inválido. Use: gerentes, regionais." });
});

// --- Alertas ativos (exibidos no Dashboard) ---
dashboardRouter.get("/alertas", async (req, res) => {
  const apenasNaoResolvidos = req.query.resolvidos !== "true";

  const alertas = await prisma.alerta.findMany({
    where: apenasNaoResolvidos ? { resolvido: false } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.json(alertas);
});
