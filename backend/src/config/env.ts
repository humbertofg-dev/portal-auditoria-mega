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

export const env = {
  PORT: Number(process.env.PORT ?? 3001),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",

  DATABASE_URL: obrigatorio("DATABASE_URL", process.env.DATABASE_URL),

  JWT_SECRET: obrigatorio("JWT_SECRET", process.env.JWT_SECRET),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "8h",

  GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL ?? "",
  GOOGLE_SHEETS_PRIVATE_KEY: (process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
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
