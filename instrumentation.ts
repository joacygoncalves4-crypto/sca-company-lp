import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function register() {
  try {
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
      console.log("✅ Usuário admin criado automaticamente.");
    }
  } catch (error) {
    console.error("Erro ao criar usuário admin:", error);
  }
}
