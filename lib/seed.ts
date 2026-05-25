import { prisma } from "./db";
import bcrypt from "bcryptjs";

async function seed() {
  const existing = await prisma.user.findUnique({
    where: { email: "admin@scacompany.com.br" },
  });

  if (!existing) {
    const hash = await bcrypt.hash("sca@2025", 10);
    await prisma.user.create({
      data: {
        name: "Admin SCA",
        email: "admin@scacompany.com.br",
        password: hash,
      },
    });
    console.log("Usuário admin criado: admin@scacompany.com.br / sca@2025");
  } else {
    console.log("Usuário admin já existe.");
  }
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
