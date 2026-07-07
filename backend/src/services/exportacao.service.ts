import ExcelJS from "exceljs";
import { Justificativa, Loja, Regional } from "@prisma/client";

type JustificativaComLoja = Justificativa & { loja: (Loja & { regional: Regional | null }) | null };

const COLUNAS_EXPORTACAO = [
  { header: "Data Envio", key: "dataEnvio", width: 18 },
  { header: "Loja", key: "loja", width: 24 },
  { header: "Código Loja", key: "codigoLoja", width: 14 },
  { header: "Regional", key: "regional", width: 18 },
  { header: "Cidade", key: "cidade", width: 18 },
  { header: "Produto", key: "produto", width: 28 },
  { header: "Código Produto", key: "codigoProduto", width: 16 },
  { header: "Quantidade", key: "quantidade", width: 12 },
  { header: "Valor Ajustado (R$)", key: "valor", width: 18 },
  { header: "Motivo", key: "motivo", width: 24 },
  { header: "Responsável", key: "responsavel", width: 22 },
  { header: "Gerente", key: "gerente", width: 22 },
  { header: "Status", key: "status", width: 16 },
  { header: "Nível de Risco", key: "risco", width: 14 },
];

function linhaParaObjeto(j: JustificativaComLoja) {
  return {
    dataEnvio: j.dataEnvio.toLocaleString("pt-BR"),
    loja: j.loja?.nome ?? j.lojaCodigoBruto,
    codigoLoja: j.loja?.codigo ?? "-",
    regional: j.loja?.regional?.nome ?? "-",
    cidade: j.loja?.cidade ?? "-",
    produto: j.produtoNome ?? "-",
    codigoProduto: j.produtoCodigo ?? "-",
    quantidade: j.quantidade ? Number(j.quantidade) : "-",
    valor: Number(j.valorAjustado).toFixed(2),
    motivo: j.motivo,
    responsavel: j.responsavel ?? "-",
    gerente: j.gerenteBruto ?? "-",
    status: j.status,
    risco: j.nivelRisco ?? "-",
  };
}

export async function gerarExcelJustificativas(
  justificativas: JustificativaComLoja[]
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Portal Auditoria MEGA";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Justificativas");
  sheet.columns = COLUNAS_EXPORTACAO;

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFB3001B" }, // vermelho Mega Thorra
  };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  justificativas.forEach((j) => sheet.addRow(linhaParaObjeto(j)));

  sheet.autoFilter = { from: "A1", to: `N1` };

  return workbook.xlsx.writeBuffer();
}

export function gerarCsvJustificativas(justificativas: JustificativaComLoja[]): string {
  const cabecalho = COLUNAS_EXPORTACAO.map((c) => c.header).join(";");

  const linhas = justificativas.map((j) => {
    const objeto = linhaParaObjeto(j);
    return COLUNAS_EXPORTACAO.map((c) => String((objeto as Record<string, unknown>)[c.key] ?? ""))
      .map((valor) => `"${valor.replace(/"/g, '""')}"`)
      .join(";");
  });

  return [cabecalho, ...linhas].join("\n");
}
