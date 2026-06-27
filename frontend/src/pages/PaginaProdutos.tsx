import { useState } from "react";
import { Package } from "lucide-react";
import { BarraFiltros } from "@/components/ui/BarraFiltros";
import { usePolling } from "@/hooks/usePolling";
import * as dashboardService from "@/services/dashboard.service";
import { FiltrosGlobais } from "@/types";
import { formatarMoeda } from "@/utils/formatadores";

export function PaginaProdutos() {
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});

  const { dados: produtos, carregando } = usePolling(
    () => dashboardService.buscarProdutosAjustados(filtros),
    [filtros],
    { intervaloMs: 20000 }
  );

  return (
    <div className="flex flex-col gap-4">
      <BarraFiltros filtros={filtros} onChange={setFiltros} />

      <div className="mega-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-mega-gray-200 bg-mega-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                Produto
              </th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                Código
              </th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                Valor Total Ajustado
              </th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                Qtd. de Ajustes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mega-gray-100">
            {carregando &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-mega-gray-100" />
                  </td>
                </tr>
              ))}

            {!carregando &&
              (produtos ?? []).map((p) => (
                <tr key={p.produtoCodigo} className="hover:bg-mega-gray-50">
                  <td className="px-4 py-3 font-medium text-mega-black">
                    <span className="flex items-center gap-2">
                      <Package size={14} className="text-mega-gray-400" />
                      {p.produtoNome ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mega-gray-600">{p.produtoCodigo}</td>
                  <td className="px-4 py-3 tabular-nums text-mega-black">
                    {formatarMoeda(p.valorTotal)}
                  </td>
                  <td className="px-4 py-3 text-mega-gray-600">{p.quantidadeAjustes}</td>
                </tr>
              ))}

            {!carregando && (produtos ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-mega-gray-400">
                  Nenhum produto ajustado para os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
