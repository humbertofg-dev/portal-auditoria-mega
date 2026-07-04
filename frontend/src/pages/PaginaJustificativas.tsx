import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { BarraFiltros } from "@/components/ui/BarraFiltros";
import { TabelaJustificativas } from "@/components/justificativas/TabelaJustificativas";
import { Paginador } from "@/components/ui/Paginador";
import { ModalDetalheJustificativa } from "@/components/justificativas/ModalDetalheJustificativa";
import { usePolling } from "@/hooks/usePolling";
import * as justificativasService from "@/services/justificativas.service";
import { FiltrosGlobais } from "@/types";

export function PaginaJustificativas() {
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});
  const [pagina, setPagina] = useState(1);
  const [ordenarPor, setOrdenarPor] = useState("dataEnvio");
  const [ordem, setOrdem] = useState<"asc" | "desc">("desc");
  const [idSelecionado, setIdSelecionado] = useState<string | null>(null);
  const [menuExportacaoAberto, setMenuExportacaoAberto] = useState(false);

  const { dados, carregando, recarregar } = usePolling(
    () =>
      justificativasService.listarJustificativas(filtros, {
        pagina,
        porPagina: 20,
        ordenarPor,
        ordem,
      }),
    [filtros, pagina, ordenarPor, ordem],
    { intervaloMs: 15000 }
  );

  function aoOrdenar(campo: string) {
    if (campo === ordenarPor) {
      setOrdem((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setOrdenarPor(campo);
      setOrdem("desc");
    }
  }

  function aoMudarFiltros(novosFiltros: FiltrosGlobais) {
    setFiltros(novosFiltros);
    setPagina(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <BarraFiltros filtros={filtros} onChange={aoMudarFiltros} />
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuExportacaoAberto((v) => !v)}
            className="mega-card flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-mega-gray-700 hover:bg-mega-gray-50"
          >
            <Download size={15} />
            Exportar
          </button>
          {menuExportacaoAberto && (
            <div className="absolute right-0 top-full z-10 mt-1 w-44 animate-slide-in rounded-card border border-mega-gray-200 bg-white py-1 shadow-popover">
              <a
                href={justificativasService.urlExportacao("excel", filtros)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-mega-gray-700 hover:bg-mega-gray-50"
              >
                <FileSpreadsheet size={15} /> Excel
              </a>
              <a
                href={justificativasService.urlExportacao("csv", filtros)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-mega-gray-700 hover:bg-mega-gray-50"
              >
                <FileText size={15} /> CSV
              </a>
              <a
                href={justificativasService.urlExportacao("pdf", filtros)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-mega-gray-700 hover:bg-mega-gray-50"
              >
                <FileText size={15} /> PDF
              </a>
            </div>
          )}
        </div>
      </div>

      <TabelaJustificativas
        itens={dados?.itens ?? []}
        carregando={carregando}
        ordenarPor={ordenarPor}
        ordem={ordem}
        onOrdenar={aoOrdenar}
        onAbrirDetalhe={setIdSelecionado}
      />

      <Paginador paginacao={dados?.paginacao} onMudarPagina={setPagina} />

      {idSelecionado && (
        <ModalDetalheJustificativa
          id={idSelecionado}
          onFechar={() => setIdSelecionado(null)}
          onAtualizado={recarregar}
          onExcluida={() => {
            setIdSelecionado(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}
