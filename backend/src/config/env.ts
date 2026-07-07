import dotenv from "dotenv";

dotenv.config();

function obrigatorio(nome: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `Variável de ambiente obrigatória não definida: ${nome}. Verifique seu arquivo .env (veja .env.example).`
    );
  }
  return valor;
}

/**
 * A chave privada da Service Account do Google pode chegar em formatos
 * diferentes dependendo de como foi colada na plataforma de hospedagem:
 *   1. Com \n literais (duas letras: barra + n) — formato comum ao copiar
 *      o valor de dentro de um arquivo JSON.
 *   2. Já com quebras de linha reais — formato comum quando o próprio
 *      campo de variável de ambiente aceita múltiplas linhas (textarea).
 *   3. Envolta em aspas duplas extras, herdadas do JSON original.
 *   4. Com \r\n (retorno de carro + nova linha, comum em copy-paste vindo
 *      do Windows/Bloco de Notas) em vez de \n puro.
 *   5. Com espaços extras no início/fim de cada linha.
 * Esta função normaliza todos esses casos reconstruindo o PEM do zero a
 * partir do conteúdo base64 da chave, garantindo o formato exato que a
 * biblioteca de criptografia espera, independentemente de como o valor
 * chegou na variável de ambiente.
 */
function normalizarChavePrivada(valor: string | undefined): string {
  if (!valor) return "";

  let chave = valor.trim();

  // Remove um par de aspas duplas envolvendo o valor inteiro, se existir.
  if (chave.startsWith('"') && chave.endsWith('"')) {
    chave = chave.slice(1, -1);
  }

  // Normaliza quebras de linha estilo Windows (\r\n) e \n literais para \n real.
  chave = chave.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Reconstrói o PEM a partir do conteúdo base64 puro, removendo qualquer
  // espaço/quebra de linha indesejada que possa ter sido introduzida no
  // meio do corpo da chave durante a cópia (a única coisa que realmente
  // importa é preservar as linhas BEGIN/END e o conteúdo base64 entre elas).
  const temCabecalhoPem = chave.includes("BEGIN PRIVATE KEY") || chave.includes("BEGIN RSA PRIVATE KEY");

  if (temCabecalhoPem) {
    const tipoChave = chave.includes("BEGIN RSA PRIVATE KEY") ? "RSA PRIVATE KEY" : "PRIVATE KEY";
    const corpo = chave
      .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, "")
      .replace(/-----END (RSA )?PRIVATE KEY-----/g, "")
      .replace(/\s+/g, ""); // remove TODOS os espaços/quebras de linha do conteúdo base64

    // Quebra o base64 em linhas de 64 caracteres, formato padrão PEM.
    const linhasBase64 = corpo.match(/.{1,64}/g) ?? [];

    chave = [`-----BEGIN ${tipoChave}-----`, ...linhasBase64, `-----END ${tipoChave}-----`].join(
      "\n"
    );
  }

  return chave.trim() + "\n";
}

export const env = {
  PORT: Number(process.env.PORT ?? 3001),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",

  DATABASE_URL: obrigatorio("DATABASE_URL", process.env.DATABASE_URL),

  JWT_SECRET: obrigatorio("JWT_SECRET", process.env.JWT_SECRET),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "8h",

  GOOGLE_SHEETS_CLIENT_EMAIL: (process.env.GOOGLE_SHEETS_CLIENT_EMAIL ?? "").trim(),
  GOOGLE_SHEETS_PRIVATE_KEY: normalizarChavePrivada(process.env.GOOGLE_SHEETS_PRIVATE_KEY),
  GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "",
  GOOGLE_SHEETS_RANGE: process.env.GOOGLE_SHEETS_RANGE ?? "Respostas ao formulário 1!A:Z",

  SHEETS_POLLING_INTERVAL_MS: Number(process.env.SHEETS_POLLING_INTERVAL_MS ?? 30000),

  ALERTA_VALOR_DIARIO_LIMITE: Number(process.env.ALERTA_VALOR_DIARIO_LIMITE ?? 100),
  ALERTA_FREQUENCIA_MENSAL_LIMITE: Number(process.env.ALERTA_FREQUENCIA_MENSAL_LIMITE ?? 3),
  ALERTA_PENDENCIA_HORAS_LIMITE: Number(process.env.ALERTA_PENDENCIA_HORAS_LIMITE ?? 24),
  ALERTA_CRESCIMENTO_REGIONAL_PERCENTUAL: Number(
    process.env.ALERTA_CRESCIMENTO_REGIONAL_PERCENTUAL ?? 30
  ),
};

export const isProduction = env.NODE_ENV === "production";
