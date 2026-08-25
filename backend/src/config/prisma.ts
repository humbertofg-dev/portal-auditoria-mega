import { PrismaClient } from "@prisma/client";
import { isProduction } from "../config/env";

// Evita múltiplas instâncias do PrismaClient durante hot-reload em dev.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isProduction ? ["error", "warn"] : ["error", "warn"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (!isProduction) {
  global.__prisma = prisma;
}

// Reconexão automática para bancos que hibernam (ex: Neon plano gratuito).
// Quando o Prisma recebe P1001 (não consegue conectar) ou P1002 (timeout),
// aguarda e tenta reconectar até 3 vezes antes de lançar o erro.
export async function executarComReconexao<T>(
  operacao: () => Promise<T>,
  tentativas = 3,
  aguardarMs = 5000
): Promise<T> {
  for (let i = 0; i < tentativas; i++) {
    try {
      return await operacao();
    } catch (erro: any) {
      const codigo = erro?.code ?? "";
      const ehErroConexao =
        codigo === "P1001" || // não consegue conectar
        codigo === "P1002" || // timeout de conexão
        codigo === "P2024" || // pool de conexões esgotado
        erro?.message?.includes("Can't reach database");

      if (ehErroConexao && i < tentativas - 1) {
        await new Promise((res) => setTimeout(res, aguardarMs * (i + 1)));
        try {
          await prisma.$disconnect();
          await prisma.$connect();
        } catch {
          // ignora erro de reconexão — a próxima tentativa tentará novamente
        }
        continue;
      }
      throw erro;
    }
  }
  throw new Error("Número máximo de tentativas de reconexão atingido.");
}
