import { useState } from "react";
import { FileSpreadsheet, FileText, Printer, Share2 } from "lucide-react";
import { BarraFiltros } from "@/components/ui/BarraFiltros";
import * as justificativasService from "@/services/justificativas.service";
import { FiltrosGlobais } from "@/types";

export function PaginaRelatorios() {
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});

  async function compartilhar() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Portal Auditoria MEGA — Relatório", url });
      } catch {
        // usuário cancelou o compartilhamento
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copiado para a área de transferência.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <BarraFiltros filtros={filtros} onChange={setFiltros} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoExportacao
          icone={<FileSpreadsheet size={20} />}
          titulo="Excel"
          descricao="Planilha completa com todas as colunas para análise."
          href={justificativasService.urlExportacao("excel", filtros)}
        />
        <CartaoExportacao
          icone={<FileText size={20} />}
          titulo="CSV"
          descricao="Formato leve, compatível com qualquer ferramenta de BI."
          href={justificativasService.urlExportacao("csv", filtros)}
        />
        <CartaoExportacao
          icone={<FileText size={20} />}
          titulo="PDF"
          descricao="Relatório executivo formatado, pronto para impressão."
          href={justificativasService.urlExportacao("pdf", filtros)}
        />
        <button
          onClick={() => window.print()}
          className="mega-card flex flex-col items-start gap-2 p-4 text-left transition-shadow hover:shadow-card-hover"
        >
          <span className="text-mega-red-500">
            <Printer size={20} />
          </span>
          <span className="text-sm font-semibold text-mega-black">Imprimir</span>
          <span className="text-2xs text-mega-gray-500">Imprime a visão atual do navegador.</span>
        </button>
      </div>

      <button
        onClick={compartilhar}
        className="mega-card flex w-fit items-center gap-2 px-4 py-2.5 text-sm font-medium text-mega-gray-700 hover:bg-mega-gray-50"
      >
        <Share2 size={16} />
        Compartilhar link com os filtros atuais
      </button>
    </div>
  );
}

function CartaoExportacao({
  icone,
  titulo,
  descricao,
  href,
}: {
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="mega-card flex flex-col items-start gap-2 p-4 transition-shadow hover:shadow-card-hover"
    >
      <span className="text-mega-red-500">{icone}</span>
      <span className="text-sm font-semibold text-mega-black">{titulo}</span>
      <span className="text-2xs text-mega-gray-500">{descricao}</span>
    </a>
  );
}
