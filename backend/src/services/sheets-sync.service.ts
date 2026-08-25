import { prisma, executarComReconexao } from "../config/prisma";
import { logger } from "../utils/logger";
import { lerRespostasPlanilha, LinhaPlanilha } from "../services/google-sheets.service";
import { verificarRegrasDeAlerta } from "../services/alertas.service";
import { calcularRiscoJustificativa } from "../services/risco.service";
import { vincularJustificativaAoControleDiario } from "../services/controle-diario.service";

const NOME_FONTE = "google_sheets_respostas";

const COLUNAS = {
  TIMESTAMP: "Carimbo de data/hora",
  LOJA: "Loja",
  RESPONSAVEL: "Responsável pelo preenchimento",
  DATA_OCORRENCIA: "Data do ajuste",
  VALOR: "Valor Total do Ajuste (R$)",
  QUANTIDADE: "Quantidade de produtos envolvidos",
  PRODUTOS_CODIGOS: "Códigos dos produtos",
  MOTIVO: "Por qual motivo está ocorrendo o ajuste?",
  JUSTIFICATIVA_DETALHE: "Descreva detalhadamente abaixo a justifica do ajuste.",
  ACOES_REINCIDENCIA: "Quais ações foram tomadas para evitar a reincidência deste saldo?",
  ANEXOS: "Anexos - Adicione foto, relatório ou documentos",
} as const;

function parseValorMonetario(valorBruto: string | undefined): number {
  if (!valorBruto) return 0;
  const limpo = valorBruto.replace(/[^\d,.-]/g, "").replace(",", ".");
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

function parseData(dataBruta: string | undefined): Date | null {
  if (!dataBruta) return null;
  const data = new Date(dataBruta);
  return Number.isNaN(data.getTime()) ? null : data;
}

function parseListaTexto(bruto: string | undefined): string[] {
  if (!bruto) return [];
  return bruto.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function parseAnexos(anexosBruto: string | undefined): string[] {
  return parseListaTexto(anexosBruto);
}

async function buscarLojaPorCodigoOuNome(valorBruto: string) {
  const valor = valorBruto.trim();
  if (!valor) return null;

  const lojaExata = await executarComReconexao(() =>
    prisma.loja.findFirst({
      where: {
        OR: [
          { codigo: { equals: valor, mode: "insensitive" } },
          { nome: { equals: valor, mode: "insensitive" } },
        ],
      },
    })
  );
  if (lojaExata) return lojaExata;

  if (/^\d+$/.test(valor)) {
    const valorSemZerosEsquerda = valor.replace(/^0+/, "") || "0";
    const candidatas = await executarComReconexao(() =>
      prisma.loja.findMany({ where: { codigo: { not: "" } } })
    );
    return (
      candidatas.find((loja: { id: string; codigo: string }) => {
        const codigoLoja = loja.codigo.trim();
        return (
          /^\d+$/.test(codigoLoja) &&
          (codigoLoja.replace(/^0+/, "") || "0") === valorSemZerosEsquerda
        );
      }) ?? null
    );
  }

  return null;
}

interface ItemExpandido {
  produtoCodigo: string | null;
  quantidade: number | null;
  valorAjustado: number;
  itemDaSubmissao: number;
}

function expandirRespostaEmItens(linha: LinhaPlanilha): ItemExpandido[] {
  const codigos = parseListaTexto(linha[COLUNAS.PRODUTOS_CODIGOS]);
  const quantidades = parseListaTexto(linha[COLUNAS.QUANTIDADE]);
  const valorTotal = parseValorMonetario(linha[COLUNAS.VALOR]);

  if (codigos.length === 0) {
    return [{ produtoCodigo: null, quantidade: null, valorAjustado: valorTotal, itemDaSubmissao: 1 }];
  }

  return codigos.map((codigo, index) => {
    const quantidadeBruta = quantidades[index];
    const quantidade = quantidadeBruta ? Number(quantidadeBruta.replace(",", ".")) : null;
    return {
      produtoCodigo: codigo,
      quantidade: Number.isFinite(quantidade) ? quantidade : null,
      valorAjustado: index === 0 ? valorTotal : 0,
      itemDaSubmissao: index + 1,
    };
  });
}

function gerarSubmissaoId(linha: LinhaPlanilha): string {
  const timestamp = linha[COLUNAS.TIMESTAMP] ?? "";
  return `row-${linha.__rowIndex}-${timestamp}`.slice(0, 160);
}

export async function sincronizarPlanilha(): Promise<{
  novasJustificativas: number;
  totalLinhas: number;
  erros: string[];
}> {
  const erros: string[] = [];
  let novasJustificativas = 0;

  let linhas: LinhaPlanilha[] = [];
  try {
    linhas = await lerRespostasPlanilha();
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao ler planilha.";
    logger.error("Erro ao ler planilha do Google Sheets", { erro: mensagem });
    await atualizarSyncControl({ ultimoStatus: "ERRO", ultimaMensagemErro: mensagem });
    return { novasJustificativas: 0, totalLinhas: 0, erros: [mensagem] };
  }

  for (const linha of linhas) {
    const submissaoId = gerarSubmissaoId(linha);

    try {
      const itens = expandirRespostaEmItens(linha);
      const codigoLojaBruto = linha[COLUNAS.LOJA] ?? "";
      const loja = await buscarLojaPorCodigoOuNome(codigoLojaBruto);
      const responsavel = linha[COLUNAS.RESPONSAVEL] || null;

      const acoesReincidencia = linha[COLUNAS.ACOES_REINCIDENCIA];
      const motivoDetalhe =
        [
          linha[COLUNAS.JUSTIFICATIVA_DETALHE],
          acoesReincidencia ? `Ações para evitar reincidência: ${acoesReincidencia}` : null,
        ]
          .filter(Boolean)
          .join("\n\n") || null;

      for (const item of itens) {
        const sheetRowId = `${submissaoId}-item${item.itemDaSubmissao}`;

        const jaExiste = await executarComReconexao(() =>
          prisma.justificativa.findUnique({ where: { sheetRowId } })
        );
        if (jaExiste) continue;

        const justificativa = await executarComReconexao(() =>
          prisma.justificativa.create({
            data: {
              sheetRowId,
              sheetRowIndex: linha.__rowIndex,
              submissaoId,
              itemDaSubmissao: item.itemDaSubmissao,
              dataEnvio: parseData(linha[COLUNAS.TIMESTAMP]) ?? new Date(),
              dataOcorrencia: parseData(linha[COLUNAS.DATA_OCORRENCIA]),
              lojaId: loja?.id,
              lojaCodigoBruto: codigoLojaBruto,
              produtoCodigo: item.produtoCodigo,
              produtoNome: null,
              quantidade: item.quantidade,
              valorAjustado: item.valorAjustado,
              motivo: linha[COLUNAS.MOTIVO] || "Não informado",
              motivoDetalhe,
              responsavel,
              gerenteBruto: responsavel,
              anexosUrls: parseAnexos(linha[COLUNAS.ANEXOS]),
            },
          })
        );

        await executarComReconexao(() =>
          prisma.historicoStatus.create({
            data: {
              justificativaId: justificativa.id,
              statusNovo: "RECEBIDO",
              observacao:
                itens.length > 1
                  ? `Importado automaticamente do Google Sheets (item ${item.itemDaSubmissao} de ${itens.length} da mesma resposta).`
                  : "Importado automaticamente do Google Sheets.",
            },
          })
        );

        await calcularRiscoJustificativa(justificativa.id);
        await vincularJustificativaAoControleDiario(justificativa.id);
        novasJustificativas += 1;
      }
    } catch (erroLinha) {
      const mensagem =
        erroLinha instanceof Error ? erroLinha.message : "Erro desconhecido ao processar linha.";
      logger.error(`Erro ao processar linha ${linha.__rowIndex} da planilha`, { erro: mensagem });
      erros.push(`Linha ${linha.__rowIndex}: ${mensagem}`);
    }
  }

  try {
    await verificarRegrasDeAlerta();
  } catch (erroAlertas) {
    const mensagem =
      erroAlertas instanceof Error ? erroAlertas.message : "Erro ao verificar alertas.";
    logger.error("Erro ao verificar regras de alerta", { erro: mensagem });
    erros.push(mensagem);
  }

  await atualizarSyncControl({
    ultimoStatus: erros.length > 0 ? "ERRO_PARCIAL" : "SUCESSO",
    ultimaMensagemErro: erros.length > 0 ? erros.join(" | ") : null,
  });

  if (novasJustificativas > 0) {
    logger.info(`Sincronização concluída: ${novasJustificativas} nova(s) justificativa(s).`);
  }

  return { novasJustificativas, totalLinhas: linhas.length, erros };
}

async function atualizarSyncControl(dados: {
  ultimoStatus: string;
  ultimaMensagemErro?: string | null;
}) {
  await executarComReconexao(() =>
    prisma.syncControl.upsert({
      where: { fonte: NOME_FONTE },
      create: {
        fonte: NOME_FONTE,
        ultimaSincronia: new Date(),
        ultimoStatus: dados.ultimoStatus,
        ultimaMensagemErro: dados.ultimaMensagemErro,
      },
      update: {
        ultimaSincronia: new Date(),
        ultimoStatus: dados.ultimoStatus,
        ultimaMensagemErro: dados.ultimaMensagemErro,
      },
    })
  );
}

export async function obterStatusSincronizacao() {
  return executarComReconexao(() =>
    prisma.syncControl.findUnique({ where: { fonte: NOME_FONTE } })
  );
}
