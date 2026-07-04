import { useState } from "react";
import {
  ClipboardList,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Banknote,
  CalendarRange,
  Store,
  Package,
  Timer,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { CardMetrica } from "@/components/ui/CardMetrica";
import { BarraFiltros } from "@/components/ui/BarraFiltros";
import { PainelAlertas } from "@/components/dashboard/PainelAlertas";
import { usePolling } from "@/hooks/usePolling";
import * as dashboardService from "@/services/dashboard.service";
import { FiltrosGlobais } from "@/types";
import { formatarMoeda, formatarHoras } from "@/utils/formatadores";

const CORES_GRAFICO = ["#B3001B", "#1A1C1F", "#71757D", "#E8717E", "#9A9EA6", "#56000D"];

export function PaginaDashboard() {
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});

  const { dados: cards, carregando: carregandoCards } = usePolling(
    () => dashboardService.buscarCards(filtros),
    [filtros],
    { intervaloMs: 15000 }
  );

  const { dados: topLojas, carregando: carregandoTop } = usePolling(
    () => dashboardService.buscarTopLojas(filtros),
    [filtros],
    { intervaloMs: 20000 }
  );

  const { dados: evolucao } = usePolling(
    () => dashboardService.buscarEvolucao(filtros, "diaria"),
    [filtros],
    { intervaloMs: 20000 }
  );

  const { dados: motivos } = usePolling(
    () => dashboardService.buscarMotivos(filtros),
    [filtros],
    { intervaloMs: 20000 }
  );

  const { dados: alertas, carregando: carregandoAlertas } = usePolling(
    () => dashboardService.buscarAlertas(true),
    [],
    { intervaloMs: 10000 }
  );

  return (
    <div className="flex flex-col gap-5">
      <BarraFiltros filtros={filtros} onChange={setFiltros} />

      {/* --- Cards principais --- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <CardMetrica
          rotulo="Total de Justificativas"
          valor={cards?.totalJustificativas ?? 0}
          icone={<ClipboardList size={16} />}
          carregando={carregandoCards}
        />
        <CardMetrica
          rotulo="Pendentes"
          valor={cards?.pendentes ?? 0}
          icone={<Clock size={16} />}
          destaque="amarelo"
          carregando={carregandoCards}
        />
        <CardMetrica
          rotulo="Em Análise"
          valor={cards?.emAnalise ?? 0}
          icone={<Search size={16} />}
          carregando={carregandoCards}
        />
        <CardMetrica
          rotulo="Aprovadas"
          valor={cards?.aprovadas ?? 0}
          icone={<CheckCircle2 size={16} />}
          destaque="verde"
          carregando={carregandoCards}
        />
        <CardMetrica
          rotulo="Reprovadas"
          valor={cards?.reprovadas ?? 0}
          icone={<XCircle size={16} />}
          destaque="vermelho"
          carregando={carregandoCards}
        />
        <CardMetrica
          rotulo="Valor Ajustado Hoje"
          valor={formatarMoeda(cards?.valorAjustadoHoje ?? 0)}
          icone={<Banknote size={16} />}
          carregando={carregandoCards}
        />
        <CardMetrica
          rotulo="Valor Ajustado no Mês"
          valor={formatarMoeda(cards?.valorAjustadoMes ?? 0)}
          icone={<CalendarRange size={16} />}
          carregando={carregandoCards}
        />
        <CardMetrica
          rotulo="Lojas com Ocorrências"
          valor={cards?.lojasComOcorrencias ?? 0}
          icone={<Store size={16} />}
          carregando={carregandoCards}
        />
        <CardMetrica
          rotulo="Produtos Ajustados"
          valor={cards?.produtosAjustados ?? 0}
          icone={<Package size={16} />}
          carregando={carregandoCards}
        />
        <CardMetrica
          rotulo="Tempo Médio de Resposta"
          valor={formatarHoras(cards?.tempoMedioRespostaAuditoriaHoras)}
          icone={<Timer size={16} />}
          carregando={carregandoCards}
        />
      </div>

      {/* --- Gráficos + Alertas --- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="mega-card p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-mega-black">
            Top 20 Lojas — Valor Ajustado
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topLojas?.slice(0, 10) ?? []} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEFF1" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatarMoeda(v)} fontSize={11} />
              <YAxis type="category" dataKey="lojaNome" width={120} fontSize={11} />
              <Tooltip formatter={(v) => formatarMoeda(Number(v))} />
              <Bar dataKey="valorTotal" fill="#B3001B" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
          {carregandoTop && <p className="mt-2 text-2xs text-mega-gray-400">Carregando…</p>}
        </div>

        <PainelAlertas alertas={alertas} carregando={carregandoAlertas} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="mega-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-mega-black">Evolução Diária</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={evolucao ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEFF1" />
              <XAxis dataKey="periodo" fontSize={10} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v) => formatarMoeda(Number(v))} />
              <Line type="monotone" dataKey="valor" stroke="#B3001B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mega-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-mega-black">Motivos dos Ajustes</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={motivos ?? []}
                dataKey="quantidade"
                nameKey="motivo"
                cx="50%"
                cy="50%"
                outerRadius={85}
                label={(entry) => (entry as unknown as { motivo: string }).motivo}
              >
                {(motivos ?? []).map((_, index) => (
                  <Cell key={index} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
