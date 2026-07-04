import { useEffect, useState } from "react";
import { X, Paperclip, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import * as justificativasService from "@/services/justificativas.service";
import { Justificativa, StatusJustificativa } from "@/types";
import { BadgeStatus, BadgeRisco } from "@/components/ui/Badges";
import { formatarDataHora, formatarMoeda, LABEL_STATUS } from "@/utils/formatadores";

const STATUS_ANALISE: StatusJustificativa[] = [
  "EM_ANALISE",
  "APROVADO",
  "REPROVADO",
  "SOLICITADO_COMPLEMENTACAO",
];

export function ModalDetalheJustificativa({
  id,
  onFechar,
  onAtualizado,
  onExcluida,
}: {
  id: string;
  onFechar: () => void;
  onAtualizado: () => void;
  onExcluida?: () => void;
}) {
  const { usuario } = useAuth();
  const podeAnalisar = usuario?.perfil === "AUDITORIA" || usuario?.perfil === "ADMINISTRADOR";
  const podeExcluir = usuario?.perfil === "ADMINISTRADOR";

  const [justificativa, setJustificativa] = useState<Justificativa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [statusSelecionado, setStatusSelecionado] = useState<StatusJustificativa>("EM_ANALISE");
  const [parecer, setParecer] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await justificativasService.buscarJustificativa(id);
      setJustificativa(dados);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function registrarAnalise() {
    if (!parecer.trim()) {
      setErro("O parecer técnico é obrigatório.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await justificativasService.registrarAnalise(id, {
        status: statusSelecionado,
        parecerTecnico: parecer,
        observacoes: observacoes || undefined,
      });
      setParecer("");
      setObservacoes("");
      await carregar();
      onAtualizado();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Erro ao registrar análise.");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarComentario() {
    if (!comentario.trim()) return;
    await justificativasService.adicionarComentario(id, comentario);
    setComentario("");
    await carregar();
  }

  async function excluir() {
    const confirmado = confirm(
      "Excluir esta justificativa? Esta ação não pode ser desfeita e remove também o histórico, pareceres, comentários e alertas associados a ela."
    );
    if (!confirmado) return;

    setExcluindo(true);
    try {
      await justificativasService.excluirJustificativa(id);
      onExcluida?.();
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Erro ao excluir justificativa.");
      setExcluindo(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-mega-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-card bg-white shadow-popover">
        <div className="flex items-center justify-between border-b border-mega-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-mega-black">Detalhamento da Justificativa</h2>
          <div className="flex items-center gap-1">
            {podeExcluir && (
              <button
                onClick={excluir}
                disabled={excluindo}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-mega-red-500 hover:bg-mega-red-50 disabled:opacity-60"
                title="Excluir justificativa"
              >
                <Trash2 size={14} />
                {excluindo ? "Excluindo…" : "Excluir"}
              </button>
            )}
            <button onClick={onFechar} className="rounded-md p-1.5 hover:bg-mega-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {carregando && <p className="py-10 text-center text-sm text-mega-gray-400">Carregando…</p>}

          {!carregando && justificativa && (
            <div className="flex flex-col gap-5">
              {/* --- Dados do formulário --- */}
              <section>
                <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                  Dados enviados no formulário
                </h3>
                <div className="grid grid-cols-2 gap-3 rounded-md bg-mega-gray-50 p-3 text-sm sm:grid-cols-3">
                  <Campo rotulo="Loja" valor={justificativa.loja?.nome ?? justificativa.lojaCodigoBruto} />
                  <Campo rotulo="Regional" valor={justificativa.loja?.regional?.nome ?? "—"} />
                  <Campo
                    rotulo="Produto"
                    valor={justificativa.produtoNome ?? justificativa.produtoCodigo ?? "—"}
                  />
                  <Campo rotulo="Valor Ajustado" valor={formatarMoeda(justificativa.valorAjustado)} />
                  <Campo rotulo="Motivo" valor={justificativa.motivo} />
                  <Campo rotulo="Responsável" valor={justificativa.responsavel ?? "—"} />
                  <Campo rotulo="Data de Envio" valor={formatarDataHora(justificativa.dataEnvio)} />
                  {justificativa.dataOcorrencia && (
                    <Campo rotulo="Data do Ajuste" valor={formatarDataHora(justificativa.dataOcorrencia)} />
                  )}
                  <div>
                    <p className="text-2xs text-mega-gray-500">Status / Risco</p>
                    <div className="mt-0.5 flex gap-1.5">
                      <BadgeStatus status={justificativa.status} />
                      <BadgeRisco nivel={justificativa.nivelRisco} />
                    </div>
                  </div>
                </div>
                {justificativa.itemDaSubmissao && justificativa.itemDaSubmissao > 1 && (
                  <p className="mt-2 text-2xs text-mega-gray-500">
                    Este produto faz parte de uma resposta do Forms com múltiplos itens (produto{" "}
                    {justificativa.itemDaSubmissao} da mesma submissão).
                  </p>
                )}
                {justificativa.motivoDetalhe && (
                  <p className="mt-2 rounded-md bg-mega-gray-50 p-3 text-sm text-mega-gray-700">
                    {justificativa.motivoDetalhe}
                  </p>
                )}
              </section>

              {/* --- Anexos --- */}
              {justificativa.anexosUrls.length > 0 && (
                <section>
                  <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                    Arquivos anexados
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {justificativa.anexosUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-md border border-mega-gray-200 px-2.5 py-1.5 text-xs text-mega-gray-700 hover:bg-mega-gray-50"
                      >
                        <Paperclip size={13} />
                        Anexo {i + 1}
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* --- Timeline / Histórico --- */}
              <section>
                <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                  Timeline
                </h3>
                <ul className="flex flex-col gap-2.5 border-l border-mega-gray-200 pl-4">
                  {justificativa.historico?.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-mega-red-500" />
                      <p className="text-xs font-medium text-mega-black">
                        {LABEL_STATUS[h.statusNovo]}
                      </p>
                      {h.observacao && <p className="text-2xs text-mega-gray-500">{h.observacao}</p>}
                      <p className="text-2xs text-mega-gray-400">{formatarDataHora(h.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* --- Pareceres anteriores --- */}
              {justificativa.analises && justificativa.analises.length > 0 && (
                <section>
                  <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                    Parecer da Auditoria
                  </h3>
                  <div className="flex flex-col gap-2">
                    {justificativa.analises.map((a) => (
                      <div key={a.id} className="rounded-md border border-mega-gray-200 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-semibold text-mega-black">{a.auditor.nome}</span>
                          <BadgeStatus status={a.status} />
                        </div>
                        <p className="text-sm text-mega-gray-700">{a.parecerTecnico}</p>
                        {a.observacoes && (
                          <p className="mt-1 text-2xs text-mega-gray-500">{a.observacoes}</p>
                        )}
                        <p className="mt-1 text-2xs text-mega-gray-400">{formatarDataHora(a.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* --- Nova análise (apenas Auditoria/Admin) --- */}
              {podeAnalisar && (
                <section className="rounded-md border border-mega-red-100 bg-mega-red-50/30 p-3.5">
                  <h3 className="mb-2.5 text-2xs font-semibold uppercase tracking-wide text-mega-red-600">
                    Registrar Análise da Auditoria
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    <select
                      value={statusSelecionado}
                      onChange={(e) => setStatusSelecionado(e.target.value as StatusJustificativa)}
                      className="rounded-md border border-mega-gray-200 px-2.5 py-2 text-sm"
                    >
                      {STATUS_ANALISE.map((s) => (
                        <option key={s} value={s}>
                          {LABEL_STATUS[s]}
                        </option>
                      ))}
                    </select>
                    <textarea
                      placeholder="Parecer técnico (obrigatório)"
                      value={parecer}
                      onChange={(e) => setParecer(e.target.value)}
                      rows={3}
                      className="rounded-md border border-mega-gray-200 px-2.5 py-2 text-sm"
                    />
                    <textarea
                      placeholder="Observações adicionais (opcional)"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={2}
                      className="rounded-md border border-mega-gray-200 px-2.5 py-2 text-sm"
                    />
                    {erro && <p className="text-2xs text-mega-red-600">{erro}</p>}
                    <button
                      onClick={registrarAnalise}
                      disabled={enviando}
                      className="self-end rounded-md bg-mega-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-mega-red-600 disabled:opacity-60"
                    >
                      {enviando ? "Registrando…" : "Registrar Análise"}
                    </button>
                  </div>
                </section>
              )}

              {/* --- Comentários --- */}
              <section>
                <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
                  Comentários
                </h3>
                <div className="mb-2 flex flex-col gap-2">
                  {justificativa.comentarios?.map((c) => (
                    <div key={c.id} className="rounded-md bg-mega-gray-50 p-2.5">
                      <p className="text-xs font-semibold text-mega-black">{c.usuario.nome}</p>
                      <p className="text-sm text-mega-gray-700">{c.texto}</p>
                      <p className="text-2xs text-mega-gray-400">{formatarDataHora(c.createdAt)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Adicionar comentário…"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && enviarComentario()}
                    className="flex-1 rounded-md border border-mega-gray-200 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={enviarComentario}
                    className="rounded-md bg-mega-black p-2 text-white hover:bg-mega-gray-800"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-2xs text-mega-gray-500">{rotulo}</p>
      <p className="font-medium text-mega-black">{valor}</p>
    </div>
  );
}
