import { useState } from "react";
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { BarraFiltros } from "@/components/ui/BarraFiltros";
import { usePolling } from "@/hooks/usePolling";
import * as dashboardService from "@/services/dashboard.service";
import { FiltrosGlobais } from "@/types";
import { formatarMoeda } from "@/utils/formatadores";

const CORES_TREEMAP = ["#B3001B", "#960017", "#760012", "#D8404F", "#E8717E", "#56000D"];

export function PaginaIndicadores() {
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});

  const { dados: produtos, carregando: carregandoProdutos } = usePolling(
    () => dashboardService.buscarProdutosAjustados(filtros),
    [filtros],
    { intervaloMs: 20000 }
  );

  const { dados: heatmap, carregando: carregandoHeatmap } = usePolling(
    () => dashboardService.buscarHeatmapRegional(filtros),
    [filtros],
    { intervaloMs: 20000 }
  );

  const { dados: evolucaoMensal } = usePolling(
    () => dashboardService.buscarEvolucao(filtros, "mensal"),
    [filtros],
    { intervaloMs: 30000 }
  );

  const dadosTreemap = (produtos ?? []).map((p) => ({
    name: p.produtoNome ?? p.produtoCodigo,
    size: p.valorTotal,
  }));

  const dadosCurvaAbc = calcularCurvaAbc(produtos ?? []);

  const maiorValorRegional = Math.max(1, ...(heatmap ?? []).map((h) => h.valorTotal));

  return (
    <div className="flex flex-col gap-5">
      <BarraFiltros filtros={filtros} onChange={setFiltros} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="mega-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-mega-black">
            Treemap — Produtos Mais Ajustados
          </h3>
          {carregandoProdutos ? (
            <div className="h-72 animate-pulse rounded bg-mega-gray-100" />
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <Treemap
                data={dadosTreemap}
                dataKey="size"
                stroke="#fff"
                fill="#B3001B"
                content={<TreemapCelula />}
              />
            </ResponsiveContainer>
          )}
        </div>

        <div className="mega-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-mega-black">
            Heatmap — Ocorrências por Regional
          </h3>
          {carregandoHeatmap ? (
            <div className="h-72 animate-pulse rounded bg-mega-gray-100" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(heatmap ?? []).map((h) => {
                const intensidade = h.valorTotal / maiorValorRegional;
                return (
                  <div
                    key={h.regionalId}
                    className="rounded-md p-3.5 text-white"
                    style={{
                      backgroundColor: `rgba(179, 0, 27, ${0.25 + intensidade * 0.65})`,
                    }}
                  >
                    <p className="text-xs font-semibold">{h.regionalNome}</p>
                    <p className="mt-1 text-lg font-bold tabular-nums">{h.quantidadeOcorrencias}</p>
                    <p className="text-2xs opacity-90">{formatarMoeda(h.valorTotal)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="mega-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-mega-black">Tendência Mensal</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={evolucaoMensal ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEFF1" />
              <XAxis dataKey="periodo" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v) => formatarMoeda(Number(v))} />
              <Line type="monotone" dataKey="valor" stroke="#B3001B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mega-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-mega-black">
            Curva ABC de Produtos (Pareto 80/20)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dadosCurvaAbc.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEFF1" />
              <XAxis dataKey="nome" fontSize={9} angle={-30} textAnchor="end" height={60} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v) => formatarMoeda(Number(v))} />
              <Bar dataKey="valorTotal">
                {dadosCurvaAbc.slice(0, 15).map((item, i) => (
                  <Bar key={i} dataKey="valorTotal" fill={CORES_TREEMAP[item.classe === "A" ? 0 : item.classe === "B" ? 2 : 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex gap-3 text-2xs text-mega-gray-500">
            <LegendaAbc cor={CORES_TREEMAP[0]} rotulo="Classe A (até 80%)" />
            <LegendaAbc cor={CORES_TREEMAP[2]} rotulo="Classe B (até 95%)" />
            <LegendaAbc cor={CORES_TREEMAP[4]} rotulo="Classe C (restante)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TreemapCelula(props: any) {
  const { x, y, width, height, name, index } = props;
  if (width < 2 || height < 2) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: CORES_TREEMAP[index % CORES_TREEMAP.length],
          stroke: "#fff",
          strokeWidth: 2,
        }}
      />
      {width > 60 && height > 28 && (
        <text x={x + 6} y={y + 18} fontSize={11} fill="#fff" fontWeight={600}>
          {name}
        </text>
      )}
    </g>
  );
}

function LegendaAbc({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: cor }} />
      {rotulo}
    </span>
  );
}

function calcularCurvaAbc(
  produtos: { produtoNome: string | null; produtoCodigo: string; valorTotal: number }[]
) {
  const ordenados = [...produtos].sort((a, b) => b.valorTotal - a.valorTotal);
  const totalGeral = ordenados.reduce((acc, p) => acc + p.valorTotal, 0) || 1;

  let acumulado = 0;
  return ordenados.map((p) => {
    acumulado += p.valorTotal;
    const percentualAcumulado = (acumulado / totalGeral) * 100;
    const classe = percentualAcumulado <= 80 ? "A" : percentualAcumulado <= 95 ? "B" : "C";
    return {
      nome: p.produtoNome ?? p.produtoCodigo,
      valorTotal: p.valorTotal,
      percentualAcumulado: Math.round(percentualAcumulado * 10) / 10,
      classe,
    };
  });
}
