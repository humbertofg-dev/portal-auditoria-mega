import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";

// ============================================================================
// CORREÇÕES APLICADAS (vs versão anterior):
//
// 1. FUSO HORÁRIO: o Render roda em UTC. A data do Forms chega como string
//    "03/07/2026 09:29:28" (horário de Brasília, UTC-3). Ao fazer
//    new Date(...).setHours(0,0,0,0) em UTC, "03/07 09:29 BRT" vira
//    "03/07 12:29 UTC", que ao ser zerado fica "03/07 00:00 UTC" — correto.
//    MAS se o timestamp vier como "03/07/2026 00:15:00 BRT", isso vira
//    "03/07/2026 03:15 UTC", que zerado fica "03/07 00:00 UTC" — ainda ok.
//    O problema real estava na comparação com o campo @db.Date do Prisma,
//    que armazena só a data sem hora. Prisma trata @db.Date como meia-noite
//    UTC. A correção é normalizar explicitamente usando UTC para garantir
//    que a data "03/07/2026" sempre vire "2026-07-03T00:00:00.000Z".
//
// 2. MATCH RETROATIVO: quando o controle é criado depois que as respostas
//    já chegaram, as justificativas existentes no banco nunca passaram pela
//    função de vinculação. Adicionada função separada para reconciliar
//    justificativas existentes ao criar/atualizar um controle.
//
// 3. MATCH FLEXÍVEL DE CÓDIGO: a planilha mostra "LOJA 003", "LOJA 034" etc.
//    Se o cadastro tem "003" como código, o match atual falha. A correção
//    busca também pelo código numérico extraído (remove prefixo "LOJA ").
// ============================================================================

/**
 * Normaliza uma data para meia-noite UTC, independente do fuso do servidor.
 * Garante que "03/07/2026 09:29 BRT" e "03/07/2026 00:15 BRT" resultem
 * ambos em "2026-07-03T00:00:00.000Z", que é o que o campo @db.Date do
 * Prisma usa internamente.
 */
function normalizarDataParaUTC(data: Date): Date {
  // Extrai ano, mês e dia NO FUSO LOCAL do servidor (o Render usa UTC,
  // mas queremos a data "como veio da planilha" — que foi gerada em BRT).
  // Como o Forms registra timestamps em UTC internamente e o Sheets os
  // converte para o fuso do spreadsheet ao exibir, a forma mais segura
  // é pegar apenas Y/M/D e recriar como meia-noite UTC.
  const ano = data.getUTCFullYear();
  const mes = data.getUTCMonth();
  const dia = data.getUTCDate();
  return new Date(Date.UTC(ano, mes, dia, 0, 0, 0, 0));
}

/**
 * Vincula uma justificativa recém-importada ao item de controle diário
 * da loja correspondente, atualizando o status para JUSTIFICATIVA_RECEBIDA.
 * Chamada automaticamente pelo sheets-sync.service.ts após cada importação.
 */
export async function vincularJustificativaAoControleDiario(
  justificativaId: string
): Promise<void> {
  try {
    const justificativa = await prisma.justificativa.findUnique({
      where: { id: justificativaId },
      select: {
        lojaId: true,
        lojaCodigoBruto: true,
        dataEnvio: true,
        dataOcorrencia: true,
        valorAjustado: true,
        responsavel: true,
      },
    });

    if (!justificativa) return;

    // Resolve o lojaId — pode estar null se o match automático falhou
    // (ex: código "LOJA 003" no Forms vs "003" no cadastro).
    let lojaId = justificativa.lojaId;

    if (!lojaId && justificativa.lojaCodigoBruto) {
      lojaId = await resolverLojaComMatchFlex(justificativa.lojaCodigoBruto);
    }

    if (!lojaId) return;

    // USA SEMPRE dataEnvio (carimbo de data/hora do Forms) para localizar
    // o controle do dia. O campo dataOcorrencia é a data em que o ajuste
    // ocorreu no estoque — que pode ser dias anteriores — e NÃO deve ser
    // usada aqui, pois o controle é do dia em que a loja ENVIOU a justificativa.
    const dataNormalizada = normalizarDataParaUTC(new Date(justificativa.dataEnvio));

    await atualizarItemControle(lojaId, dataNormalizada, justificativaId, justificativa);
  } catch (erro) {
    logger.error("Erro ao vincular justificativa ao controle diário", { erro, justificativaId });
  }
}

/**
 * Reconcilia TODAS as justificativas existentes no banco com os itens de
 * um controle diário recém-criado. Resolve o problema de controles criados
 * DEPOIS que as lojas já enviaram pelo Forms.
 *
 * Chamada pela rota POST /controle-diario/gerar após criar os itens.
 */
export async function reconciliarJustificativasExistentes(
  controleDiarioId: string
): Promise<{ atualizados: number }> {
  let atualizados = 0;

  try {
    const controle = await prisma.controleDiario.findUnique({
      where: { id: controleDiarioId },
      include: {
        itens: {
          where: { status: "AGUARDANDO_JUSTIFICATIVA" },
          include: { loja: true },
        },
      },
    });

    if (!controle || controle.fechado || controle.itens.length === 0) return { atualizados };

    // Para cada item ainda aguardando, busca justificativas da mesma loja
    // cujo dataEnvio (carimbo do Forms) seja do mesmo dia do controle.
    // NÃO usamos dataOcorrencia aqui — ela representa quando o ajuste ocorreu
    // no estoque (pode ser dias anteriores) e não quando a loja enviou.
    for (const item of controle.itens) {
      const dataInicio = new Date(controle.data);
      const dataFim = new Date(controle.data);
      dataFim.setUTCHours(23, 59, 59, 999);

      // Busca 1: pelo lojaId direto (caso o match automático tenha funcionado)
      let justificativa = await prisma.justificativa.findFirst({
        where: {
          lojaId: item.lojaId,
          dataEnvio: { gte: dataInicio, lte: dataFim },
        },
        orderBy: { dataEnvio: "asc" },
      });

      // Busca 2: pelo lojaCodigoBruto — cobre casos onde o match automático
      // falhou (ex: "LOJA 009" no Forms vs "009" no cadastro). Busca pelo
      // código da loja cadastrada, com variações (com/sem prefixo "LOJA ").
      if (!justificativa && item.loja) {
        const codigoLoja = item.loja.codigo; // ex: "009"
        justificativa = await prisma.justificativa.findFirst({
          where: {
            lojaId: null, // só quando o match falhou
            dataEnvio: { gte: dataInicio, lte: dataFim },
            OR: [
              { lojaCodigoBruto: { equals: codigoLoja, mode: "insensitive" } },
              { lojaCodigoBruto: { equals: `LOJA ${codigoLoja}`, mode: "insensitive" } },
              { lojaCodigoBruto: { contains: codigoLoja, mode: "insensitive" } },
            ],
          },
          orderBy: { dataEnvio: "asc" },
        });

        // Se encontrou via código bruto, atualiza o lojaId da justificativa
        // para que futuros matches funcionem diretamente
        if (justificativa) {
          await prisma.justificativa.update({
            where: { id: justificativa.id },
            data: { lojaId: item.lojaId },
          });
        }
      }

      if (!justificativa) continue;

      await prisma.itemControleDiario.update({
        where: { id: item.id },
        data: {
          status: "JUSTIFICATIVA_RECEBIDA",
          justificativaId: justificativa.id,
          horaEnvio: justificativa.dataEnvio,
          responsavel: justificativa.responsavel,
          valorInformado: justificativa.valorAjustado != null ? Number(justificativa.valorAjustado) : null,
        },
      });

      atualizados++;
      logger.info(
        `Reconciliação: loja ${item.lojaId} → JUSTIFICATIVA_RECEBIDA (controle ${controleDiarioId})`
      );
    }
  } catch (erro) {
    logger.error("Erro ao reconciliar justificativas existentes", { erro, controleDiarioId });
  }

  return { atualizados };
}

/**
 * Tenta resolver o lojaId a partir de um código bruto com match flexível.
 * Cobre casos como "LOJA 003" → busca por código "003" ou nome contendo "LOJA 003".
 */
async function resolverLojaComMatchFlex(codigoBruto: string): Promise<string | null> {
  const valor = codigoBruto.trim();

  // Match exato primeiro (código ou nome)
  const exata = await prisma.loja.findFirst({
    where: {
      OR: [
        { codigo: { equals: valor, mode: "insensitive" } },
        { nome: { equals: valor, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (exata) return exata.id;

  // Extrai só a parte numérica (ex: "LOJA 003" → "003", "LOJA 003" → "3")
  const apenasNumeros = valor.replace(/[^\d]/g, "").replace(/^0+/, "") || "0";
  const comZeros = valor.replace(/[^\d]/g, ""); // "003"

  if (!apenasNumeros || apenasNumeros === "0") return null;

  const candidatas = await prisma.loja.findMany({
    where: {
      OR: [
        { codigo: { contains: apenasNumeros } },
        { codigo: { contains: comZeros } },
        { nome: { contains: valor, mode: "insensitive" } },
      ],
    },
    select: { id: true, codigo: true },
  });

  // Prefere a correspondência mais exata (código igual numericamente)
  const melhor = candidatas.find(
    (l: { id: string; codigo: string }) =>
      l.codigo.replace(/^0+/, "") === apenasNumeros ||
      l.codigo === comZeros
  );

  return melhor?.id ?? candidatas[0]?.id ?? null;
}

/**
 * Atualiza o item de controle para uma loja numa data específica.
 * Função auxiliar compartilhada entre vincular e reconciliar.
 */
async function atualizarItemControle(
  lojaId: string,
  dataNormalizada: Date,
  justificativaId: string,
  dados: { dataEnvio: Date | string; responsavel: string | null; valorAjustado: unknown }
): Promise<void> {
  const controle = await prisma.controleDiario.findUnique({
    where: { data: dataNormalizada },
  });

  if (!controle || controle.fechado) return;

  const item = await prisma.itemControleDiario.findUnique({
    where: {
      controleDiarioId_lojaId: {
        controleDiarioId: controle.id,
        lojaId,
      },
    },
  });

  if (!item || item.status !== "AGUARDANDO_JUSTIFICATIVA") return;

  await prisma.itemControleDiario.update({
    where: { id: item.id },
    data: {
      status: "JUSTIFICATIVA_RECEBIDA",
      justificativaId,
      horaEnvio: new Date(dados.dataEnvio),
      responsavel: dados.responsavel,
      valorInformado: dados.valorAjustado != null ? Number(dados.valorAjustado) : null,
    },
  });

  logger.info(`Controle diário atualizado: loja ${lojaId} → JUSTIFICATIVA_RECEBIDA`);
}
