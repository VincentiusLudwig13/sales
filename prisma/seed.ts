import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Clearing loading reports...");

  await prisma.posmLoadingItem.deleteMany();
  await prisma.loadingItem.deleteMany();
  await prisma.posmLoadingReport.deleteMany();
  await prisma.loadingReport.deleteMany();

  console.log("✅ Product Loading reports cleared");
  console.log("✅ POSM Loading reports cleared");
  console.log("\n🎉 Done! You can now test the full submission flow.");
  console.log("   Go to Activity → Product tab → submit → POSM tab → submit");
  console.log("   Then approve both via Prisma Studio to unlock Activity tab.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
