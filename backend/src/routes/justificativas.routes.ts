import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/config/prisma";
import { autenticar, autorizar } from "@/middleware/auth.middleware";
import { PERMISSOES } from "@/services/auth.service";
import { montarFiltrosJustificativa } from "@/utils/filtros";

export const justificativasRouter = Router();

justificativasRouter.use(autenticar);

// --- Listagem com filtros, busca, ordenação e paginação ---
justificativasRouter.get("/", async (req, res) => {
  const where = montarFiltrosJustificativa(req);

  const pagina = Math.max(1, Number(req.query.pagina ?? 1));
  const porPagina = Math.min(100, Math.max(1, Number(req.query.porPagina ?? 20)));
  const ordenarPor = String(req.query.ordenarPor ?? "dataEnvio");
  const ordem = req.query.ordem === "asc" ? "asc" : "desc";

  const camposOrdenaveis = ["dataEnvio", "valorAjustado", "status", "nivelRisco", "createdAt"];
  const campoFinal = camposOrdenaveis.includes(ordenarPor) ? ordenarPor : "dataEnvio";

  const [itens, total] = await Promise.all([
    prisma.justificativa.findMany({
      where,
      include: { loja: { include: { regional: true } } },
      orderBy: { [campoFinal]: ordem },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.justificativa.count({ where }),
  ]);

  res.json({
    itens,
    paginacao: {
      pagina,
      porPagina,
      total,
      totalPaginas: Math.ceil(total / porPagina),
    },
  });
});

// --- Detalhamento completo ---
justificativasRouter.get("/:id", async (req, res) => {
  const justificativa = await prisma.justificativa.findUnique({
    where: { id: req.params.id },
    include: {
      loja: { include: { regional: true } },
      historico: { orderBy: { createdAt: "asc" } },
      analises: { include: { auditor: { select: { id: true, nome: true } } }, orderBy: { createdAt: "desc" } },
      comentarios: { include: { usuario: { select: { id: true, nome: true } } }, orderBy: { createdAt: "asc" } },
      alertas: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!justificativa) {
    return res.status(404).json({ erro: "Justificativa não encontrada." });
  }

  res.json(justificativa);
});

// --- Análise da Auditoria (alterar status, registrar parecer) ---
const analiseSchema = z.object({
  status: z.enum(["EM_ANALISE", "APROVADO", "REPROVADO", "SOLICITADO_COMPLEMENTACAO"]),
  parecerTecnico: z.string().min(1, "O parecer técnico é obrigatório."),
  observacoes: z.string().optional(),
});

justificativasRouter.post(
  "/:id/analise",
  autorizar(PERMISSOES.PODE_ANALISAR_JUSTIFICATIVA),
  async (req, res) => {
    const parse = analiseSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ erro: parse.error.errors[0]?.message ?? "Dados inválidos." });
    }

    const justificativa = await prisma.justificativa.findUnique({ where: { id: req.params.id } });
    if (!justificativa) {
      return res.status(404).json({ erro: "Justificativa não encontrada." });
    }

    const { status, parecerTecnico, observacoes } = parse.data;
    const auditorId = req.usuario!.sub;

    const [analise] = await prisma.$transaction([
      prisma.analiseAuditoria.create({
        data: { justificativaId: justificativa.id, auditorId, status, parecerTecnico, observacoes },
      }),
      prisma.justificativa.update({
        where: { id: justificativa.id },
        data: {
          status,
          dataPrimeiraAnalise: justificativa.dataPrimeiraAnalise ?? new Date(),
          dataConclusao: ["APROVADO", "REPROVADO"].includes(status) ? new Date() : undefined,
        },
      }),
      prisma.historicoStatus.create({
        data: {
          justificativaId: justificativa.id,
          statusAnterior: justificativa.status,
          statusNovo: status,
          usuarioId: auditorId,
          observacao: observacoes,
        },
      }),
    ]);

    await prisma.logAcesso.create({
      data: {
        usuarioId: auditorId,
        acao: "ALTEROU_STATUS",
        entidade: "Justificativa",
        entidadeId: justificativa.id,
        detalhes: JSON.stringify({ statusAnterior: justificativa.status, statusNovo: status }),
        ip: req.ip,
      },
    });

    res.status(201).json(analise);
  }
);

// --- Comentários ---
const comentarioSchema = z.object({ texto: z.string().min(1, "Comentário não pode ser vazio.") });

justificativasRouter.post("/:id/comentarios", async (req, res) => {
  const parse = comentarioSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ erro: parse.error.errors[0]?.message ?? "Dados inválidos." });
  }

  const justificativa = await prisma.justificativa.findUnique({ where: { id: req.params.id } });
  if (!justificativa) {
    return res.status(404).json({ erro: "Justificativa não encontrada." });
  }

  const comentario = await prisma.comentario.create({
    data: {
      justificativaId: justificativa.id,
      usuarioId: req.usuario!.sub,
      texto: parse.data.texto,
    },
    include: { usuario: { select: { id: true, nome: true } } },
  });

  res.status(201).json(comentario);
});
