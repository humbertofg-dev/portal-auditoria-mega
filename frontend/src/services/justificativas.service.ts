import { api } from "@/services/api";
import { Justificativa, FiltrosGlobais, Paginacao, StatusJustificativa } from "@/types";

function paramsDeFiltros(filtros: FiltrosGlobais) {
  return Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ""));
}

interface ListaJustificativas {
  itens: Justificativa[];
  paginacao: Paginacao;
}

export async function listarJustificativas(
  filtros: FiltrosGlobais,
  opcoes: { pagina?: number; porPagina?: number; ordenarPor?: string; ordem?: "asc" | "desc" } = {}
): Promise<ListaJustificativas> {
  const { data } = await api.get("/justificativas", {
    params: { ...paramsDeFiltros(filtros), ...opcoes },
  });
  return data;
}

export async function buscarJustificativa(id: string): Promise<Justificativa> {
  const { data } = await api.get(`/justificativas/${id}`);
  return data;
}

export async function registrarAnalise(
  id: string,
  payload: { status: StatusJustificativa; parecerTecnico: string; observacoes?: string }
) {
  const { data } = await api.post(`/justificativas/${id}/analise`, payload);
  return data;
}

export async function adicionarComentario(id: string, texto: string) {
  const { data } = await api.post(`/justificativas/${id}/comentarios`, { texto });
  return data;
}

export function urlExportacao(formato: "excel" | "csv" | "pdf", filtros: FiltrosGlobais): string {
  const params = new URLSearchParams(paramsDeFiltros(filtros) as Record<string, string>);
  const base = (import.meta.env.VITE_API_URL ?? "http://localhost:3001/api").replace(/\/$/, "");
  return `${base}/exportacao/${formato}?${params.toString()}`;
}
