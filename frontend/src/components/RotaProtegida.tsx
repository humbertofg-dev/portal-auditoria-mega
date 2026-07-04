import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PerfilUsuario } from "@/types";

export function RotaProtegida({
  children,
  perfisPermitidos,
}: {
  children: React.ReactNode;
  perfisPermitidos?: PerfilUsuario[];
}) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mega-gray-50">
        <p className="text-sm text-mega-gray-400">Carregando…</p>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (perfisPermitidos && !perfisPermitidos.includes(usuario.perfil)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-base font-semibold text-mega-black">Acesso restrito</p>
        <p className="text-sm text-mega-gray-500">Seu perfil não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return <>{children}</>;
}
