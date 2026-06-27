import { useEffect, useRef, useState, useCallback } from "react";

interface OpcoesPolling {
  intervaloMs?: number;
  ativo?: boolean;
}

/**
 * Executa `buscarDados` imediatamente e depois a cada `intervaloMs`,
 * mantendo os dados sempre atualizados sem precisar recarregar a página.
 * Usado em todo o Dashboard, Indicadores e Justificativas para refletir
 * automaticamente as novas linhas trazidas do Google Sheets pelo polling
 * do backend.
 */
export function usePolling<T>(
  buscarDados: () => Promise<T>,
  dependencias: unknown[] = [],
  { intervaloMs = 15000, ativo = true }: OpcoesPolling = {}
) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const buscarRef = useRef(buscarDados);
  buscarRef.current = buscarDados;

  const executar = useCallback(async (mostrarCarregando: boolean) => {
    if (mostrarCarregando) setCarregando(true);
    try {
      const resultado = await buscarRef.current();
      setDados(resultado);
      setErro(null);
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? "Erro ao buscar dados.");
    } finally {
      if (mostrarCarregando) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!ativo) return;

    executar(true);
    const intervalo = setInterval(() => executar(false), intervaloMs);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, intervaloMs, ...dependencias]);

  return { dados, carregando, erro, recarregar: () => executar(true) };
}
