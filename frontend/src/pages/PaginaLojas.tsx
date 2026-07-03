import { useState } from "react";
import { Plus, Store, X, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/services/api";
import { Loja, Regional } from "@/types";

export function PaginaLojas() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.perfil === "ADMINISTRADOR";
  const [lojaEditando, setLojaEditando] = useState<Loja | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const { dados: lojas, carregando, recarregar } = usePolling<Loja[]>(
    async () => {
      const { data } = await api.get("/lojas");
      return data;
    },
    [],
    { intervaloMs: 30000 }
  );

  const { dados: regionais } = usePolling<Regional[]>(
    async () => {
      const { data } = await api.get("/regionais");
      return data;
    },
    [],
    { intervaloMs: 60000 }
  );

  function abrirNova() {
    setLojaEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(loja: Loja) {
    setLojaEditando(loja);
    setModalAberto(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-mega-gray-500">
          O código deve ser idêntico ao valor da lista suspensa "Loja" do Google Forms.
        </p>
        {ehAdmin && (
          <button
            onClick={abrirNova}
            className="flex items-center gap-1.5 rounded-md bg-mega-red-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-mega-red-600"
          >
            <Plus size={15} />
            Nova Loja
          </button>
        )}
      </div>

      <div className="mega-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-mega-gray-200 bg-mega-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Código</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Nome</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Cidade/UF</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Regional</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Gerente</th>
              {ehAdmin && <th className="w-10 px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-mega-gray-100">
            {carregando &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-mega-gray-100" />
                  </td>
                </tr>
              ))}

            {!carregando &&
              (lojas ?? []).map((loja) => (
                <tr key={loja.id} className="hover:bg-mega-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-mega-gray-600">{loja.codigo}</td>
                  <td className="px-4 py-3 font-medium text-mega-black">
                    <span className="flex items-center gap-2">
                      <Store size={14} className="text-mega-gray-400" />
                      {loja.nome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mega-gray-600">
                    {loja.cidade ? `${loja.cidade}/${loja.uf ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-mega-gray-600">{(loja as any).regional?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-mega-gray-600">{loja.gerente ?? "—"}</td>
                  {ehAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => abrirEdicao(loja)}
                        className="rounded-md p-1.5 text-mega-gray-400 hover:bg-mega-gray-100 hover:text-mega-black"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

            {!carregando && (lojas ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-mega-gray-400">
                  Nenhuma loja cadastrada. Cadastre as lojas para habilitar o vínculo automático
                  com as respostas do Forms.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <ModalLoja
          loja={lojaEditando}
          regionais={regionais ?? []}
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

function ModalLoja({
  loja,
  regionais,
  onFechar,
  onSalva,
}: {
  loja: Loja | null;
  regionais: Regional[];
  onFechar: () => void;
  onSalva: () => void;
}) {
  const ehEdicao = !!loja;

  const [form, setForm] = useState({
    codigo: loja?.codigo ?? "",
    nome: loja?.nome ?? "",
    cidade: loja?.cidade ?? "",
    uf: loja?.uf ?? "",
    regionalId: loja?.regionalId ?? "",
    gerente: loja?.gerente ?? "",
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!form.codigo || !form.nome) {
      setErro("Código e nome são obrigatórios.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const payload = { ...form, regionalId: form.regionalId || undefined };
      if (ehEdicao) {
        await api.put(`/lojas/${loja!.id}`, payload);
      } else {
        await api.post("/lojas", payload);
      }
      onSalva();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? `Erro ao ${ehEdicao ? "atualizar" : "criar"} loja.`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-mega-black/50 p-4">
      <div className="w-full max-w-md rounded-card bg-white shadow-popover">
        <div className="flex items-center justify-between border-b border-mega-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-mega-black">
            {ehEdicao ? "Editar Loja" : "Nova Loja"}
          </h2>
          <button onClick={onFechar} className="rounded-md p-1.5 hover:bg-mega-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div>
            <Campo
              rotulo="Código*"
              valor={form.codigo}
              onChange={(v) => setForm({ ...form, codigo: v })}
              desabilitado={ehEdicao}
            />
            <p className="mt-1 text-2xs text-mega-gray-400">
              {ehEdicao
                ? "O código não pode ser alterado — ele é usado para vincular as respostas do Forms."
                : "Use exatamente o mesmo código que aparece na lista suspensa 'Loja' do Google Forms."}
            </p>
          </div>
          <Campo rotulo="Nome*" valor={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
          <div className="flex gap-3">
            <Campo rotulo="Cidade" valor={form.cidade} onChange={(v) => setForm({ ...form, cidade: v })} />
            <Campo rotulo="UF" valor={form.uf} onChange={(v) => setForm({ ...form, uf: v })} largura="w-20" />
          </div>
          <div>
            <label className="mb-1 block text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
              Regional
            </label>
            <select
              value={form.regionalId}
              onChange={(e) => setForm({ ...form, regionalId: e.target.value })}
              className="w-full rounded-md border border-mega-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {regionais.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </div>
          <Campo
            rotulo="Gerente"
            valor={form.gerente}
            onChange={(v) => setForm({ ...form, gerente: v })}
          />
          {erro && <p className="text-2xs text-mega-red-600">{erro}</p>}
          <button
            onClick={salvar}
            disabled={enviando}
            className="mt-1 rounded-md bg-mega-red-500 py-2.5 text-sm font-semibold text-white hover:bg-mega-red-600 disabled:opacity-60"
          >
            {enviando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({
  rotulo,
  valor,
  onChange,
  largura = "flex-1",
  desabilitado = false,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  largura?: string;
  desabilitado?: boolean;
}) {
  return (
    <div className={largura}>
      <label className="mb-1 block text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
        {rotulo}
      </label>
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        disabled={desabilitado}
        className="w-full rounded-md border border-mega-gray-200 px-3 py-2 text-sm disabled:bg-mega-gray-50 disabled:text-mega-gray-400"
      />
    </div>
  );
}
