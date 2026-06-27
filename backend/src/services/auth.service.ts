import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { PerfilUsuario } from "@prisma/client";

export interface TokenPayload {
  sub: string; // id do usuário
  nome: string;
  email: string;
  perfil: PerfilUsuario;
}

export async function gerarHashSenha(senha: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(senha, salt);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export function gerarToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

// Hierarquia de permissões: define o que cada perfil pode fazer.
// CONSULTA  -> apenas leitura de dashboards e justificativas
// AUDITORIA -> leitura + pode analisar/alterar status de justificativas
// ADMINISTRADOR -> tudo, incluindo gestão de usuários e configurações
export const PERMISSOES = {
  PODE_ANALISAR_JUSTIFICATIVA: [PerfilUsuario.AUDITORIA, PerfilUsuario.ADMINISTRADOR],
  PODE_GERENCIAR_USUARIOS: [PerfilUsuario.ADMINISTRADOR],
  PODE_ALTERAR_CONFIGURACOES: [PerfilUsuario.ADMINISTRADOR],
  PODE_EXPORTAR_RELATORIOS: [
    PerfilUsuario.CONSULTA,
    PerfilUsuario.AUDITORIA,
    PerfilUsuario.ADMINISTRADOR,
  ],
} as const;
