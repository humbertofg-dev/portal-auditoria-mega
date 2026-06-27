import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
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
  // O tipo de "expiresIn" da lib jsonwebtoken aceita apenas strings literais
  // conhecidas (ex: "1h", "7d") ou número de segundos — não "string" genérico.
  // Como o valor vem de uma variável de ambiente (sempre string em runtime),
  // o cast abaixo é seguro: o formato é validado pela própria lib em tempo de
  // execução, e o valor padrão ("8h") já está documentado em .env.example.
  const opcoes: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, opcoes);
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
