import { ReactNode } from "react";

interface CardMetricaProps {
  rotulo: string;
  valor: string | number;
  icone?: ReactNode;
  variacao?: { percentual: number; positivoEhBom?: boolean };
  destaque?: "neutro" | "vermelho" | "verde" | "amarelo";
  carregando?: boolean;
}

const CORES_DESTAQUE: Record<NonNullable<CardMetricaProps["destaque"]>, string> = {
  neutro: "text-mega-black",
  vermelho: "text-mega-red-500",
  verde: "text-emerald-600",
  amarelo: "text-amber-600",
};

export function CardMetrica({
  rotulo,
  valor,
  icone,
  variacao,
  destaque = "neutro",
  carregando,
}: CardMetricaProps) {
  return (
    <div className="mega-card flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <span className="text-2xs font-semibold uppercase tracking-wide text-mega-gray-500">
          {rotulo}
        </span>
        {icone && <span className="text-mega-gray-400">{icone}</span>}
      </div>

      {carregando ? (
        <div className="h-7 w-20 animate-pulse rounded bg-mega-gray-100" />
      ) : (
        <span className={`text-2xl font-bold tabular-nums ${CORES_DESTAQUE[destaque]}`}>{valor}</span>
      )}

      {variacao && !carregando && (
        <span
          className={`text-2xs font-medium ${
            (variacao.percentual >= 0) === (variacao.positivoEhBom ?? true)
              ? "text-emerald-600"
              : "text-mega-red-500"
          }`}
        >
          {variacao.percentual >= 0 ? "+" : ""}
          {variacao.percentual.toFixed(1)}% vs. período anterior
        </span>
      )}
    </div>
  );
}
