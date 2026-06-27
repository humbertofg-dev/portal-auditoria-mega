import { useState } from "react";
import { MapPinned, Plus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/services/api";

interface RegionalComContagem {
  id: string;
  nome: string;
  codigo?: string | null;
  _count: { lojas: number };
}

export function PaginaRegionais() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.perfil === "ADMINISTRADOR";
  const [modalAberto, setModalAberto] = useState(false);

  const { dados: regionais, carregando, recarregar } = usePolling<RegionalComContagem[]>(
    async () => {
      const { data } = await api.get("/regionais");
      return data;
    },
    [],
    { intervaloMs: 30000 }
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        {ehAdmin && (
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-1.5 rounded-md bg-mega-red-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-mega-red-600"
          >
            <Plus size={15} />
            Nova Regional
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {carregando &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mega-card h-24 animate-pulse p-4" />
          ))}

        {!carregando &&
          (regionais ?? []).map((r) => (
            <div key={r.id} className="mega-card flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-mega-red-50 text-mega-red-500">
                <MapPinned size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-mega-black">{r.nome}</p>
                <p className="text-2xs text-mega-gray-500">{r._count.lojas} loja(s) vinculada(s)</p>
              </div>
            </div>
          ))}
      </div>

      {modalAberto && (
        <ModalNovaRegional
          onFechar={() => setModalAberto(false)}
          onCriada={() => {
            setModalAberto(false);
            recarregar();
          }}
        />
      )}
    </div>
  );
}

function ModalNovaRegional({ onFechar, onCriada }: { onFechar: () => void; onCriada: () => void }) {
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) {
      setErro("O nome é obrigatório.");
      return;
    }
    setEnviando(true);
    try {
      await api.post("/regionais", { nome });
      onCriada();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Erro ao criar regional.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-mega-black/50 p-4">
      <div className="w-full max-w-sm rounded-card bg-white shadow-popover">
        <div className="flex items-center justify-between border-b border-mega-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-mega-black">Nova Regional</h2>
          <button onClick={onFechar} className="rounded-md p-1.5 hover:bg-mega-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <input
            type="text"
            placeholder="Nome da regional"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-md border border-mega-gray-200 px-3 py-2 text-sm"
          />
          {erro && <p className="text-2xs text-mega-red-600">{erro}</p>}
          <button
            onClick={salvar}
            disabled={enviando}
            className="rounded-md bg-mega-red-500 py-2.5 text-sm font-semibold text-white hover:bg-mega-red-600 disabled:opacity-60"
          >
            {enviando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
