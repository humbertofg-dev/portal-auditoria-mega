import { api } from "./api";
import {
  ControleDiario,
  DashboardControleDiario,
  HistoricoControleDiario,
  StatusControleDiario,
} from "@/types";

export async function buscarControleDoDia(data?: string): Promise<ControleDiario | null> {
  try {
    const { data: res } = await api.get("/controle-diario/hoje", {
      params: data ? { data } : {},
    });
    return res;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

export async function gerarControleDiario(payload: {
  data?: string;
  lojaIds: string[];
  observacoes?: string;
}): Promise<ControleDiario> {
  const { data } = await api.post("/controle-diario/gerar", payload);
  return data;
}

export async function importarLojas(
  codigos: string[]
): Promise<{ lojas: { id: string; codigo: string; nome: string }[]; naoEncontrados: string[] }> {
  const { data } = await api.post("/controle-diario/importar-lojas", { codigos });
  return data;
}

export async function alterarStatusItem(
  itemId: string,
  status: StatusControleDiario,
  observacoes?: string
) {
  const { data } = await api.patch(`/controle-diario/item/${itemId}/status`, {
    status,
    observacoes,
  });
  return data;
}

export async function fecharDia(controleId: string): Promise<ControleDiario> {
  const { data } = await api.post(`/controle-diario/${controleId}/fechar`);
  return data;
}

export async function buscarDashboard(controleId: string): Promise<DashboardControleDiario> {
  const { data } = await api.get(`/controle-diario/${controleId}/dashboard`);
  return data;
}

export async function buscarHistorico(): Promise<HistoricoControleDiario[]> {
  const { data } = await api.get("/controle-diario/historico");
  return data;
}
