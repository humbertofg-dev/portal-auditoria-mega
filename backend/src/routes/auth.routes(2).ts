import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { gerarToken, verificarSenha } from "../services/auth.service";
import { logger } from "../utils/logger";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  senha: z.string().min(1, "Senha é obrigatória."),
});

authRouter.post("/login", async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ erro: parse.error.errors[0]?.message ?? "Dados inválidos." });
  }

  const { email, senha } = parse.data;

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario || !usuario.ativo) {
    return res.status(401).json({ erro: "Credenciais inválidas." });
  }

  const senhaValida = await verificarSenha(senha, usuario.senhaHash);
  if (!senhaValida) {
    return res.status(401).json({ erro: "Credenciais inválidas." });
  }

  const token = gerarToken({
    sub: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
  });

  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoLogin: new Date() } });

  await prisma.logAcesso.create({
    data: { usuarioId: usuario.id, acao: "LOGIN", ip: req.ip },
  });

  logger.info(`Login bem-sucedido: ${usuario.email}`);

  res.json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
  });
});

authRouter.post("/logout", async (req, res) => {
  // Como o JWT é stateless, o "logout" é tratado no cliente (descarte do token).
  // Registramos o evento para fins de auditoria/log quando o usuário está identificado.
  res.json({ ok: true });
});
