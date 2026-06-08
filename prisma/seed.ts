import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Neon database...");

  // Clear loading reports for fresh testing
  await prisma.posmLoadingItem.deleteMany();
  await prisma.loadingItem.deleteMany();
  await prisma.posmLoadingReport.deleteMany();
  await prisma.loadingReport.deleteMany();

  // Upsert Admin
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: "admin123", name: "Admin", role: "ADMIN" },
  });
  console.log("✅ Admin:", admin.username);

  // Upsert Salesman
  const salesman = await prisma.user.upsert({
    where: { username: "salesman" },
    update: {},
    create: { username: "salesman", password: "sales123", name: "Budi Salesman", role: "SALESMAN" },
  });
  console.log("✅ Salesman:", salesman.username);

  // Products — delete all and recreate cleanly
  await prisma.product.deleteMany();
  await prisma.product.createMany({
    data: [
      { name: "Product A", price: 15000 },
      { name: "Product B", price: 25000 },
      { name: "Product C", price: 10000 },
    ],
  });
  console.log("✅ Products seeded");

  // POSM
  await prisma.posm.deleteMany();
  await prisma.posm.createMany({
    data: [
      { name: "Banner A" },
      { name: "Sticker B" },
      { name: "Display Stand C" },
    ],
  });
  console.log("✅ POSM seeded");

  // Outlets
  await prisma.outlet.deleteMany();
  await prisma.outlet.createMany({
    data: [
      { name: "Warung Pak Bejo", picName: "Pak Bejo", picPhone: "08123456789", topTerm: "COD" },
      { name: "Toko Maju Jaya", picName: "Bu Sari", picPhone: "08234567890", topTerm: "3 Days" },
      { name: "Minimarket Sejahtera", picName: "Pak Heri", picPhone: "08345678901", topTerm: "7 Days" },
    ],
  });
  console.log("✅ Outlets seeded");

  console.log("\n🎉 Seed complete!");
  console.log("  Admin    → username: admin    | password: admin123");
  console.log("  Salesman → username: salesman | password: sales123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
