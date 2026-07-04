import { google } from "googleapis";
import { env } from "../config/env";
import { logger } from "../utils/logger";

// ============================================================================
// Cliente Google Sheets via Service Account.
//
// Pré-requisitos (ver README/docs/integracao-google-sheets.md):
// 1. Criar um projeto no Google Cloud Console.
// 2. Habilitar a "Google Sheets API".
// 3. Criar uma Service Account e gerar uma chave JSON.
// 4. Compartilhar a planilha de respostas do Forms com o e-mail da
//    Service Account, concedendo permissão de "Leitor".
// ============================================================================

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: env.GOOGLE_SHEETS_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

/**
 * Representa uma linha bruta da planilha, já convertida para um objeto
 * usando a primeira linha (cabeçalho) como chaves.
 */
export type LinhaPlanilha = Record<string, string> & {
  __rowIndex: number; // número da linha na planilha (1-based, incluindo cabeçalho)
};

/**
 * Lê todas as linhas da planilha configurada e retorna como objetos,
 * usando a primeira linha como cabeçalho (nomes das perguntas do Forms).
 *
 * Esta função é deliberadamente "burra": ela não sabe nada sobre o domínio
 * de Justificativas. A tradução de colunas do Forms para o modelo de dados
 * acontece em `sheets-sync.service.ts`.
 */
export async function lerRespostasPlanilha(): Promise<LinhaPlanilha[]> {
  const sheets = getSheetsClient();

  const resposta = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: env.GOOGLE_SHEETS_RANGE,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const valores = resposta.data.values ?? [];

  if (valores.length === 0) {
    logger.warn("Planilha de respostas retornou vazia.");
    return [];
  }

  const [cabecalho, ...linhas] = valores;

  return linhas.map((linha, index) => {
    const objeto: LinhaPlanilha = { __rowIndex: index + 2 } as LinhaPlanilha; // +2: pula cabeçalho, 1-based

    cabecalho.forEach((coluna: string, colIndex: number) => {
      objeto[String(coluna).trim()] = linha[colIndex] !== undefined ? String(linha[colIndex]) : "";
    });

    return objeto;
  });
}

/**
 * Testa a conectividade com a planilha configurada.
 * Útil para a tela de Configurações validar as credenciais.
 */
export async function testarConexaoPlanilha(): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const linhas = await lerRespostasPlanilha();
    return {
      ok: true,
      mensagem: `Conexão estabelecida com sucesso. ${linhas.length} linha(s) encontrada(s).`,
    };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido.";
    logger.error("Falha ao conectar com Google Sheets", { erro: mensagem });
    return { ok: false, mensagem };
  }
}
