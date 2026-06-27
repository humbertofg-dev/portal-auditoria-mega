import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  FileBarChart,
  Gauge,
  Trophy,
  Package,
  Store,
  MapPinned,
  Users,
  Settings,
  ScrollText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ItemMenu {
  rotulo: string;
  caminho: string;
  icone: React.ComponentType<{ size?: number; className?: string }>;
  apenasAdmin?: boolean;
}

const ITENS_MENU: ItemMenu[] = [
  { rotulo: "Dashboard", caminho: "/", icone: LayoutDashboard },
  { rotulo: "Justificativas", caminho: "/justificativas", icone: ClipboardList },
  { rotulo: "Pendências", caminho: "/pendencias", icone: Clock },
  { rotulo: "Relatórios", caminho: "/relatorios", icone: FileBarChart },
  { rotulo: "Indicadores", caminho: "/indicadores", icone: Gauge },
  { rotulo: "Ranking", caminho: "/ranking", icone: Trophy },
  { rotulo: "Produtos", caminho: "/produtos", icone: Package },
  { rotulo: "Lojas", caminho: "/lojas", icone: Store },
  { rotulo: "Regionais", caminho: "/regionais", icone: MapPinned },
  { rotulo: "Usuários", caminho: "/usuarios", icone: Users, apenasAdmin: true },
  { rotulo: "Configurações", caminho: "/configuracoes", icone: Settings, apenasAdmin: true },
  { rotulo: "Logs", caminho: "/logs", icone: ScrollText, apenasAdmin: true },
];

export function Sidebar() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.perfil === "ADMINISTRADOR";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-mega-gray-200 bg-mega-black">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-mega-red-500 text-sm font-bold text-white">
          MA
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Portal Auditoria</p>
          <p className="text-2xs font-medium uppercase tracking-wider text-mega-gray-400">Mega</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {ITENS_MENU.filter((item) => !item.apenasAdmin || ehAdmin).map((item) => {
            const Icone = item.icone;
            return (
              <li key={item.caminho}>
                <NavLink
                  to={item.caminho}
                  end={item.caminho === "/"}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-mega-red-500 text-white"
                        : "text-mega-gray-300 hover:bg-white/5 hover:text-white",
                    ].join(" ")
                  }
                >
                  <Icone size={17} className="shrink-0" />
                  <span>{item.rotulo}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-2xs text-mega-gray-500">Portal Auditoria MEGA · v1.0</p>
      </div>
    </aside>
  );
}
