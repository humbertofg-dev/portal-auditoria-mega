import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Usuario } from "@/types";
import * as authService from "@/services/auth.service";

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
  erro: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const usuarioLocal = authService.obterUsuarioLocal();
    const token = authService.obterTokenLocal();
    if (usuarioLocal && token) {
      setUsuario(usuarioLocal);
    }
    setCarregando(false);
  }, []);

  async function entrar(email: string, senha: string) {
    setErro(null);
    try {
      const { usuario: usuarioLogado } = await authService.login(email, senha);
      setUsuario(usuarioLogado);
    } catch (e: any) {
      const mensagem = e?.response?.data?.erro ?? "Não foi possível entrar. Tente novamente.";
      setErro(mensagem);
      throw e;
    }
  }

  function sair() {
    authService.logout();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, sair, erro }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de um AuthProvider.");
  return context;
}
