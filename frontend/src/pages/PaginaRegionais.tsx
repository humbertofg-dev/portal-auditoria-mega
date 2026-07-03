import { useState } from "react";
import { MapPinned, Plus, X, Pencil, Trash2, Store, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/services/api";
import { Regional, Loja, Usuario } from "@/types";

export function PaginaRegionais() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.perfil === "ADMINISTRADOR";
  const [modalAberto, setModalAberto] = useState(false);
  const [regionalEditando, setRegionalEditando] = useState<Regional | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  const { dados: regionais, carregando, recarregar } = usePolling<Regional[]>(
    async () => {
      const { data } = await api.get("/regionais");
      return data;
    },
    [],
    { intervaloMs: 30000 }
  );

  function abrirNova() {
    setRegionalEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(regional: Regional) {
    setRegionalEditando(regional);
    setModalAberto(true);
  }

  async function excluir(regional: Regional) {
    if (!confirm(`Excluir a regional "${regional.nome}"? Esta ação não pode ser desfeita.`)) return;

    setErroExclusao(null);
    try {
      await api.delete(`/regionais/${regional.id}`);
      recarregar();
    } catch (e: any) {
      setErroExclusao(e?.response?.data?.erro ?? "Erro ao excluir regional.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-mega-gray-500">
          Cada regional agrupa um conjunto de lojas e pode ter um responsável designado.
        </p>
        {ehAdmin && (
          <button
            onClick={abrirNova}
            className="flex items-center gap-1.5 rounded-md bg-mega-red-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-mega-red-600"
          >
            <Plus size={15} />
            Nova Regional
          </button>
        )}
      </div>

      {erroExclusao && (
        <p className="rounded-md bg-mega-red-50 px-3 py-2 text-sm text-mega-red-600">{erroExclusao}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {carregando &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mega-card h-28 animate-pulse p-4" />
          ))}

        {!carregando &&
          (regionais ?? []).map((r) => (
            <div key={r.id} className="mega-card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mega-red-50 text-mega-red-500">
                    <MapPinned size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-mega-black">{r.nome}</p>
                    <p className="text-2xs text-mega-gray-500">
                      {r._count?.lojas ?? 0} loja(s) vinculada(s)
                    </p>
                  </div>
                </div>

                {ehAdmin && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => abrirEdicao(r)}
                      className="rounded-md p-1.5 text-mega-gray-400 hover:bg-mega-gray-100 hover:text-mega-black"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => excluir(r)}
                      className="rounded-md p-1.5 text-mega-gray-400 hover:bg-mega-red-50 hover:text-mega-red-500"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {r.responsavel && (
                <div className="flex items-center gap-1.5 text-2xs text-mega-gray-500">
                  <UserCircle size={13} />
                  Responsável: <span className="font-medium text-mega-gray-700">{r.responsavel.nome}</span>
                </div>
              )}
            </div>
          ))}

        {!carregando && (regionais ?? []).length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-mega-gray-400">
            Nenhuma regional cadastrada ainda.
          </p>
        )}
      </div>

      {modalAberto && (
        <ModalRegional
          regional={regionalEditando}
          onFechar={() => setModalAberto(false)}
          onSalva={() => {
            setModalAberto(false);
            recarregar();
          }}
        />
      )}
    </div>
  );
}

function ModalRegional({
  regional,
  onFechar,
  onSalva,
}: {
  regional: Regional | null;
  onFechar: () => void;
  onSalva: () => void;
}) {
  const ehEdicao = !!regional;

  const [nome, setNome] = useState(regional?.nome ?? "");
  const [responsavelId, setResponsavelId] = useState(regional?.responsavelId ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { dados: usuarios } = usePolling<Usuario[]>(
    async () => {
      const { data } = await api.get("/usuarios");
      return data;
    },
    [],
    { intervaloMs: 60000 }
  );

  // Carrega o detalhe completo (com lista de lojas) só quando em modo edição.
  const { dados: detalheRegional, recarregar: recarregarDetalhe } = usePolling<Regional>(
    async () => {
      const { data } = await api.get(`/regionais/${regional!.id}`);
      return data;
    },
    [regional?.id],
    { intervaloMs: 0, ativo: ehEdicao }
  );

  const { dados: todasLojas, recarregar: recarregarTodasLojas } = usePolling<Loja[]>(
    async () => {
      const { data } = await api.get("/lojas");
      return data;
    },
    [],
    { intervaloMs: 0, ativo: ehEdicao }
  );

  async function salvar() {
    if (!nome.trim()) {
      setErro("O nome é obrigatório.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const payload = { nome, responsavelId: responsavelId || null };
      if (ehEdicao) {
        await api.put(`/regionais/${regional!.id}`, payload);
      } else {
        await api.post("/regionais", payload);
      }
      onSalva();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Erro ao salvar regional.");
    } finally {
      setEnviando(false);
    }
  }

  async function alterarLojaDaRegional(lojaId: string, novaRegionalId: string | null) {
    await api.put(`/lojas/${lojaId}`, { regionalId: novaRegionalId });
    await Promise.all([recarregarDetalhe(), recarregarTodasLojas()]);
  }

  const lojasDoGrupo = detalheRegional?.lojas ?? [];
  const lojasForaDoGrupo = (todasLojas ?? []).filter(
    (l) => l.regionalId !== regional?.id
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-mega-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-card bg-white shadow-popover">
        <div className="flex items-center justify-between border-b border-mega-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-mega-black">
            {ehEdicao ? "Editar Regional" : "Nova Regional"}
          </h2>
          <button onClick={onFechar} className="rounded-md p-1.5 hover:bg-mega-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                Nome*
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-md border border-mega-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                Responsável
              </label>
              <select
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                className="w-full rounded-md border border-mega-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Nenhum</option>
                {(usuarios ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {erro && <p className="text-2xs text-mega-red-600">{erro}</p>}

            <button
              onClick={salvar}
              disabled={enviando}
              className="rounded-md bg-mega-red-500 py-2.5 text-sm font-semibold text-white hover:bg-mega-red-600 disabled:opacity-60"
            >
              {enviando ? "Salvando…" : "Salvar"}
            </button>
          </div>

          {ehEdicao && (
            <div className="mt-6 border-t border-mega-gray-100 pt-4">
              <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                Grupo de Lojas ({lojasDoGrupo.length})
              </h3>

              <div className="mb-3 flex flex-col gap-1.5">
                {lojasDoGrupo.length === 0 && (
                  <p className="text-2xs text-mega-gray-400">Nenhuma loja vinculada a esta regional.</p>
                )}
                {lojasDoGrupo.map((loja) => (
                  <div
                    key={loja.id}
                    className="flex items-center justify-between rounded-md bg-mega-gray-50 px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm text-mega-black">
                      <Store size={13} className="text-mega-gray-400" />
                      {loja.nome} <span className="text-2xs text-mega-gray-400">({loja.codigo})</span>
                    </span>
                    <button
                      onClick={() => alterarLojaDaRegional(loja.id, null)}
                      className="text-2xs font-medium text-mega-red-500 hover:underline"
                    >
                      Remover do grupo
                    </button>
                  </div>
                ))}
              </div>

              {lojasForaDoGrupo.length > 0 && (
                <div>
                  <label className="mb-1 block text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                    Adicionar loja ao grupo
                  </label>
                  <select
                    value=""
                    onChange={(e) => e.target.value && alterarLojaDaRegional(e.target.value, regional!.id)}
                    className="w-full rounded-md border border-mega-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Selecione uma loja…</option>
                    {lojasForaDoGrupo.map((loja) => (
                      <option key={loja.id} value={loja.id}>
                        {loja.nome} ({loja.codigo})
                        {loja.regional ? ` — atualmente em ${loja.regional.nome}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
