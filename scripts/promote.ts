import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function promote() {
  const email = process.argv[2];

  if (!email) {
    console.error("Por favor, forneça o email do usuário. Exemplo: npm run promote user@email.com");
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`Usuário com o email "${email}" não encontrado.`);
      process.exit(1);
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });

    console.log(`Sucesso! Usuário "${email}" foi promovido a ADMIN.`);
    console.log(updatedUser);
  } catch (error) {
    console.error("Erro ao promover usuário:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

promote();
