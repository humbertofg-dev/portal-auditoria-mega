import { useState } from "react";
import { CheckCircle2, RefreshCw, XCircle, Sheet } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/services/api";
import { formatarDataHora } from "@/utils/formatadores";

interface StatusSync {
  ultimaSincronia: string | null;
  ultimoStatus: string | null;
  ultimaMensagemErro?: string | null;
}

export function PaginaConfiguracoes() {
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const { dados: status, recarregar } = usePolling<StatusSync>(
    async () => {
      const { data } = await api.get("/sync/status");
      return data;
    },
    [],
    { intervaloMs: 10000 }
  );

  async function testarConexao() {
    setTestando(true);
    setResultadoTeste(null);
    try {
      const { data } = await api.get("/sync/testar-conexao");
      setResultadoTeste(data);
    } catch (e: any) {
      setResultadoTeste({ ok: false, mensagem: e?.response?.data?.erro ?? "Erro ao testar conexão." });
    } finally {
      setTestando(false);
    }
  }

  async function forcarSincronizacao() {
    setSincronizando(true);
    try {
      await api.post("/sync/forcar");
      await recarregar();
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="mega-card p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
            <Sheet size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-mega-black">Integração com Google Sheets</h3>
            <p className="text-2xs text-mega-gray-500">
              As lojas registram justificativas exclusivamente pelo Google Forms. O Portal lê
              automaticamente as respostas armazenadas na planilha vinculada.
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 rounded-md bg-mega-gray-50 p-3">
          <div>
            <p className="text-2xs text-mega-gray-500">Última sincronização</p>
            <p className="text-sm font-medium text-mega-black">
              {status?.ultimaSincronia ? formatarDataHora(status.ultimaSincronia) : "Ainda não executada"}
            </p>
          </div>
          <div>
            <p className="text-2xs text-mega-gray-500">Status</p>
            <p className="text-sm font-medium text-mega-black">{status?.ultimoStatus ?? "—"}</p>
          </div>
        </div>

        {status?.ultimaMensagemErro && (
          <p className="mb-4 rounded-md bg-mega-red-50 px-3 py-2 text-2xs text-mega-red-600">
            {status.ultimaMensagemErro}
          </p>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={testarConexao}
            disabled={testando}
            className="flex items-center gap-1.5 rounded-md border border-mega-gray-200 px-3.5 py-2 text-sm font-medium text-mega-gray-700 hover:bg-mega-gray-50 disabled:opacity-60"
          >
            {testando ? "Testando…" : "Testar Conexão"}
          </button>
          <button
            onClick={forcarSincronizacao}
            disabled={sincronizando}
            className="flex items-center gap-1.5 rounded-md bg-mega-red-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-mega-red-600 disabled:opacity-60"
          >
            <RefreshCw size={14} className={sincronizando ? "animate-spin" : ""} />
            {sincronizando ? "Sincronizando…" : "Atualizar Agora"}
          </button>
        </div>

        {resultadoTeste && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-md px-3 py-2.5 text-2xs ${
              resultadoTeste.ok ? "bg-emerald-50 text-emerald-700" : "bg-mega-red-50 text-mega-red-600"
            }`}
          >
            {resultadoTeste.ok ? (
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={14} className="mt-0.5 shrink-0" />
            )}
            {resultadoTeste.mensagem}
          </div>
        )}
      </div>

      <div className="mega-card p-5">
        <h3 className="mb-1 text-sm font-semibold text-mega-black">Parâmetros de Alerta</h3>
        <p className="mb-3 text-2xs text-mega-gray-500">
          Definidos via variáveis de ambiente no backend. Para alterar, atualize o arquivo{" "}
          <code className="rounded bg-mega-gray-100 px-1 py-0.5 font-mono">.env</code> e reinicie o
          servidor.
        </p>
        <ul className="flex flex-col gap-1.5 text-sm text-mega-gray-700">
          <li>• Limite de valor diário por loja</li>
          <li>• Limite de justificativas no mês por loja</li>
          <li>• Limite de horas para pendência prolongada</li>
          <li>• Percentual de crescimento regional para alerta</li>
        </ul>
      </div>
    </div>
  );
}
