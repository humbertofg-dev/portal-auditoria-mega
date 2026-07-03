import { ItemControleDiario, StatusControleDiario } from "@/types";
import { formatarDataHora, formatarMoeda } from "@/utils/formatadores";

const LABEL_STATUS: Record<StatusControleDiario, string> = {
  AGUARDANDO_JUSTIFICATIVA: "Aguardando",
  JUSTIFICATIVA_RECEBIDA: "Recebida",
  EM_ANALISE: "Em Análise",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

const EMOJI_STATUS: Record<StatusControleDiario, string> = {
  AGUARDANDO_JUSTIFICATIVA: "🔴",
  JUSTIFICATIVA_RECEBIDA: "🟡",
  EM_ANALISE: "🔵",
  CONCLUIDA: "🟢",
  CANCELADA: "⚫",
};

const COR_STATUS: Record<StatusControleDiario, string> = {
  AGUARDANDO_JUSTIFICATIVA: "bg-mega-red-50 text-mega-red-700",
  JUSTIFICATIVA_RECEBIDA: "bg-amber-50 text-amber-700",
  EM_ANALISE: "bg-blue-50 text-blue-700",
  CONCLUIDA: "bg-emerald-50 text-emerald-700",
  CANCELADA: "bg-mega-gray-100 text-mega-gray-500",
};

const STATUS_OPCOES: StatusControleDiario[] = [
  "AGUARDANDO_JUSTIFICATIVA",
  "JUSTIFICATIVA_RECEBIDA",
  "EM_ANALISE",
  "CONCLUIDA",
  "CANCELADA",
];

interface TabelaItensProps {
  itens: ItemControleDiario[];
  carregando: boolean;
  fechado: boolean;
  busca: string;
  onAlterarStatus: (itemId: string, status: StatusControleDiario) => void;
}

export function TabelaItensControleDiario({
  itens,
  carregando,
  fechado,
  busca,
  onAlterarStatus,
}: TabelaItensProps) {
  const itensFiltrados = itens.filter((item) => {
    if (!busca) return true;
    const b = busca.toLowerCase();
    return (
      item.loja?.nome?.toLowerCase().includes(b) ||
      item.loja?.codigo?.toLowerCase().includes(b) ||
      item.loja?.regional?.nome?.toLowerCase().includes(b) ||
      item.responsavel?.toLowerCase().includes(b)
    );
  });

  function calcularTempo(inicio: string | null | undefined, fim: string | null | undefined): string {
    if (!inicio) return "—";
    const fimDate = fim ? new Date(fim) : new Date();
    const diffMin = Math.round((fimDate.getTime() - new Date(inicio).getTime()) / 60000);
    if (diffMin < 60) return `${diffMin} min`;
    return `${Math.floor(diffMin / 60)}h ${diffMin % 60}min`;
  }

  return (
    <div className="mega-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-mega-gray-200 bg-mega-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Loja</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Regional</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Cidade</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Hora Envio</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Responsável</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Valor</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">T. Envio</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">T. Análise</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mega-gray-100">
            {carregando &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={9} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-mega-gray-100" />
                  </td>
                </tr>
              ))}

            {!carregando && itensFiltrados.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-mega-gray-400">
                  {busca ? "Nenhuma loja encontrada para esta pesquisa." : "Nenhum item no controle."}
                </td>
              </tr>
            )}

            {!carregando &&
              itensFiltrados.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-mega-gray-50 ${
                    item.status === "AGUARDANDO_JUSTIFICATIVA" ? "bg-mega-red-50/40" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-mega-black">
                    {item.loja?.nome}
                    <span className="ml-1 text-2xs text-mega-gray-400">({item.loja?.codigo})</span>
                  </td>
                  <td className="px-4 py-3 text-mega-gray-600">{item.loja?.regional?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-mega-gray-600">{item.loja?.cidade ?? "—"}</td>
                  <td className="px-4 py-3 text-mega-gray-600">
                    {item.horaEnvio ? formatarDataHora(item.horaEnvio).split(" ")[1] : "—"}
                  </td>
                  <td className="px-4 py-3 text-mega-gray-600">{item.responsavel ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-mega-black">
                    {item.valorInformado ? formatarMoeda(Number(item.valorInformado)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-mega-gray-600">
                    {calcularTempo(item.createdAt, item.horaEnvio ?? undefined)}
                  </td>
                  <td className="px-4 py-3 text-mega-gray-600">
                    {item.horaEnvio ? calcularTempo(item.horaEnvio, item.horaConclusao ?? undefined) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {fechado ? (
                      <span className={`mega-badge ${COR_STATUS[item.status]}`}>
                        {EMOJI_STATUS[item.status]} {LABEL_STATUS[item.status]}
                      </span>
                    ) : (
                      <select
                        value={item.status}
                        onChange={(e) => onAlterarStatus(item.id, e.target.value as StatusControleDiario)}
                        className={`rounded-md border px-2 py-1 text-xs font-medium ${COR_STATUS[item.status]}`}
                      >
                        {STATUS_OPCOES.map((s) => (
                          <option key={s} value={s}>
                            {EMOJI_STATUS[s]} {LABEL_STATUS[s]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
