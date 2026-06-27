import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do Portal Auditoria MEGA...");

  // --- Usuário Administrador padrão ---
  const senhaHashAdmin = await bcrypt.hash("TrocarSenha123!", 12);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@megathorra.com.br" },
    update: {},
    create: {
      nome: "Administrador do Sistema",
      email: "admin@megathorra.com.br",
      senhaHash: senhaHashAdmin,
      perfil: "ADMINISTRADOR",
    },
  });
  console.log(`Usuário administrador criado/garantido: ${admin.email}`);
  console.log('IMPORTANTE: troque a senha padrão "TrocarSenha123!" no primeiro acesso.');

  // --- Usuário de Auditoria de exemplo ---
  const senhaHashAuditor = await bcrypt.hash("TrocarSenha123!", 12);
  await prisma.usuario.upsert({
    where: { email: "auditoria@megathorra.com.br" },
    update: {},
    create: {
      nome: "Equipe de Auditoria",
      email: "auditoria@megathorra.com.br",
      senhaHash: senhaHashAuditor,
      perfil: "AUDITORIA",
    },
  });

  // --- Estrutura organizacional de exemplo (ajustar para a estrutura real) ---
  const regionaisExemplo = ["Regional Norte", "Regional Sul", "Regional Sudeste", "Regional Nordeste"];

  for (const nome of regionaisExemplo) {
    await prisma.regional.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }
  console.log(`${regionaisExemplo.length} regionais criadas/garantidas.`);

  console.log("Seed concluído com sucesso.");
}

main()
  .catch((erro) => {
    console.error("Erro ao executar seed:", erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
