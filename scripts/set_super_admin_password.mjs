import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function setSuperAdminPassword() {
  try {
    const email = "mohabadiane67@gmail.com";
    const password = "Jsq06rdd";

    // Hash du mot de passe
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    console.log("✅ Mot de passe défini pour le super admin:");
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Hash: ${passwordHash.substring(0, 20)}...`);
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setSuperAdminPassword();
