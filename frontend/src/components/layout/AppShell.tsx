import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

const TITULOS: Record<string, string> = {
  "/": "Dashboard",
  "/justificativas": "Justificativas",
  "/pendencias": "Pendências",
  "/controle-diario": "Central de Controle Diário",
  "/relatorios": "Relatórios",
  "/indicadores": "Indicadores",
  "/ranking": "Ranking",
  "/produtos": "Produtos",
  "/lojas": "Lojas",
  "/regionais": "Regionais",
  "/usuarios": "Usuários",
  "/configuracoes": "Configurações",
  "/logs": "Logs",
};

export function AppShell() {
  const { pathname } = useLocation();
  const titulo = TITULOS[pathname] ?? "Portal Auditoria MEGA";

  return (
    <div className="min-h-screen bg-mega-gray-50">
      <Sidebar />
      <div className="ml-60 flex min-h-screen flex-col">
        <Topbar titulo={titulo} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
