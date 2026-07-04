import { api } from "@/services/api";
import { Usuario } from "@/types";

interface RespostaLogin {
  token: string;
  usuario: Usuario;
}

export async function login(email: string, senha: string): Promise<RespostaLogin> {
  const { data } = await api.post<RespostaLogin>("/auth/login", { email, senha });
  localStorage.setItem("portal-auditoria-token", data.token);
  localStorage.setItem("portal-auditoria-usuario", JSON.stringify(data.usuario));
  return data;
}

export function logout(): void {
  localStorage.removeItem("portal-auditoria-token");
  localStorage.removeItem("portal-auditoria-usuario");
}

export function obterUsuarioLocal(): Usuario | null {
  const bruto = localStorage.getItem("portal-auditoria-usuario");
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as Usuario;
  } catch {
    return null;
  }
}

export function obterTokenLocal(): string | null {
  return localStorage.getItem("portal-auditoria-token");
}
