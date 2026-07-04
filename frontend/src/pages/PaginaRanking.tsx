import { useState } from "react";
import { Trophy } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import * as dashboardService from "@/services/dashboard.service";
import { formatarMoeda } from "@/utils/formatadores";

type AbaRanking = "lojas" | "produtos" | "gerentes" | "regionais";

const ABAS: { id: AbaRanking; rotulo: string }[] = [
  { id: "lojas", rotulo: "Lojas" },
  { id: "produtos", rotulo: "Produtos" },
  { id: "gerentes", rotulo: "Gerentes" },
  { id: "regionais", rotulo: "Regionais" },
];

export function PaginaRanking() {
  const [aba, setAba] = useState<AbaRanking>("lojas");

  const { dados: topLojas, carregando: carregandoLojas } = usePolling(
    () => dashboardService.buscarTopLojas({}),
    [],
    { intervaloMs: 20000, ativo: aba === "lojas" }
  );

  const { dados: produtos, carregando: carregandoProdutos } = usePolling(
    () => dashboardService.buscarProdutosAjustados({}),
    [],
    { intervaloMs: 20000, ativo: aba === "produtos" }
  );

  const { dados: gerentes, carregando: carregandoGerentes } = usePolling(
    () => dashboardService.buscarRanking("gerentes", {}),
    [],
    { intervaloMs: 20000, ativo: aba === "gerentes" }
  );

  const { dados: regionais, carregando: carregandoRegionais } = usePolling(
    () => dashboardService.buscarRanking("regionais", {}),
    [],
    { intervaloMs: 20000, ativo: aba === "regionais" }
  );

  function itensAtuais(): { nome: string; valorTotal: number; quantidade: number }[] {
    if (aba === "lojas") {
      return (topLojas ?? []).map((l) => ({
        nome: l.lojaNome,
        valorTotal: l.valorTotal,
        quantidade: l.quantidadeAjustes,
      }));
    }
    if (aba === "produtos") {
      return (produtos ?? []).map((p) => ({
        nome: p.produtoNome ?? p.produtoCodigo,
        valorTotal: p.valorTotal,
        quantidade: p.quantidadeAjustes,
      }));
    }
    if (aba === "gerentes") return gerentes ?? [];
    return regionais ?? [];
  }

  const carregandoAtual =
    aba === "lojas"
      ? carregandoLojas
      : aba === "produtos"
      ? carregandoProdutos
      : aba === "gerentes"
      ? carregandoGerentes
      : carregandoRegionais;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              aba === a.id ? "bg-mega-red-500 text-white" : "bg-white text-mega-gray-600 hover:bg-mega-gray-100"
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div className="mega-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-mega-gray-200 bg-mega-gray-50">
            <tr>
              <th className="w-14 px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                #
              </th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                Nome
              </th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                Valor Total Ajustado
              </th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                Quantidade
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mega-gray-100">
            {carregandoAtual &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-mega-gray-100" />
                  </td>
                </tr>
              ))}

            {!carregandoAtual &&
              itensAtuais().map((item, index) => (
                <tr key={item.nome + index} className="hover:bg-mega-gray-50">
                  <td className="px-4 py-3">
                    {index < 3 ? (
                      <Trophy
                        size={16}
                        className={
                          index === 0
                            ? "text-amber-500"
                            : index === 1
                            ? "text-mega-gray-400"
                            : "text-amber-700"
                        }
                      />
                    ) : (
                      <span className="text-mega-gray-400">{index + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-mega-black">{item.nome}</td>
                  <td className="px-4 py-3 tabular-nums text-mega-black">
                    {formatarMoeda(item.valorTotal)}
                  </td>
                  <td className="px-4 py-3 text-mega-gray-600">{item.quantidade}</td>
                </tr>
              ))}

            {!carregandoAtual && itensAtuais().length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-mega-gray-400">
                  Nenhum dado disponível ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
