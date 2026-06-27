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
// ----------------------------------------------------------------------------

regionaisRouter.get("/", async (_req, res) => {
  const regionais = await prisma.regional.findMany({
    include: { _count: { select: { lojas: true } } },
    orderBy: { nome: "asc" },
  });
  res.json(regionais);
});

const regionalSchema = z.object({
  nome: z.string().min(1),
  codigo: z.string().optional(),
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
  const regional = await prisma.regional.update({ where: { id: req.params.id }, data: parse.data });
  res.json(regional);
});
