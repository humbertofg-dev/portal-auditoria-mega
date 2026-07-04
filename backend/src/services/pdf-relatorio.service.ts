import PDFDocument from "pdfkit";
import { Justificativa, Loja, Regional } from "@prisma/client";

type JustificativaComLoja = Justificativa & { loja: (Loja & { regional: Regional | null }) | null };

const COR_VERMELHO_MEGA = "#B3001B";
const COR_PRETO = "#1A1A1A";
const COR_CINZA = "#666666";

/**
 * Gera um PDF de relatório executivo com a lista de justificativas filtradas.
 * Retorna um Buffer para ser enviado como resposta HTTP (Content-Type: application/pdf).
 */
export function gerarPdfJustificativas(
  justificativas: JustificativaComLoja[],
  filtrosAplicados: Record<string, unknown>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // --- Cabeçalho ---
    doc
      .fillColor(COR_VERMELHO_MEGA)
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("PORTAL AUDITORIA MEGA", 40, 30);

    doc
      .fillColor(COR_PRETO)
      .fontSize(12)
      .font("Helvetica")
      .text("Relatório de Justificativas de Ajustes Manuais de Estoque", 40, 55);

    doc
      .fillColor(COR_CINZA)
      .fontSize(9)
      .text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 40, 75)
      .text(`Total de registros: ${justificativas.length}`, 40, 88);

    const filtrosTexto = Object.entries(filtrosAplicados)
      .filter(([, valor]) => valor !== undefined && valor !== "")
      .map(([chave, valor]) => `${chave}: ${valor}`)
      .join(" | ");

    if (filtrosTexto) {
      doc.text(`Filtros aplicados: ${filtrosTexto}`, 40, 101, { width: 750 });
    }

    doc.moveTo(40, 120).lineTo(800, 120).strokeColor(COR_VERMELHO_MEGA).lineWidth(1.5).stroke();

    // --- Tabela ---
    const colunas = [
      { titulo: "Data", largura: 70 },
      { titulo: "Loja", largura: 110 },
      { titulo: "Regional", largura: 90 },
      { titulo: "Produto", largura: 130 },
      { titulo: "Valor (R$)", largura: 70 },
      { titulo: "Motivo", largura: 110 },
      { titulo: "Status", largura: 90 },
      { titulo: "Risco", largura: 70 },
    ];

    let y = 135;
    const alturaLinha = 18;
    const inicioX = 40;

    function desenharCabecalhoTabela() {
      let x = inicioX;
      doc.fillColor("#FFFFFF").rect(inicioX, y, 760, alturaLinha).fill(COR_PRETO);
      doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold");
      colunas.forEach((col) => {
        doc.text(col.titulo, x + 4, y + 5, { width: col.largura - 8 });
        x += col.largura;
      });
      y += alturaLinha;
    }

    desenharCabecalhoTabela();

    doc.font("Helvetica").fontSize(8);

    justificativas.forEach((j, index) => {
      if (y > 540) {
        doc.addPage({ size: "A4", layout: "landscape", margin: 40 });
        y = 40;
        desenharCabecalhoTabela();
        doc.font("Helvetica").fontSize(8);
      }

      if (index % 2 === 0) {
        doc.fillColor("#F5F5F5").rect(inicioX, y, 760, alturaLinha).fill();
      }

      let x = inicioX;
      doc.fillColor(COR_PRETO);

      const valores = [
        j.dataEnvio.toLocaleDateString("pt-BR"),
        j.loja?.nome ?? j.lojaCodigoBruto,
        j.loja?.regional?.nome ?? "-",
        j.produtoNome ?? "-",
        Number(j.valorAjustado).toFixed(2),
        j.motivo,
        j.status,
        j.nivelRisco ?? "-",
      ];

      colunas.forEach((col, i) => {
        doc.text(String(valores[i]), x + 4, y + 5, { width: col.largura - 8, ellipsis: true });
        x += col.largura;
      });

      y += alturaLinha;
    });

    doc.end();
  });
}
