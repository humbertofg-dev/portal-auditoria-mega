import { Router } from "express";
import { z } from "zod";
import { PerfilUsuario } from "@prisma/client";
import { prisma } from "../config/prisma";
import { autenticar, autorizar } from "../middleware/auth.middleware";

export const controleDiarioRouter = Router();
controleDiarioRouter.use(autenticar);

// --- Listar controles (para histórico) ---
controleDiarioRouter.get("/", async (req, res) => {
  const { pagina = 1, porPagina = 20 } = req.query as Record<string, string>;
  const p = Math.max(1, Number(pagina));
  const pp = Math.min(100, Math.max(1, Number(porPagina)));

  const [itens, total] = await Promise.all([
    prisma.controleDiario.findMany({
      include: {
        criadoPor: { select: { id: true, nome: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { data: "desc" },
      skip: (p - 1) * pp,
      take: pp,
    }),
    prisma.controleDiario.count(),
  ]);

  res.json({ itens, paginacao: { pagina: p, porPagina: pp, total, totalPaginas: Math.ceil(total / pp) } });
});

// --- Buscar controle do dia (ou de uma data específica) ---
controleDiarioRouter.get("/hoje", async (req, res) => {
  const dataParam = req.query.data as string | undefined;
  const data = dataParam ? new Date(dataParam) : new Date();
  data.setHours(0, 0, 0, 0);

  const controle = await prisma.controleDiario.findUnique({
    where: { data },
    include: {
      criadoPor: { select: { id: true, nome: true } },
      fechadoPor: { select: { id: true, nome: true } },
      itens: {
        include: { loja: { include: { regional: true } } },
        orderBy: { loja: { nome: "asc" } },
      },
    },
  });

  if (!controle) return res.status(404).json({ erro: "Nenhum controle encontrado para esta data." });
  res.json(controle);
});

// --- Gerar controle diário ---
const gerarSchema = z.object({
  data: z.string().optional(), // ISO date, default = hoje
  lojaIds: z.array(z.string()).min(1, "Informe ao menos uma loja."),
  observacoes: z.string().optional(),
});

controleDiarioRouter.post(
  "/gerar",
  autorizar([PerfilUsuario.ADMINISTRADOR, PerfilUsuario.AUDITORIA]),
  async (req, res) => {
    const parse = gerarSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ erro: parse.error.errors[0]?.message ?? "Dados inválidos." });
    }

    const { lojaIds, observacoes } = parse.data;
    const data = parse.data.data ? new Date(parse.data.data) : new Date();
    data.setHours(0, 0, 0, 0);

    // Verifica se as lojas existem
    const lojas = await prisma.loja.findMany({ where: { id: { in: lojaIds } } });
    if (lojas.length === 0) {
      return res.status(400).json({ erro: "Nenhuma loja válida encontrada." });
    }

    // Cria ou recupera o controle do dia (upsert)
    const controle = await prisma.controleDiario.upsert({
      where: { data },
      create: {
        data,
        criadoPorId: req.usuario!.sub,
        observacoes,
      },
      update: { observacoes },
    });

    // Cria itens apenas para lojas ainda não incluídas (sem duplicar)
    const itensExistentes = await prisma.itemControleDiario.findMany({
      where: { controleDiarioId: controle.id },
      select: { lojaId: true },
    });
    const lojaIdsExistentes = new Set(itensExistentes.map((i: { lojaId: string }) => i.lojaId));
    const lojasNovas = lojas.filter((l: { id: string }) => !lojaIdsExistentes.has(l.id));

    if (lojasNovas.length > 0) {
      await prisma.itemControleDiario.createMany({
        data: lojasNovas.map((l: { id: string }) => ({
          controleDiarioId: controle.id,
          lojaId: l.id,
        })),
      });
    }

    const controleAtualizado = await prisma.controleDiario.findUnique({
      where: { id: controle.id },
      include: {
        itens: { include: { loja: { include: { regional: true } } }, orderBy: { loja: { nome: "asc" } } },
        criadoPor: { select: { id: true, nome: true } },
      },
    });

    res.status(201).json(controleAtualizado);
  }
);

// --- Importar lojas via lista de códigos (vinda de Excel/CSV já parseado no frontend) ---
controleDiarioRouter.post(
  "/importar-lojas",
  autorizar([PerfilUsuario.ADMINISTRADOR, PerfilUsuario.AUDITORIA]),
  async (req, res) => {
    const { codigos } = req.body as { codigos: string[] };
    if (!codigos?.length) {
      return res.status(400).json({ erro: "Nenhum código informado." });
    }

    const lojas = await prisma.loja.findMany({
      where: { codigo: { in: codigos.map((c: string) => c.trim()) } },
      select: { id: true, codigo: true, nome: true },
    });

    const codigosEncontrados = new Set(lojas.map((l: { codigo: string }) => l.codigo));
    const naoEncontrados = codigos.filter((c: string) => !codigosEncontrados.has(c.trim()));

    res.json({ lojas, naoEncontrados });
  }
);

// --- Alterar status de um item manualmente ---
const statusSchema = z.object({
  status: z.enum(["AGUARDANDO_JUSTIFICATIVA", "JUSTIFICATIVA_RECEBIDA", "EM_ANALISE", "CONCLUIDA", "CANCELADA"]),
  observacoes: z.string().optional(),
});

controleDiarioRouter.patch(
  "/item/:itemId/status",
  autorizar([PerfilUsuario.ADMINISTRADOR, PerfilUsuario.AUDITORIA]),
  async (req, res) => {
    const parse = statusSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ erro: parse.error.errors[0]?.message ?? "Dados inválidos." });
    }

    const item = await prisma.itemControleDiario.findUnique({ where: { id: req.params.itemId } });
    if (!item) return res.status(404).json({ erro: "Item não encontrado." });

    const atualizado = await prisma.itemControleDiario.update({
      where: { id: req.params.itemId },
      data: {
        status: parse.data.status,
        observacoes: parse.data.observacoes,
        horaConclusao:
          parse.data.status === "CONCLUIDA" ? new Date() : item.horaConclusao,
      },
      include: { loja: { include: { regional: true } } },
    });

    res.json(atualizado);
  }
);

// --- Fechar o dia ---
controleDiarioRouter.post(
  "/:id/fechar",
  autorizar([PerfilUsuario.ADMINISTRADOR, PerfilUsuario.AUDITORIA]),
  async (req, res) => {
    const controle = await prisma.controleDiario.findUnique({
      where: { id: req.params.id },
      include: { itens: true },
    });

    if (!controle) return res.status(404).json({ erro: "Controle não encontrado." });
    if (controle.fechado) return res.status(409).json({ erro: "Este controle já foi fechado." });

    const total = controle.itens.length;
    const recebidas = controle.itens.filter((i: any) =>
      ["JUSTIFICATIVA_RECEBIDA", "EM_ANALISE", "CONCLUIDA"].includes(i.status)
    ).length;
    const concluidas = controle.itens.filter((i: any) => i.status === "CONCLUIDA").length;
    const canceladas = controle.itens.filter((i: any) => i.status === "CANCELADA").length;
    const pendentes = controle.itens.filter((i: any) => i.status === "AGUARDANDO_JUSTIFICATIVA").length;

    // Tempo médio de envio (do início do controle até recebimento)
    const itensComEnvio = controle.itens.filter((i: any) => i.horaEnvio);
    const tempoMedioEnvio = itensComEnvio.length
      ? itensComEnvio.reduce((acc: number, i: any) => {
          return acc + (new Date(i.horaEnvio).getTime() - new Date(controle.createdAt).getTime());
        }, 0) / itensComEnvio.length / 60000
      : null;

    // Tempo médio de análise (do recebimento até conclusão)
    const itensComConclusao = controle.itens.filter((i: any) => i.horaEnvio && i.horaConclusao);
    const tempoMedioAnalise = itensComConclusao.length
      ? itensComConclusao.reduce((acc: number, i: any) => {
          return acc + (new Date(i.horaConclusao).getTime() - new Date(i.horaEnvio).getTime());
        }, 0) / itensComConclusao.length / 60000
      : null;

    const valorTotal = controle.itens.reduce(
      (acc: number, i: any) => acc + Number(i.valorInformado ?? 0),
      0
    );

    const agora = new Date();

    const [controleAtualizado] = await prisma.$transaction([
      prisma.controleDiario.update({
        where: { id: controle.id },
        data: { fechado: true, fechadoEm: agora, fechadoPorId: req.usuario!.sub },
      }),
      prisma.historicoControleDiario.create({
        data: {
          controleDiarioId: controle.id,
          dataControle: controle.data,
          totalObrigatorias: total,
          totalRecebidas: recebidas,
          totalPendentes: pendentes,
          totalConcluidas: concluidas,
          totalCanceladas: canceladas,
          percentualAtendimento: total > 0 ? (recebidas / total) * 100 : 0,
          tempoMedioEnvioMin: tempoMedioEnvio,
          tempoMedioAnaliseMin: tempoMedioAnalise,
          valorTotalInformado: valorTotal,
          fechadoEm: agora,
        },
      }),
    ]);

    res.json(controleAtualizado);
  }
);

// --- Histórico de fechamentos ---
controleDiarioRouter.get("/historico", async (_req, res) => {
  const historicos = await prisma.historicoControleDiario.findMany({
    orderBy: { dataControle: "desc" },
    take: 90, // últimos 90 dias
  });
  res.json(historicos);
});

// --- Dashboard do controle diário ---
controleDiarioRouter.get("/:id/dashboard", async (req, res) => {
  const controle = await prisma.controleDiario.findUnique({
    where: { id: req.params.id },
    include: { itens: { include: { loja: { include: { regional: true } } } } },
  });

  if (!controle) return res.status(404).json({ erro: "Controle não encontrado." });

  const total = controle.itens.length;
  const recebidas = controle.itens.filter((i: any) =>
    ["JUSTIFICATIVA_RECEBIDA", "EM_ANALISE", "CONCLUIDA"].includes(i.status)
  ).length;
  const concluidas = controle.itens.filter((i: any) => i.status === "CONCLUIDA").length;
  const emAnalise = controle.itens.filter((i: any) => i.status === "EM_ANALISE").length;
  const pendentes = controle.itens.filter((i: any) => i.status === "AGUARDANDO_JUSTIFICATIVA").length;
  const percentual = total > 0 ? Math.round((recebidas / total) * 100) : 0;

  const valorTotal = controle.itens.reduce(
    (acc: number, i: any) => acc + Number(i.valorInformado ?? 0), 0
  );

  const itensComEnvio = controle.itens.filter((i: any) => i.horaEnvio);
  const tempoMedioEnvio = itensComEnvio.length
    ? itensComEnvio.reduce((acc: number, i: any) =>
        acc + (new Date(i.horaEnvio).getTime() - new Date(controle.createdAt).getTime()), 0
      ) / itensComEnvio.length / 60000
    : null;

  const itensComConclusao = controle.itens.filter((i: any) => i.horaEnvio && i.horaConclusao);
  const tempoMedioAnalise = itensComConclusao.length
    ? itensComConclusao.reduce((acc: number, i: any) =>
        acc + (new Date(i.horaConclusao).getTime() - new Date(i.horaEnvio).getTime()), 0
      ) / itensComConclusao.length / 60000
    : null;

  res.json({
    total,
    recebidas,
    concluidas,
    emAnalise,
    pendentes,
    percentual,
    valorTotal,
    tempoMedioEnvioMin: tempoMedioEnvio ? Math.round(tempoMedioEnvio) : null,
    tempoMedioAnaliseMin: tempoMedioAnalise ? Math.round(tempoMedioAnalise) : null,
    todasEnviaram: pendentes === 0,
    fechado: controle.fechado,
  });
});
