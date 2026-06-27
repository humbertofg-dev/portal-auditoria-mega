import { ArrowUpDown } from "lucide-react";
import { Justificativa } from "@/types";
import { BadgeStatus, BadgeRisco } from "@/components/ui/Badges";
import { formatarData, formatarMoeda } from "@/utils/formatadores";

interface TabelaJustificativasProps {
  itens: Justificativa[];
  carregando: boolean;
  ordenarPor: string;
  ordem: "asc" | "desc";
  onOrdenar: (campo: string) => void;
  onAbrirDetalhe: (id: string) => void;
}

const COLUNAS = [
  { campo: "dataEnvio", rotulo: "Data" },
  { campo: "loja", rotulo: "Loja" },
  { campo: "produtoNome", rotulo: "Produto" },
  { campo: "valorAjustado", rotulo: "Valor" },
  { campo: "motivo", rotulo: "Motivo" },
  { campo: "status", rotulo: "Status" },
  { campo: "nivelRisco", rotulo: "Risco" },
];

export function TabelaJustificativas({
  itens,
  carregando,
  ordenarPor,
  ordem,
  onOrdenar,
  onAbrirDetalhe,
}: TabelaJustificativasProps) {
  return (
    <div className="mega-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-mega-gray-200 bg-mega-gray-50">
            <tr>
              {COLUNAS.map((col) => (
                <th key={col.campo} className="px-4 py-2.5">
                  <button
                    onClick={() => onOrdenar(col.campo)}
                    className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500 hover:text-mega-black"
                  >
                    {col.rotulo}
                    {ordenarPor === col.campo && (
                      <ArrowUpDown size={11} className={ordem === "asc" ? "rotate-180" : ""} />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-mega-gray-100">
            {carregando &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-mega-gray-100" />
                  </td>
                </tr>
              ))}

            {!carregando && itens.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-mega-gray-400">
                  Nenhuma justificativa encontrada para os filtros aplicados.
                </td>
              </tr>
            )}

            {!carregando &&
              itens.map((j) => (
                <tr
                  key={j.id}
                  onClick={() => onAbrirDetalhe(j.id)}
                  className="cursor-pointer transition-colors hover:bg-mega-gray-50"
                >
                  <td className="px-4 py-3 text-mega-gray-700">{formatarData(j.dataEnvio)}</td>
                  <td className="px-4 py-3 font-medium text-mega-black">
                    {j.loja?.nome ?? j.lojaCodigoBruto}
                  </td>
                  <td className="px-4 py-3 text-mega-gray-700">{j.produtoNome ?? j.produtoCodigo ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-mega-black tabular-nums">
                    {formatarMoeda(j.valorAjustado)}
                  </td>
                  <td className="px-4 py-3 text-mega-gray-700">{j.motivo}</td>
                  <td className="px-4 py-3">
                    <BadgeStatus status={j.status} />
                  </td>
                  <td className="px-4 py-3">
                    <BadgeRisco nivel={j.nivelRisco} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
