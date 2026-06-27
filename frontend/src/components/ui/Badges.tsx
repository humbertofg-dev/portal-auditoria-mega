import { NivelRisco, StatusJustificativa } from "@/types";
import { LABEL_STATUS, COR_STATUS, LABEL_RISCO, EMOJI_SEMAFORO_RISCO } from "@/utils/formatadores";

export function BadgeStatus({ status }: { status: StatusJustificativa }) {
  return <span className={`mega-badge ${COR_STATUS[status]}`}>{LABEL_STATUS[status]}</span>;
}

export function BadgeRisco({ nivel }: { nivel: NivelRisco | null | undefined }) {
  if (!nivel) {
    return <span className="mega-badge bg-mega-gray-100 text-mega-gray-500">Não avaliado</span>;
  }
  return (
    <span className="mega-badge bg-mega-gray-50 text-mega-gray-700">
      <span aria-hidden>{EMOJI_SEMAFORO_RISCO[nivel]}</span>
      {LABEL_RISCO[nivel]}
    </span>
  );
}
