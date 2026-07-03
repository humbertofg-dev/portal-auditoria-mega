import { api } from "@/services/api";
import {
  CardsDashboard,
  TopLoja,
  PontoEvolucao,
  MotivoAgregado,
  ProdutoAgregado,
  RegionalHeatmap,
  Alerta,
  FiltrosGlobais,
} from "@/types";

function paramsDeFiltros(filtros: FiltrosGlobais) {
  return Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ""));
}

export async function buscarCards(filtros: FiltrosGlobais): Promise<CardsDashboard> {
  const { data } = await api.get("/dashboard/cards", { params: paramsDeFiltros(filtros) });
  return data;
}

export async function buscarTopLojas(filtros: FiltrosGlobais): Promise<TopLoja[]> {
  const { data } = await api.get("/dashboard/top-lojas", { params: paramsDeFiltros(filtros) });
  return data;
}

export async function buscarEvolucao(
  filtros: FiltrosGlobais,
  granularidade: "diaria" | "semanal" | "mensal"
): Promise<PontoEvolucao[]> {
  const { data } = await api.get("/dashboard/evolucao", {
    params: { ...paramsDeFiltros(filtros), granularidade },
  });
  return data;
}

export async function buscarMotivos(filtros: FiltrosGlobais): Promise<MotivoAgregado[]> {
  const { data } = await api.get("/dashboard/motivos", { params: paramsDeFiltros(filtros) });
  return data;
}

export async function buscarProdutosAjustados(filtros: FiltrosGlobais): Promise<ProdutoAgregado[]> {
  const { data } = await api.get("/dashboard/produtos-ajustados", { params: paramsDeFiltros(filtros) });
  return data;
}

export async function buscarHeatmapRegional(filtros: FiltrosGlobais): Promise<RegionalHeatmap[]> {
  const { data } = await api.get("/dashboard/heatmap-regional", { params: paramsDeFiltros(filtros) });
  return data;
}

export async function buscarRanking(
  tipo: "gerentes" | "regionais",
  filtros: FiltrosGlobais
): Promise<{ nome: string; valorTotal: number; quantidade: number }[]> {
  const { data } = await api.get(`/dashboard/ranking/${tipo}`, { params: paramsDeFiltros(filtros) });
  return data;
}

export async function buscarAlertas(apenasAtivos = true): Promise<Alerta[]> {
  const { data } = await api.get("/dashboard/alertas", {
    params: { resolvidos: apenasAtivos ? "false" : "true" },
  });
  return data;
}
