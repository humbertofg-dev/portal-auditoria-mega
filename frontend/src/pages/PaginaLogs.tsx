import { useState } from "react";
import { ScrollText } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/services/api";
import { Paginador } from "@/components/ui/Paginador";
import { formatarDataHora } from "@/utils/formatadores";

interface LogAcesso {
  id: string;
  acao: string;
  entidade?: string | null;
  entidadeId?: string | null;
  ip?: string | null;
  createdAt: string;
  usuario?: { nome: string; email: string } | null;
}

export function PaginaLogs() {
  const [pagina, setPagina] = useState(1);

  const { dados, carregando } = usePolling(
    async () => {
      const { data } = await api.get("/logs", { params: { pagina, porPagina: 50 } });
      return data as { itens: LogAcesso[]; paginacao: any };
    },
    [pagina],
    { intervaloMs: 20000 }
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="mega-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-mega-gray-200 bg-mega-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Data/Hora</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Usuário</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Ação</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Entidade</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mega-gray-100">
            {carregando &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-mega-gray-100" />
                  </td>
                </tr>
              ))}

            {!carregando &&
              (dados?.itens ?? []).map((log) => (
                <tr key={log.id} className="hover:bg-mega-gray-50">
                  <td className="px-4 py-3 text-mega-gray-600">{formatarDataHora(log.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-mega-black">
                    {log.usuario?.nome ?? "Sistema"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="mega-badge bg-mega-gray-100 text-mega-gray-700">
                      <ScrollText size={11} />
                      {log.acao}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mega-gray-600">
                    {log.entidade ? `${log.entidade} #${log.entidadeId?.slice(0, 8)}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-2xs text-mega-gray-500">{log.ip ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Paginador paginacao={dados?.paginacao} onMudarPagina={setPagina} />
    </div>
  );
}
