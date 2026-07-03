import { useState, useRef } from "react";
import {
  Calendar,
  Upload,
  PlayCircle,
  CheckCircle2,
  Clock,
  Search,
  AlertCircle,
  Lock,
  FileDown,
  History,
} from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import { useAuth } from "@/contexts/AuthContext";
import * as controleDiarioService from "@/services/controle-diario.service";
import { api } from "@/services/api";
import {
  ControleDiario,
  DashboardControleDiario,
  HistoricoControleDiario,
  ItemControleDiario,
  Loja,
  Regional,
  StatusControleDiario,
} from "@/types";
import { BarraProgresso } from "@/components/controle-diario/BarraProgresso";
import { TabelaItensControleDiario } from "@/components/controle-diario/TabelaItensControleDiario";
import { formatarData, formatarDataHora, formatarMoeda } from "@/utils/formatadores";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type AbaAtiva = "controle" | "historico";

export function PaginaControleDiario() {
  const { usuario } = useAuth();
  const podeOperar = usuario?.perfil === "ADMINISTRADOR" || usuario?.perfil === "AUDITORIA";
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("controle");
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().slice(0, 10));

  // Busca o controle da data selecionada, atualizando a cada 15s (polling)
  const {
    dados: controle,
    carregando,
    recarregar,
  } = usePolling<ControleDiario | null>(
    () => controleDiarioService.buscarControleDoDia(dataSelecionada),
    [dataSelecionada],
    { intervaloMs: 15000 }
  );

  const { dados: dashboard, recarregar: recarregarDashboard } = usePolling<DashboardControleDiario | null>(
    async () => {
      if (!controle?.id) return null;
      return controleDiarioService.buscarDashboard(controle.id);
    },
    [controle?.id],
    { intervaloMs: 15000 }
  );

  const { dados: historico } = usePolling<HistoricoControleDiario[]>(
    () => controleDiarioService.buscarHistorico(),
    [],
    { intervaloMs: 0, ativo: abaAtiva === "historico" }
  );

  async function alterarStatus(itemId: string, status: StatusControleDiario) {
    await controleDiarioService.alterarStatusItem(itemId, status);
    recarregar();
    recarregarDashboard();
  }

  async function fecharDia() {
    if (!controle?.id) return;
    const ok = confirm("Fechar o controle do dia? Esta ação é permanente e gera um histórico imutável.");
    if (!ok) return;
    await controleDiarioService.fecharDia(controle.id);
    recarregar();
    recarregarDashboard();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Abas */}
      <div className="flex gap-2">
        {(["controle", "historico"] as AbaAtiva[]).map((aba) => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(aba)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              abaAtiva === aba ? "bg-mega-red-500 text-white" : "bg-white text-mega-gray-600 hover:bg-mega-gray-100"
            }`}
          >
            {aba === "controle" ? <Calendar size={15} /> : <History size={15} />}
            {aba === "controle" ? "Controle Diário" : "Histórico"}
          </button>
        ))}
      </div>

      {abaAtiva === "historico" ? (
        <TabHistorico historico={historico ?? []} />
      ) : (
        <TabControleDiario
          dataSelecionada={dataSelecionada}
          onDataChange={setDataSelecionada}
          controle={controle}
          dashboard={dashboard}
          carregando={carregando}
          podeOperar={podeOperar}
          onGerado={recarregar}
          onAlterarStatus={alterarStatus}
          onFecharDia={fecharDia}
        />
      )}
    </div>
  );
}

// ============================================================================
// ABA: CONTROLE DIÁRIO
// ============================================================================

function TabControleDiario({
  dataSelecionada,
  onDataChange,
  controle,
  dashboard,
  carregando,
  podeOperar,
  onGerado,
  onAlterarStatus,
  onFecharDia,
}: {
  dataSelecionada: string;
  onDataChange: (d: string) => void;
  controle: ControleDiario | null | undefined;
  dashboard: DashboardControleDiario | null | undefined;
  carregando: boolean;
  podeOperar: boolean;
  onGerado: () => void;
  onAlterarStatus: (itemId: string, status: StatusControleDiario) => void;
  onFecharDia: () => void;
}) {
  const [busca, setBusca] = useState("");

  return (
    <>
      {/* Seletor de data */}
      <div className="mega-card flex items-center gap-3 p-3">
        <Calendar size={16} className="text-mega-gray-400" />
        <label className="text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
          Data do controle
        </label>
        <input
          type="date"
          value={dataSelecionada}
          onChange={(e) => onDataChange(e.target.value)}
          className="rounded-md border border-mega-gray-200 px-3 py-1.5 text-sm"
        />
      </div>

      {/* Se não existe controle para a data, mostra formulário de geração */}
      {!carregando && !controle && podeOperar && (
        <FormGerarControle data={dataSelecionada} onGerado={onGerado} />
      )}

      {!carregando && !controle && !podeOperar && (
        <div className="mega-card flex items-center gap-2 p-4 text-sm text-mega-gray-500">
          <AlertCircle size={16} />
          Nenhum controle gerado para esta data.
        </div>
      )}

      {/* Controle existente */}
      {controle && (
        <>
          {/* Barra de progresso */}
          {dashboard && (
            <BarraProgresso
              total={dashboard.total}
              recebidas={dashboard.recebidas}
              percentual={dashboard.percentual}
              todasEnviaram={dashboard.todasEnviaram}
            />
          )}

          {/* Cards do dashboard operacional */}
          {dashboard && <CardsDashboardOperacional dashboard={dashboard} />}

          {/* Barra de pesquisa + botão fechar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mega-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar loja, regional, responsável…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-md border border-mega-gray-200 py-2 pl-9 pr-3 text-sm"
              />
            </div>
            {podeOperar && !controle.fechado && (
              <button
                onClick={onFecharDia}
                className="flex items-center gap-1.5 rounded-md bg-mega-black px-4 py-2 text-sm font-semibold text-white hover:bg-mega-gray-800"
              >
                <Lock size={14} />
                Fechar Controle Diário
              </button>
            )}
            {controle.fechado && (
              <span className="flex items-center gap-1.5 rounded-md bg-mega-gray-100 px-3 py-2 text-xs text-mega-gray-500">
                <Lock size={13} />
                Fechado em {formatarDataHora(controle.fechadoEm!)}
              </span>
            )}
          </div>

          {/* Tabela operacional */}
          <TabelaItensControleDiario
            itens={controle.itens}
            carregando={carregando}
            fechado={controle.fechado}
            busca={busca}
            onAlterarStatus={onAlterarStatus}
          />
        </>
      )}
    </>
  );
}

// ============================================================================
// CARDS DO DASHBOARD OPERACIONAL
// ============================================================================

function CardsDashboardOperacional({ dashboard }: { dashboard: DashboardControleDiario }) {
  function formatarTempo(min: number | null): string {
    if (min === null) return "—";
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h ${min % 60}min`;
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
      <CardOp rotulo="Total Obrigatórias" valor={dashboard.total} />
      <CardOp rotulo="Recebidas" valor={dashboard.recebidas} cor="green" />
      <CardOp rotulo="Pendentes" valor={dashboard.pendentes} cor={dashboard.pendentes > 0 ? "red" : "green"} />
      <CardOp rotulo="Em Análise" valor={dashboard.emAnalise} cor="blue" />
      <CardOp rotulo="Concluídas" valor={dashboard.concluidas} cor="green" />
      <CardOp rotulo="% Atendimento" valor={`${dashboard.percentual}%`} cor={dashboard.percentual === 100 ? "green" : "amber"} />
      <CardOp rotulo="T. Médio Envio" valor={formatarTempo(dashboard.tempoMedioEnvioMin)} />
      <CardOp rotulo="T. Médio Análise" valor={formatarTempo(dashboard.tempoMedioAnaliseMin)} />
      <CardOp rotulo="Valor Total" valor={formatarMoeda(dashboard.valorTotal)} />
    </div>
  );
}

function CardOp({ rotulo, valor, cor }: { rotulo: string; valor: string | number; cor?: string }) {
  const cores: Record<string, string> = {
    green: "text-emerald-600",
    red: "text-mega-red-500",
    amber: "text-amber-600",
    blue: "text-blue-600",
  };
  return (
    <div className="mega-card p-3">
      <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">{rotulo}</p>
      <p className={`text-xl font-bold tabular-nums ${cor ? cores[cor] : "text-mega-black"}`}>{valor}</p>
    </div>
  );
}

// ============================================================================
// FORMULÁRIO DE GERAÇÃO DO CONTROLE
// ============================================================================

function FormGerarControle({ data, onGerado }: { data: string; onGerado: () => void }) {
  const [modo, setModo] = useState<"manual" | "importar">("manual");
  const [lojasDisponiveis, setLojasDisponiveis] = useState<Loja[]>([]);
  const [regionais, setRegionais] = useState<Regional[]>([]);
  const [regionalFiltro, setRegionalFiltro] = useState("");
  const [lojasSelecionadas, setLojasSelecionadas] = useState<Set<string>>(new Set());
  const [lojasImportadas, setLojasImportadas] = useState<{ id: string; codigo: string; nome: string }[]>([]);
  const [naoEncontrados, setNaoEncontrados] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Carrega lojas e regionais uma vez
  usePolling<void>(
    async () => {
      const [lojasRes, regionaisRes] = await Promise.all([
        api.get("/lojas"),
        api.get("/regionais"),
      ]);
      setLojasDisponiveis(lojasRes.data);
      setRegionais(regionaisRes.data);
    },
    [],
    { intervaloMs: 0 }
  );

  const lojasFiltradas = lojasDisponiveis.filter(
    (l) => !regionalFiltro || l.regionalId === regionalFiltro
  );

  function toggleLoja(id: string) {
    setLojasSelecionadas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodas() {
    if (lojasSelecionadas.size === lojasFiltradas.length) {
      setLojasSelecionadas(new Set());
    } else {
      setLojasSelecionadas(new Set(lojasFiltradas.map((l) => l.id)));
    }
  }

  async function processarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const texto = await file.text();
    // Lê CSV simples — extrai primeira coluna de cada linha (pula cabeçalho)
    const linhas = texto.split(/[\n\r]+/).filter(Boolean);
    const codigos = linhas
      .slice(1) // pula cabeçalho
      .map((l) => l.split(/[,;\t]/)[0].replace(/"/g, "").trim())
      .filter(Boolean);

    const resultado = await controleDiarioService.importarLojas(codigos);
    setLojasImportadas(resultado.lojas);
    setNaoEncontrados(resultado.naoEncontrados);
  }

  async function gerar() {
    const ids =
      modo === "manual"
        ? Array.from(lojasSelecionadas)
        : lojasImportadas.map((l) => l.id);

    if (ids.length === 0) {
      setErro("Selecione ao menos uma loja.");
      return;
    }

    setGerando(true);
    setErro(null);
    try {
      await controleDiarioService.gerarControleDiario({ data, lojaIds: ids });
      onGerado();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Erro ao gerar controle.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="mega-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-mega-black">
        Definir Lojas Obrigatórias — {formatarData(data)}
      </h3>

      {/* Seletor de modo */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setModo("manual")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${modo === "manual" ? "bg-mega-red-500 text-white" : "bg-mega-gray-100 text-mega-gray-600"}`}
        >
          Selecionar Manualmente
        </button>
        <button
          onClick={() => setModo("importar")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${modo === "importar" ? "bg-mega-red-500 text-white" : "bg-mega-gray-100 text-mega-gray-600"}`}
        >
          <Upload size={13} />
          Importar Excel/CSV
        </button>
      </div>

      {modo === "manual" && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <select
              value={regionalFiltro}
              onChange={(e) => setRegionalFiltro(e.target.value)}
              className="rounded-md border border-mega-gray-200 px-2.5 py-1.5 text-xs"
            >
              <option value="">Todas as regionais</option>
              {regionais.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
            <button
              onClick={toggleTodas}
              className="text-xs font-medium text-mega-red-500 hover:underline"
            >
              {lojasSelecionadas.size === lojasFiltradas.length ? "Desmarcar todas" : "Selecionar todas"}
            </button>
            <span className="text-2xs text-mega-gray-500">{lojasSelecionadas.size} selecionada(s)</span>
          </div>

          <div className="mb-4 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-md border border-mega-gray-200 p-2 sm:grid-cols-2 lg:grid-cols-3">
            {lojasFiltradas.map((loja) => (
              <label
                key={loja.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-mega-gray-50 ${
                  lojasSelecionadas.has(loja.id) ? "bg-mega-red-50 text-mega-red-700" : "text-mega-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={lojasSelecionadas.has(loja.id)}
                  onChange={() => toggleLoja(loja.id)}
                  className="accent-mega-red-500"
                />
                <span className="font-medium">{loja.nome}</span>
                <span className="text-mega-gray-400">({loja.codigo})</span>
              </label>
            ))}
          </div>
        </>
      )}

      {modo === "importar" && (
        <div className="mb-4">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.txt"
            onChange={processarArquivo}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="mega-card flex items-center gap-2 px-4 py-2.5 text-sm text-mega-gray-700 hover:bg-mega-gray-50"
          >
            <Upload size={15} />
            Selecionar arquivo Excel/CSV
          </button>
          <p className="mt-1 text-2xs text-mega-gray-400">
            O arquivo deve conter o código ou nome das lojas na primeira coluna (com cabeçalho).
          </p>

          {lojasImportadas.length > 0 && (
            <div className="mt-3 rounded-md bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-emerald-700">
                {lojasImportadas.length} loja(s) localizadas:
              </p>
              <ul className="mt-1 text-2xs text-emerald-600">
                {lojasImportadas.map((l) => (
                  <li key={l.id}>• {l.nome} ({l.codigo})</li>
                ))}
              </ul>
            </div>
          )}

          {naoEncontrados.length > 0 && (
            <div className="mt-2 rounded-md bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-700">
                {naoEncontrados.length} código(s) não encontrado(s):
              </p>
              <ul className="mt-1 text-2xs text-amber-600">
                {naoEncontrados.map((c) => <li key={c}>• {c}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {erro && <p className="mb-3 text-2xs text-mega-red-600">{erro}</p>}

      <button
        onClick={gerar}
        disabled={gerando}
        className="flex items-center gap-2 rounded-md bg-mega-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-mega-red-600 disabled:opacity-60"
      >
        <PlayCircle size={16} />
        {gerando ? "Gerando…" : "Gerar Controle Diário"}
      </button>
    </div>
  );
}

// ============================================================================
// ABA: HISTÓRICO
// ============================================================================

function TabHistorico({ historico }: { historico: HistoricoControleDiario[] }) {
  const dadosGrafico = [...historico]
    .reverse()
    .slice(-30)
    .map((h) => ({
      data: formatarData(h.dataControle),
      percentual: Number(h.percentualAtendimento),
      obrigatorias: h.totalObrigatorias,
      recebidas: h.totalRecebidas,
    }));

  return (
    <div className="flex flex-col gap-5">
      {/* Gráfico de evolução */}
      {dadosGrafico.length > 0 && (
        <div className="mega-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-mega-black">
            Evolução do % de Atendimento (últimos 30 dias)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEFF1" />
              <XAxis dataKey="data" fontSize={10} />
              <YAxis domain={[0, 100]} unit="%" fontSize={11} />
              <Tooltip formatter={(v) => [`${Number(v)}%`, "Atendimento"]} />
              <Line type="monotone" dataKey="percentual" stroke="#B3001B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela de histórico */}
      <div className="mega-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-mega-gray-200 bg-mega-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Data</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Obrigatórias</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Recebidas</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Pendentes</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Concluídas</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">% Atendimento</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">T. Médio Envio</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Valor Total</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Fechado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mega-gray-100">
            {historico.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-mega-gray-400">
                  Nenhum controle fechado ainda.
                </td>
              </tr>
            )}
            {historico.map((h) => (
              <tr key={h.id} className="hover:bg-mega-gray-50">
                <td className="px-4 py-3 font-medium text-mega-black">{formatarData(h.dataControle)}</td>
                <td className="px-4 py-3 text-mega-gray-600">{h.totalObrigatorias}</td>
                <td className="px-4 py-3 text-emerald-600 font-medium">{h.totalRecebidas}</td>
                <td className="px-4 py-3 text-mega-red-500 font-medium">{h.totalPendentes}</td>
                <td className="px-4 py-3 text-mega-gray-600">{h.totalConcluidas}</td>
                <td className="px-4 py-3">
                  <span className={`mega-badge ${Number(h.percentualAtendimento) === 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {Number(h.percentualAtendimento).toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-mega-gray-600">
                  {h.tempoMedioEnvioMin ? `${Math.round(Number(h.tempoMedioEnvioMin))} min` : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums text-mega-black">
                  {h.valorTotalInformado ? formatarMoeda(Number(h.valorTotalInformado)) : "—"}
                </td>
                <td className="px-4 py-3 text-mega-gray-600 text-2xs">{formatarDataHora(h.fechadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
