interface BarraProgressoProps {
  total: number;
  recebidas: number;
  percentual: number;
  todasEnviaram: boolean;
}

export function BarraProgresso({ total, recebidas, percentual, todasEnviaram }: BarraProgressoProps) {
  const pendentes = total - recebidas;

  return (
    <div
      className={`rounded-card border p-4 ${
        todasEnviaram
          ? "border-emerald-200 bg-emerald-50"
          : "border-mega-red-200 bg-mega-red-50"
      }`}
    >
      {todasEnviaram ? (
        <p className="mb-2 text-sm font-semibold text-emerald-700">
          ✅ Todas as justificativas obrigatórias do dia foram recebidas.
        </p>
      ) : (
        <p className="mb-2 text-sm font-semibold text-mega-red-700">
          ⚠️ Existem lojas com justificativas pendentes.
        </p>
      )}

      {/* Barra de progresso estilo Planner */}
      <div className="mb-2 h-5 w-full overflow-hidden rounded-full bg-mega-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            todasEnviaram ? "bg-emerald-500" : "bg-mega-red-500"
          }`}
          style={{ width: `${Math.max(percentual, percentual > 0 ? 2 : 0)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm font-medium">
        <span className={todasEnviaram ? "text-emerald-700" : "text-mega-red-700"}>
          {percentual}%
        </span>
        <span className="text-mega-gray-600">
          {recebidas} de {total} loja{total !== 1 ? "s" : ""} enviaram.
          {pendentes > 0 && (
            <span className="ml-1 text-mega-red-600 font-semibold">
              {pendentes} pendente{pendentes !== 1 ? "s" : ""}.
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
