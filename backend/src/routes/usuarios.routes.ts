import { Router } from "express";
import { z } from "zod";
import { PerfilUsuario } from "@prisma/client";
import { prisma } from "@/config/prisma";
import { autenticar, autorizar } from "@/middleware/auth.middleware";
import { gerarHashSenha } from "@/services/auth.service";

export const usuariosRouter = Router();

usuariosRouter.use(autenticar);

usuariosRouter.get("/", autorizar([PerfilUsuario.ADMINISTRADOR]), async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      ativo: true,
      ultimoLogin: true,
      createdAt: true,
    },
    orderBy: { nome: "asc" },
  });
  res.json(usuarios);
});

// Usuário autenticado pode ver seu próprio perfil
usuariosRouter.get("/me", async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario!.sub },
    select: { id: true, nome: true, email: true, perfil: true, ultimoLogin: true },
  });
  res.json(usuario);
});

const criarUsuarioSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
  perfil: z.enum(["ADMINISTRADOR", "AUDITORIA", "CONSULTA"]),
});

usuariosRouter.post("/", autorizar([PerfilUsuario.ADMINISTRADOR]), async (req, res) => {
  const parse = criarUsuarioSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ erro: parse.error.errors[0]?.message ?? "Dados inválidos." });
  }

  const existente = await prisma.usuario.findUnique({ where: { email: parse.data.email } });
  if (existente) {
    return res.status(409).json({ erro: "Já existe um usuário com este e-mail." });
  }

  const senhaHash = await gerarHashSenha(parse.data.senha);

  const usuario = await prisma.usuario.create({
    data: {
      nome: parse.data.nome,
      email: parse.data.email,
      perfil: parse.data.perfil,
      senhaHash,
    },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
  });

  res.status(201).json(usuario);
});

const atualizarUsuarioSchema = z.object({
  nome: z.string().min(1).optional(),
  perfil: z.enum(["ADMINISTRADOR", "AUDITORIA", "CONSULTA"]).optional(),
  ativo: z.boolean().optional(),
  novaSenha: z.string().min(8).optional(),
});

usuariosRouter.put("/:id", autorizar([PerfilUsuario.ADMINISTRADOR]), async (req, res) => {
  const parse = atualizarUsuarioSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ erro: parse.error.errors[0]?.message ?? "Dados inválidos." });
  }

  const { novaSenha, ...resto } = parse.data;

  const usuario = await prisma.usuario.update({
    where: { id: req.params.id },
    data: {
      ...resto,
      ...(novaSenha ? { senhaHash: await gerarHashSenha(novaSenha) } : {}),
    },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
  });

  res.json(usuario);
});
