import { prisma } from "@/config/prisma";
import { logger } from "@/utils/logger";
import { lerRespostasPlanilha, LinhaPlanilha } from "@/services/google-sheets.service";
import { verificarRegrasDeAlerta } from "@/services/alertas.service";
import { calcularRiscoJustificativa } from "@/services/risco.service";

const NOME_FONTE = "google_sheets_respostas";

// ============================================================================
// MAPEAMENTO DE COLUNAS — ajustado aos títulos reais do Forms da empresa.
//
// Particularidades deste formulário (documentadas para facilitar manutenção):
//
// 1. "Responsável pelo preenchimento" é a mesma pessoa registrada como gerente
//    para fins de Ranking de Gerentes — não existe uma segunda pergunta.
// 2. Não há pergunta de "Nome do Produto", apenas "Códigos dos produtos" — o
//    Portal exibe o código onde normalmente mostraria o nome (fallback já
//    implementado no frontend).
// 3. "Códigos dos produtos" e "Quantidade de produtos envolvidos" podem trazer
//    MAIS DE UM item na mesma resposta, separados por vírgula ou quebra de
//    linha, na mesma ordem um do outro. Cada item se torna uma Justificativa
//    própria (ver `expandirRespostaEmItens`), para que os indicadores por
//    produto (Top Produtos, Treemap, Curva ABC) fiquem corretos.
// 4. O valor total do ajuste é atribuído inteiramente ao PRIMEIRO produto da
//    lista; os demais entram com valor R$ 0,00, para não inflar o total
//    financeiro ao destrinchar uma única resposta em vários registros.
// ============================================================================
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
  // "Declaro que as informações neste formulário são verdadeiras." — pergunta de
  // confirmação binária do Forms, sem valor analítico para o Portal; não é importada.
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
  // Aceita separação por vírgula ou por quebra de linha (Forms permite ambos
  // dependendo de como a pessoa digita uma resposta de texto livre).
  return bruto
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAnexos(anexosBruto: string | undefined): string[] {
  // Quando o Forms tem uma pergunta do tipo "Upload de arquivo", o Google Sheets
  // grava o(s) link(s) do Google Drive nessa coluna, separados por vírgula
  // quando há mais de um arquivo.
  return parseListaTexto(anexosBruto);
}

/**
 * Tenta localizar a Loja correspondente ao código informado no Forms.
 *
 * Neste formulário, o campo "Loja" é uma lista suspensa (dropdown) que envia
 * apenas o CÓDIGO da loja (ex: "0123") — não há erro de digitação possível,
 * mas ainda pode haver divergência de formatação entre o que foi cadastrado
 * no Portal (tela Lojas) e o valor exato da opção do Forms (ex: zeros à
 * esquerda: "123" vs "0123"). Por isso a busca tenta, em ordem:
 *   1. Código idêntico (case-insensitive)
 *   2. Nome idêntico (caso a empresa decida usar nome no dropdown no futuro)
 *   3. Código numericamente equivalente, ignorando zeros à esquerda
 */
async function buscarLojaPorCodigoOuNome(valorBruto: string) {
  const valor = valorBruto.trim();
  if (!valor) return null;

  const lojaExata = await prisma.loja.findFirst({
    where: {
      OR: [
        { codigo: { equals: valor, mode: "insensitive" } },
        { nome: { equals: valor, mode: "insensitive" } },
      ],
    },
  });
  if (lojaExata) return lojaExata;

  // Fallback: só tenta a comparação numérica se o valor for puramente numérico,
  // para não comparar nomes de loja como se fossem números.
  if (/^\d+$/.test(valor)) {
    const valorSemZerosEsquerda = valor.replace(/^0+/, "") || "0";
    const candidatas = await prisma.loja.findMany({ where: { codigo: { not: "" } } });
    return (
      candidatas.find((loja: { codigo: string }) => {
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

/**
 * Uma única resposta do Forms pode listar vários códigos de produto na mesma
 * linha. Esta função "destrincha" essa linha em um item por produto, mantendo
 * a regra de negócio: o valor total fica no primeiro item, os demais ficam
 * com valor zero (para não duplicar o total financeiro nos dashboards).
 *
 * Se não houver nenhum código de produto informado, retorna um único item
 * "vazio" para que a resposta não se perca.
 */
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

/**
 * Sincroniza as respostas da planilha com o banco de dados.
 * É idempotente: itens já importados (mesmo sheetRowId) são ignorados na criação,
 * mas o processo de alertas roda sempre, pois pode haver novas justificativas
 * que mudam o cenário (ex: 4ª ocorrência da loja no mês).
 */
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

      // Combina o detalhamento da justificativa com as ações de reincidência
      // num único campo de texto, já que o brief não previu uma seção própria
      // para "ações tomadas" — fica visível junto do motivo no detalhamento.
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

        const jaExiste = await prisma.justificativa.findUnique({ where: { sheetRowId } });
        if (jaExiste) continue;

        const justificativa = await prisma.justificativa.create({
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
            produtoNome: null, // o Forms não coleta nome do produto, apenas código
            quantidade: item.quantidade,
            valorAjustado: item.valorAjustado,
            motivo: linha[COLUNAS.MOTIVO] || "Não informado",
            motivoDetalhe,
            responsavel,
            gerenteBruto: responsavel, // mesma pessoa — ver nota no topo do arquivo
            anexosUrls: parseAnexos(linha[COLUNAS.ANEXOS]),
          },
        });

        await prisma.historicoStatus.create({
          data: {
            justificativaId: justificativa.id,
            statusNovo: "RECEBIDO",
            observacao:
              itens.length > 1
                ? `Importado automaticamente do Google Sheets (item ${item.itemDaSubmissao} de ${itens.length} da mesma resposta).`
                : "Importado automaticamente do Google Sheets.",
          },
        });

        await calcularRiscoJustificativa(justificativa.id);

        novasJustificativas += 1;
      }
    } catch (erroLinha) {
      const mensagem =
        erroLinha instanceof Error ? erroLinha.message : "Erro desconhecido ao processar linha.";
      logger.error(`Erro ao processar linha ${linha.__rowIndex} da planilha`, { erro: mensagem });
      erros.push(`Linha ${linha.__rowIndex}: ${mensagem}`);
    }
  }

  // Após importar, recalcula as regras de alerta (independem de haver linhas novas,
  // pois alertas como "pendência > 24h" dependem da passagem do tempo).
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
  await prisma.syncControl.upsert({
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
  });
}

export async function obterStatusSincronizacao() {
  return prisma.syncControl.findUnique({ where: { fonte: NOME_FONTE } });
}
