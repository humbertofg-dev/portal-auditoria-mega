import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { autenticar, autorizar } from "../middleware/auth.middleware";
import { PerfilUsuario } from "@prisma/client";

export const lojasRouter = Router();
export const regionaisRouter = Router();

lojasRouter.use(autenticar);
regionaisRouter.use(autenticar);

// ----------------------------------------------------------------------------
// LOJAS
// Importante: o Portal não tem telas de preenchimento PARA as lojas (elas só
// usam o Forms). Estas rotas são para a Auditoria/Admin manterem o cadastro
// de lojas e regionais, que é usado para o "match" automático das respostas
// do Sheets (ver sheets-sync.service.ts) e para os filtros e agrupamentos.
// ----------------------------------------------------------------------------

lojasRouter.get("/", async (req, res) => {
  const { regionalId, busca } = req.query as Record<string, string | undefined>;

  const lojas = await prisma.loja.findMany({
    where: {
      ...(regionalId ? { regionalId } : {}),
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca, mode: "insensitive" } },
              { codigo: { contains: busca, mode: "insensitive" } },
              { cidade: { contains: busca, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { regional: true, _count: { select: { justificativas: true } } },
    orderBy: { nome: "asc" },
  });

  res.json(lojas);
});

lojasRouter.get("/:id", async (req, res) => {
  const loja = await prisma.loja.findUnique({
    where: { id: req.params.id },
    include: { regional: true },
  });
  if (!loja) return res.status(404).json({ erro: "Loja não encontrada." });
  res.json(loja);
});

const lojaSchema = z.object({
  codigo: z.string().min(1),
  nome: z.string().min(1),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  regionalId: z.string().optional(),
  gerente: z.string().optional(),
});

lojasRouter.post("/", autorizar([PerfilUsuario.ADMINISTRADOR]), async (req, res) => {
  const parse = lojaSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ erro: parse.error.errors[0]?.message ?? "Dados inválidos." });
  }
  const loja = await prisma.loja.create({ data: parse.data });
  res.status(201).json(loja);
});

lojasRouter.put("/:id", autorizar([PerfilUsuario.ADMINISTRADOR]), async (req, res) => {
  const parse = lojaSchema.partial().safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ erro: parse.error.errors[0]?.message ?? "Dados inválidos." });
  }
  const loja = await prisma.loja.update({ where: { id: req.params.id }, data: parse.data });
  res.json(loja);
});

// ----------------------------------------------------------------------------
// REGIONAIS
// Cada Regional agrupa um conjunto de Lojas e pode ter um responsável
// (usuário do Portal) designado. A exclusão é bloqueada enquanto houver
// lojas vinculadas, para evitar lojas "órfãs" silenciosamente.
// ----------------------------------------------------------------------------

regionaisRouter.get("/", async (_req, res) => {
  const regionais = await prisma.regional.findMany({
    include: {
      _count: { select: { lojas: true } },
      responsavel: { select: { id: true, nome: true, email: true } },
    },
    orderBy: { nome: "asc" },
  });
  res.json(regionais);
});

// Detalhe de uma regional, incluindo a lista completa de lojas do grupo —
// usado na tela de edição para exibir/gerenciar o "grupo de lojas".
regionaisRouter.get("/:id", async (req, res) => {
  const regional = await prisma.regional.findUnique({
    where: { id: req.params.id },
    include: {
      responsavel: { select: { id: true, nome: true, email: true } },
      lojas: { orderBy: { nome: "asc" } },
    },
  });
  if (!regional) return res.status(404).json({ erro: "Regional não encontrada." });
  res.json(regional);
});

const regionalSchema = z.object({
  nome: z.string().min(1),
  codigo: z.string().optional(),
  responsavelId: z.string().nullable().optional(),
});

regionaisRouter.post("/", autorizar([PerfilUsuario.ADMINISTRADOR]), async (req, res) => {
  const parse = regionalSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ erro: parse.error.errors[0]?.message ?? "Dados inválidos." });
  }
  const regional = await prisma.regional.create({ data: parse.data });
  res.status(201).json(regional);
});

regionaisRouter.put("/:id", autorizar([PerfilUsuario.ADMINISTRADOR]), async (req, res) => {
  const parse = regionalSchema.partial().safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ erro: parse.error.errors[0]?.message ?? "Dados inválidos." });
  }

  const regionalExistente = await prisma.regional.findUnique({ where: { id: req.params.id } });
  if (!regionalExistente) {
    return res.status(404).json({ erro: "Regional não encontrada." });
  }

  const regional = await prisma.regional.update({ where: { id: req.params.id }, data: parse.data });
  res.json(regional);
});

regionaisRouter.delete("/:id", autorizar([PerfilUsuario.ADMINISTRADOR]), async (req, res) => {
  const regional = await prisma.regional.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { lojas: true } } },
  });

  if (!regional) {
    return res.status(404).json({ erro: "Regional não encontrada." });
  }

  if (regional._count.lojas > 0) {
    return res.status(409).json({
      erro: `Não é possível excluir: existem ${regional._count.lojas} loja(s) vinculada(s) a esta regional. Mova ou desvincule as lojas primeiro.`,
    });
  }

  await prisma.regional.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
