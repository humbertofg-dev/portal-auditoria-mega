import { ChevronLeft, ChevronRight } from "lucide-react";
import { Paginacao } from "@/types";

export function Paginador({
  paginacao,
  onMudarPagina,
}: {
  paginacao: Paginacao | undefined;
  onMudarPagina: (pagina: number) => void;
}) {
  if (!paginacao || paginacao.total === 0) return null;

  return (
    <div className="flex items-center justify-between px-1 py-2">
      <p className="text-2xs text-mega-gray-500">
        Mostrando {(paginacao.pagina - 1) * paginacao.porPagina + 1}–
        {Math.min(paginacao.pagina * paginacao.porPagina, paginacao.total)} de {paginacao.total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onMudarPagina(paginacao.pagina - 1)}
          disabled={paginacao.pagina <= 1}
          className="rounded-md p-1.5 text-mega-gray-500 hover:bg-mega-gray-100 disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 text-xs font-medium text-mega-gray-700">
          {paginacao.pagina} / {paginacao.totalPaginas || 1}
        </span>
        <button
          onClick={() => onMudarPagina(paginacao.pagina + 1)}
          disabled={paginacao.pagina >= paginacao.totalPaginas}
          className="rounded-md p-1.5 text-mega-gray-500 hover:bg-mega-gray-100 disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
