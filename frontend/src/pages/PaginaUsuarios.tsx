import { useState } from "react";
import { Plus, ShieldCheck, X } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/services/api";
import { Usuario, PerfilUsuario } from "@/types";

const ROTULO_PERFIL: Record<PerfilUsuario, string> = {
  ADMINISTRADOR: "Administrador",
  AUDITORIA: "Auditoria",
  CONSULTA: "Consulta",
};

const COR_PERFIL: Record<PerfilUsuario, string> = {
  ADMINISTRADOR: "bg-mega-red-50 text-mega-red-600",
  AUDITORIA: "bg-blue-50 text-blue-700",
  CONSULTA: "bg-mega-gray-100 text-mega-gray-600",
};

export function PaginaUsuarios() {
  const [modalAberto, setModalAberto] = useState(false);

  const { dados: usuarios, carregando, recarregar } = usePolling<
    (Usuario & { ativo: boolean })[]
  >(
    async () => {
      const { data } = await api.get("/usuarios");
      return data;
    },
    [],
    { intervaloMs: 30000 }
  );

  async function alternarAtivo(usuario: Usuario & { ativo: boolean }) {
    await api.put(`/usuarios/${usuario.id}`, { ativo: !usuario.ativo });
    recarregar();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-mega-gray-500">
          Gestão de acesso ao Portal. As lojas não possuem usuários — utilizam apenas o Google Forms.
        </p>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-1.5 rounded-md bg-mega-red-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-mega-red-600"
        >
          <Plus size={15} />
          Novo Usuário
        </button>
      </div>

      <div className="mega-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-mega-gray-200 bg-mega-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Nome</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">E-mail</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Perfil</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">Status</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500" />
            </tr>
          </thead>
          <tbody className="divide-y divide-mega-gray-100">
            {carregando &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-mega-gray-100" />
                  </td>
                </tr>
              ))}

            {!carregando &&
              (usuarios ?? []).map((u) => (
                <tr key={u.id} className="hover:bg-mega-gray-50">
                  <td className="px-4 py-3 font-medium text-mega-black">
                    <span className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-mega-gray-400" />
                      {u.nome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mega-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`mega-badge ${COR_PERFIL[u.perfil]}`}>{ROTULO_PERFIL[u.perfil]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`mega-badge ${u.ativo ? "bg-emerald-50 text-emerald-700" : "bg-mega-gray-100 text-mega-gray-500"}`}
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => alternarAtivo(u)}
                      className="text-2xs font-medium text-mega-red-500 hover:underline"
                    >
                      {u.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <ModalNovoUsuario
          onFechar={() => setModalAberto(false)}
          onCriado={() => {
            setModalAberto(false);
            recarregar();
          }}
        />
      )}
    </div>
  );
}

function ModalNovoUsuario({ onFechar, onCriado }: { onFechar: () => void; onCriado: () => void }) {
  const [form, setForm] = useState({ nome: "", email: "", senha: "", perfil: "CONSULTA" as PerfilUsuario });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!form.nome || !form.email || form.senha.length < 8) {
      setErro("Preencha nome, e-mail e uma senha com pelo menos 8 caracteres.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await api.post("/usuarios", form);
      onCriado();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Erro ao criar usuário.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-mega-black/50 p-4">
      <div className="w-full max-w-sm rounded-card bg-white shadow-popover">
        <div className="flex items-center justify-between border-b border-mega-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-mega-black">Novo Usuário</h2>
          <button onClick={onFechar} className="rounded-md p-1.5 hover:bg-mega-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <input
            type="text"
            placeholder="Nome completo"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="w-full rounded-md border border-mega-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="E-mail corporativo"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-md border border-mega-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Senha provisória (mín. 8 caracteres)"
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            className="w-full rounded-md border border-mega-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={form.perfil}
            onChange={(e) => setForm({ ...form, perfil: e.target.value as PerfilUsuario })}
            className="w-full rounded-md border border-mega-gray-200 px-3 py-2 text-sm"
          >
            <option value="CONSULTA">Consulta</option>
            <option value="AUDITORIA">Auditoria</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </select>
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
