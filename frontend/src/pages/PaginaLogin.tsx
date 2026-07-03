import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function PaginaLogin() {
  const { entrar, usuario, erro } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  async function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch {
      // erro já tratado no contexto
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mega-black px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-mega-red-500 text-base font-bold text-white">
            MA
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white">Portal Auditoria MEGA</h1>
            <p className="text-2xs text-mega-gray-400">Acesso restrito à equipe de Auditoria</p>
          </div>
        </div>

        <form onSubmit={aoSubmeter} className="rounded-card border border-white/10 bg-mega-gray-900 p-6">
          <div className="mb-4">
            <label className="mb-1.5 block text-2xs font-semibold uppercase tracking-wide text-mega-gray-400">
              E-mail corporativo
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mega-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@megathorra.com.br"
                className="w-full rounded-md border border-white/10 bg-mega-black py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-mega-gray-500 focus:border-mega-red-500"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-2xs font-semibold uppercase tracking-wide text-mega-gray-400">
              Senha
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mega-gray-500" />
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-white/10 bg-mega-black py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-mega-gray-500 focus:border-mega-red-500"
              />
            </div>
          </div>

          {erro && (
            <p className="mb-4 rounded-md bg-mega-red-500/10 px-3 py-2 text-2xs text-mega-red-400">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-md bg-mega-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-mega-red-600 disabled:opacity-60"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-5 text-center text-2xs text-mega-gray-500">
          As lojas registram justificativas exclusivamente pelo Google Forms.
        </p>
      </div>
    </div>
  );
}
