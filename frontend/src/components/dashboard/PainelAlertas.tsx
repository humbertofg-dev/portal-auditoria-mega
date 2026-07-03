import { AlertTriangle, TrendingUp, Clock3, Repeat } from "lucide-react";
import { Alerta, TipoAlerta } from "@/types";
import { formatarDataHora } from "@/utils/formatadores";

const ICONE_POR_TIPO: Record<TipoAlerta, React.ComponentType<{ size?: number; className?: string }>> = {
  VALOR_DIARIO_EXCEDIDO: AlertTriangle,
  FREQUENCIA_MENSAL_EXCEDIDA: Repeat,
  PENDENCIA_PROLONGADA: Clock3,
  CRESCIMENTO_REGIONAL: TrendingUp,
};

const COR_POR_SEVERIDADE: Record<string, string> = {
  CRITICO: "border-mega-red-200 bg-mega-red-50",
  ATENCAO: "border-amber-200 bg-amber-50",
  INFO: "border-mega-gray-200 bg-mega-gray-50",
};

const COR_ICONE_POR_SEVERIDADE: Record<string, string> = {
  CRITICO: "text-mega-red-500",
  ATENCAO: "text-amber-500",
  INFO: "text-mega-gray-500",
};

export function PainelAlertas({ alertas, carregando }: { alertas: Alerta[] | null; carregando: boolean }) {
  return (
    <div className="mega-card flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-mega-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-mega-black">Alertas Automáticos</h3>
        {alertas && alertas.length > 0 && (
          <span className="mega-badge bg-mega-red-50 text-mega-red-600">{alertas.length} ativos</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {carregando && (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-mega-gray-100" />
            ))}
          </div>
        )}

        {!carregando && alertas?.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-mega-gray-600">Nenhum alerta ativo</p>
            <p className="text-2xs text-mega-gray-400">Tudo dentro dos parâmetros esperados.</p>
          </div>
        )}

        {!carregando &&
          alertas?.map((alerta) => {
            const Icone = ICONE_POR_TIPO[alerta.tipo];
            return (
              <div
                key={alerta.id}
                className={`mb-2 rounded-md border px-3 py-2.5 ${COR_POR_SEVERIDADE[alerta.severidade]}`}
              >
                <div className="flex items-start gap-2.5">
                  <Icone size={16} className={`mt-0.5 shrink-0 ${COR_ICONE_POR_SEVERIDADE[alerta.severidade]}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-mega-black">{alerta.titulo}</p>
                    <p className="mt-0.5 text-2xs text-mega-gray-600">{alerta.descricao}</p>
                    <p className="mt-1 text-2xs text-mega-gray-400">{formatarDataHora(alerta.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
