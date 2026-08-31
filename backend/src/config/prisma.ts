import { PrismaClient } from "@prisma/client";
import { isProduction } from "../config/env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function criarPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: isProduction ? ["error", "warn"] : ["error", "warn"],
  });

  // Middleware global de reconexão automática.
  // Intercepta TODAS as operações do Prisma e, se o Neon estiver hibernando
  // (erro P1001/P1002), aguarda e tenta novamente até 3 vezes.
  // Isso cobre login, sync do Sheets, controle diário, dashboard — tudo.
  client.$use(async (params, next) => {
    const MAX_TENTATIVAS = 3;
    const AGUARDAR_MS = 3000;

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      try {
        return await next(params);
      } catch (erro: any) {
        const codigo = erro?.code ?? "";
        const mensagem = erro?.message ?? "";
        const ehErroConexao =
          codigo === "P1001" ||
          codigo === "P1002" ||
          codigo === "P2024" ||
          mensagem.includes("Can't reach database") ||
          mensagem.includes("Connection refused") ||
          mensagem.includes("Connection pool timeout");

        if (ehErroConexao && tentativa < MAX_TENTATIVAS) {
          await new Promise((res) => setTimeout(res, AGUARDAR_MS * tentativa));
          try {
            await client.$disconnect();
            await client.$connect();
          } catch {
            // ignora erro de reconexão — próxima iteração tentará novamente
          }
          continue;
        }
        throw erro;
      }
    }
  });

  return client;
}

export const prisma = global.__prisma ?? criarPrismaClient();

if (!isProduction) {
  global.__prisma = prisma;
}

// Mantida por compatibilidade com código existente que usa esta função.
// Com o middleware global acima, ela não é mais necessária para novas chamadas.
export async function executarComReconexao<T>(
  operacao: () => Promise<T>
): Promise<T> {
  return operacao();
}
