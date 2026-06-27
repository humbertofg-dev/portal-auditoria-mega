import { Router } from "express";
import { prisma } from "@/config/prisma";
import { autenticar } from "@/middleware/auth.middleware";
import { montarFiltrosJustificativa } from "@/utils/filtros";
import { gerarExcelJustificativas, gerarCsvJustificativas } from "@/services/exportacao.service";
import { gerarPdfJustificativas } from "@/services/pdf-relatorio.service";

export const exportacaoRouter = Router();

exportacaoRouter.use(autenticar);

async function buscarJustificativasParaExportacao(req: Parameters<typeof montarFiltrosJustificativa>[0]) {
  const where = montarFiltrosJustificativa(req);
  return prisma.justificativa.findMany({
    where,
    include: { loja: { include: { regional: true } } },
    orderBy: { dataEnvio: "desc" },
    take: 5000, // limite de segurança para evitar exportações descontroladas
  });
}

exportacaoRouter.get("/excel", async (req, res) => {
  const justificativas = await buscarJustificativasParaExportacao(req);
  const buffer = await gerarExcelJustificativas(justificativas);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="justificativas-${Date.now()}.xlsx"`
  );
  res.send(buffer);
});

exportacaoRouter.get("/csv", async (req, res) => {
  const justificativas = await buscarJustificativasParaExportacao(req);
  const csv = gerarCsvJustificativas(justificativas);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="justificativas-${Date.now()}.csv"`);
  res.send("\uFEFF" + csv); // BOM para abrir corretamente acentuação no Excel
});

exportacaoRouter.get("/pdf", async (req, res) => {
  const justificativas = await buscarJustificativasParaExportacao(req);
  const buffer = await gerarPdfJustificativas(justificativas, req.query as Record<string, unknown>);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="relatorio-${Date.now()}.pdf"`);
  res.send(buffer);
});
