import { FiltrosGlobais, Regional, StatusJustificativa } from "@/types";
import { LABEL_STATUS } from "@/utils/formatadores";
import { Filter, X } from "lucide-react";

interface BarraFiltrosProps {
  filtros: FiltrosGlobais;
  onChange: (filtros: FiltrosGlobais) => void;
  regionais?: Regional[];
}

const STATUS_OPCOES: StatusJustificativa[] = [
  "RECEBIDO",
  "EM_ANALISE",
  "APROVADO",
  "REPROVADO",
  "SOLICITADO_COMPLEMENTACAO",
];

export function BarraFiltros({ filtros, onChange, regionais = [] }: BarraFiltrosProps) {
  function atualizar<K extends keyof FiltrosGlobais>(campo: K, valor: FiltrosGlobais[K]) {
    onChange({ ...filtros, [campo]: valor });
  }

  const temFiltrosAtivos = Object.values(filtros).some((v) => v !== undefined && v !== "");

  return (
    <div className="mega-card flex flex-wrap items-center gap-2 p-3">
      <div className="flex items-center gap-1.5 pr-2 text-mega-gray-500">
        <Filter size={15} />
        <span className="text-2xs font-semibold uppercase tracking-wide">Filtros</span>
      </div>

      <input
        type="date"
        value={filtros.dataInicial ?? ""}
        onChange={(e) => atualizar("dataInicial", e.target.value)}
        className="rounded-md border border-mega-gray-200 px-2.5 py-1.5 text-xs text-mega-gray-700"
        aria-label="Data inicial"
      />
      <span className="text-xs text-mega-gray-400">até</span>
      <input
        type="date"
        value={filtros.dataFinal ?? ""}
        onChange={(e) => atualizar("dataFinal", e.target.value)}
        className="rounded-md border border-mega-gray-200 px-2.5 py-1.5 text-xs text-mega-gray-700"
        aria-label="Data final"
      />

      <select
        value={filtros.regionalId ?? ""}
        onChange={(e) => atualizar("regionalId", e.target.value || undefined)}
        className="rounded-md border border-mega-gray-200 px-2.5 py-1.5 text-xs text-mega-gray-700"
      >
        <option value="">Todas as regionais</option>
        {regionais.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nome}
          </option>
        ))}
      </select>

      <select
        value={filtros.status ?? ""}
        onChange={(e) => atualizar("status", (e.target.value || undefined) as StatusJustificativa)}
        className="rounded-md border border-mega-gray-200 px-2.5 py-1.5 text-xs text-mega-gray-700"
      >
        <option value="">Todos os status</option>
        {STATUS_OPCOES.map((s) => (
          <option key={s} value={s}>
            {LABEL_STATUS[s]}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Pesquisar loja, produto, motivo…"
        value={filtros.busca ?? ""}
        onChange={(e) => atualizar("busca", e.target.value || undefined)}
        className="min-w-[200px] flex-1 rounded-md border border-mega-gray-200 px-2.5 py-1.5 text-xs text-mega-gray-700"
      />

      {temFiltrosAtivos && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-mega-red-500 hover:bg-mega-red-50"
        >
          <X size={13} />
          Limpar
        </button>
      )}
    </div>
  );
}
