import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Package } from "lucide-react";
import { BarraFiltros } from "@/components/ui/BarraFiltros";
import { usePolling } from "@/hooks/usePolling";
import * as dashboardService from "@/services/dashboard.service";
import { FiltrosGlobais, ProdutoAgregado } from "@/types";
import { formatarMoeda } from "@/utils/formatadores";
import { api } from "@/services/api";

const CORES = ["#B3001B", "#960017", "#760012", "#D8404F", "#E8717E", "#56000D", "#F2A3AC"];

type VisualizacaoGrafico = "geral" | "loja" | "regional";

export function PaginaProdutos() {
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});
  const [visualizacao, setVisualizacao] = useState<VisualizacaoGrafico>("geral");

  const { dados: produtos, carregando } = usePolling(
    () => dashboardService.buscarProdutosAjustados(filtros),
    [filtros],
    { intervaloMs: 20000 }
  );

  // Dados para o gráfico por loja — agrupamento feito no backend via top-lojas
  const { dados: topLojas } = usePolling(
    () => dashboardService.buscarTopLojas(filtros),
    [filtros],
    { intervaloMs: 20000, ativo: visualizacao === "loja" }
  );

  // Dados para o gráfico por regional — via heatmap já existente
  const { dados: heatmapRegional } = usePolling(
    () => dashboardService.buscarHeatmapRegional(filtros),
    [filtros],
    { intervaloMs: 20000, ativo: visualizacao === "regional" }
  );

  const dadosGraficoGeral = (produtos ?? []).slice(0, 15).map((p) => ({
    nome: p.produtoNome ?? p.produtoCodigo,
    valor: p.valorTotal,
    quantidade: p.quantidadeAjustes,
  }));

  const dadosGraficoLoja = (topLojas ?? []).slice(0, 15).map((l) => ({
    nome: l.lojaNome,
    valor: l.valorTotal,
    quantidade: l.quantidadeAjustes,
  }));

  const dadosGraficoRegional = (heatmapRegional ?? [])
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .map((r) => ({
      nome: r.regionalNome,
      valor: r.valorTotal,
      quantidade: r.quantidadeOcorrencias,
    }));

  const dadosAtivos =
    visualizacao === "geral"
      ? dadosGraficoGeral
      : visualizacao === "loja"
      ? dadosGraficoLoja
      : dadosGraficoRegional;

  const tituloGrafico =
    visualizacao === "geral"
      ? "Top 15 Produtos Mais Ajustados (Valor Total)"
      : visualizacao === "loja"
      ? "Top 15 Lojas por Valor Ajustado"
      : "Valor Ajustado por Regional";

  return (
    <div className="flex flex-col gap-5">
      <BarraFiltros filtros={filtros} onChange={setFiltros} />

      {/* Seletor de visualização do gráfico */}
      <div className="mega-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-mega-black">{tituloGrafico}</h3>
          <div className="flex gap-1.5">
            {(["geral", "loja", "regional"] as VisualizacaoGrafico[]).map((v) => (
              <button
                key={v}
                onClick={() => setVisualizacao(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  visualizacao === v
                    ? "bg-mega-red-500 text-white"
                    : "bg-mega-gray-100 text-mega-gray-600 hover:bg-mega-gray-200"
                }`}
              >
                {v === "geral" ? "Geral" : v === "loja" ? "Por Loja" : "Por Regional"}
              </button>
            ))}
          </div>
        </div>

        {carregando ? (
          <div className="h-72 animate-pulse rounded bg-mega-gray-100" />
        ) : dadosAtivos.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-mega-gray-400">
            Nenhum dado disponível para os filtros aplicados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dadosAtivos} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEFF1" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatarMoeda(v)} fontSize={11} />
              <YAxis
                type="category"
                dataKey="nome"
                width={130}
                fontSize={11}
                tickFormatter={(v) => (v.length > 18 ? v.slice(0, 17) + "…" : v)}
              />
              <Tooltip
                formatter={(v) => [formatarMoeda(Number(v)), "Valor"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={18}>
                {dadosAtivos.map((_, index) => (
                  <Cell key={index} fill={CORES[index % CORES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabela de produtos */}
      <div className="mega-card overflow-hidden">
        <div className="border-b border-mega-gray-100 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-mega-black">Lista Completa de Produtos</h3>
        </div>
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
                  <td className="px-4 py-3 font-mono text-xs text-mega-gray-600">
                    {p.produtoCodigo}
                  </td>
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
