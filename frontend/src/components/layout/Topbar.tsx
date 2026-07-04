import { useState } from "react";
import { Bell, ChevronDown, LogOut, RefreshCw, Wifi } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/services/api";
import { formatarDataHora } from "@/utils/formatadores";

interface StatusSync {
  ultimaSincronia: string | null;
  ultimoStatus: string | null;
}

export function Topbar({ titulo }: { titulo: string }) {
  const { usuario, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  const { dados: statusSync } = usePolling<StatusSync>(
    async () => {
      const { data } = await api.get("/sync/status");
      return data;
    },
    [],
    { intervaloMs: 15000 }
  );

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-mega-gray-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-mega-black">{titulo}</h1>
      </div>

      <div className="flex items-center gap-4">
        <IndicadorSincronizacao status={statusSync} />

        <button
          className="relative rounded-md p-2 text-mega-gray-500 transition-colors hover:bg-mega-gray-100 hover:text-mega-black"
          aria-label="Notificações"
        >
          <Bell size={18} />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuAberto((v) => !v)}
            className="flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-2 transition-colors hover:bg-mega-gray-100"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mega-red-500 text-xs font-semibold text-white">
              {usuario?.nome?.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left leading-tight">
              <p className="text-sm font-medium text-mega-black">{usuario?.nome}</p>
              <p className="text-2xs text-mega-gray-500">{rotuloPerfil(usuario?.perfil)}</p>
            </div>
            <ChevronDown size={14} className="text-mega-gray-400" />
          </button>

          {menuAberto && (
            <div className="absolute right-0 top-full mt-1 w-48 animate-slide-in rounded-card border border-mega-gray-200 bg-white py-1 shadow-popover">
              <button
                onClick={sair}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-mega-gray-700 hover:bg-mega-gray-50"
              >
                <LogOut size={15} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function IndicadorSincronizacao({ status }: { status: StatusSync | null }) {
  if (!status?.ultimaSincronia) {
    return (
      <span className="flex items-center gap-1.5 text-2xs text-mega-gray-400">
        <RefreshCw size={13} />
        Sincronizando…
      </span>
    );
  }

  const ok = status.ultimoStatus === "SUCESSO";

  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-mega-gray-50 px-2.5 py-1 text-2xs font-medium text-mega-gray-600"
      title={`Última sincronização: ${formatarDataHora(status.ultimaSincronia)}`}
    >
      <Wifi size={13} className={ok ? "text-emerald-500" : "text-amber-500"} />
      Atualizado às {new Date(status.ultimaSincronia).toLocaleTimeString("pt-BR")}
    </div>
  );
}

function rotuloPerfil(perfil?: string) {
  if (perfil === "ADMINISTRADOR") return "Administrador";
  if (perfil === "AUDITORIA") return "Auditoria";
  if (perfil === "CONSULTA") return "Consulta";
  return "";
}
