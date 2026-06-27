import { NivelRisco, StatusJustificativa } from "@/types";

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function formatarData(data: string | Date): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR");
}

export function formatarDataHora(data: string | Date): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleString("pt-BR");
}

export function formatarHoras(horas: number | null | undefined): string {
  if (horas === null || horas === undefined) return "—";
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  if (horas < 24) return `${horas.toFixed(1)} h`;
  return `${(horas / 24).toFixed(1)} dias`;
}

export const LABEL_STATUS: Record<StatusJustificativa, string> = {
  RECEBIDO: "Recebido",
  EM_ANALISE: "Em Análise",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  SOLICITADO_COMPLEMENTACAO: "Complementação Solicitada",
};

export const COR_STATUS: Record<StatusJustificativa, string> = {
  RECEBIDO: "bg-mega-gray-100 text-mega-gray-700",
  EM_ANALISE: "bg-amber-50 text-amber-700",
  APROVADO: "bg-emerald-50 text-emerald-700",
  REPROVADO: "bg-mega-red-50 text-mega-red-700",
  SOLICITADO_COMPLEMENTACAO: "bg-blue-50 text-blue-700",
};

export const LABEL_RISCO: Record<NivelRisco, string> = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALTO: "Alto",
  CRITICO: "Crítico",
};

export const COR_SEMAFORO_RISCO: Record<NivelRisco, string> = {
  BAIXO: "#22C55E", // 🟢
  MEDIO: "#EAB308", // 🟡
  ALTO: "#F97316", // 🟠
  CRITICO: "#B3001B", // 🔴
};

export const EMOJI_SEMAFORO_RISCO: Record<NivelRisco, string> = {
  BAIXO: "🟢",
  MEDIO: "🟡",
  ALTO: "🟠",
  CRITICO: "🔴",
};
