import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { TabelaJustificativas } from "@/components/justificativas/TabelaJustificativas";
import { Paginador } from "@/components/ui/Paginador";
import { ModalDetalheJustificativa } from "@/components/justificativas/ModalDetalheJustificativa";
import { usePolling } from "@/hooks/usePolling";
import * as justificativasService from "@/services/justificativas.service";

/**
 * Tela de Pendências: atalho operacional para a Auditoria, sempre mostrando
 * apenas as justificativas que ainda exigem ação (RECEBIDO, EM_ANALISE,
 * SOLICITADO_COMPLEMENTACAO), ordenadas pelas mais antigas primeiro —
 * já que são essas que correm risco de virar alerta de "pendência > 24h".
 */
export function PaginaPendencias() {
  const [pagina, setPagina] = useState(1);
  const [idSelecionado, setIdSelecionado] = useState<string | null>(null);

  const { dados, carregando, recarregar } = usePolling(
    () =>
      justificativasService.listarJustificativas(
        {},
        { pagina, porPagina: 20, ordenarPor: "createdAt", ordem: "asc" }
      ),
    [pagina],
    { intervaloMs: 15000 }
  );

  // Filtra no cliente apenas os status pendentes — o backend já devolve todos
  // os status quando nenhum filtro é passado; aqui aplicamos a regra fixa da tela.
  const itensPendentes = (dados?.itens ?? []).filter((j) =>
    ["RECEBIDO", "EM_ANALISE", "SOLICITADO_COMPLEMENTACAO"].includes(j.status)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="mega-card flex items-center gap-2.5 border-amber-200 bg-amber-50 px-4 py-3">
        <AlertCircle size={16} className="text-amber-600" />
        <p className="text-sm text-amber-800">
          Justificativas que ainda aguardam ação da Auditoria, das mais antigas para as mais recentes.
        </p>
      </div>

      <TabelaJustificativas
        itens={itensPendentes}
        carregando={carregando}
        ordenarPor="createdAt"
        ordem="asc"
        onOrdenar={() => {}}
        onAbrirDetalhe={setIdSelecionado}
      />

      <Paginador paginacao={dados?.paginacao} onMudarPagina={setPagina} />

      {idSelecionado && (
        <ModalDetalheJustificativa
          id={idSelecionado}
          onFechar={() => setIdSelecionado(null)}
          onAtualizado={recarregar}
        />
      )}
    </div>
  );
}
