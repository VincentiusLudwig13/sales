import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Resetting and Seeding Neon database...");

  // 1. Delete all transactional / daily dynamic data
  await prisma.paymentSettlement.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.posmCheck.deleteMany();
  await prisma.stockCheck.deleteMany();
  await prisma.outletVisit.deleteMany();
  await prisma.routeClosure.deleteMany();
  await prisma.posmLoadingItem.deleteMany();
  await prisma.posmLoadingReport.deleteMany();
  await prisma.loadingItem.deleteMany();
  await prisma.loadingReport.deleteMany();

  // 2. Delete and recreate static base entities
  await prisma.outlet.deleteMany();
  await prisma.posm.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // Seed Users
  const admin = await prisma.user.create({
    data: { username: "admin", password: "admin123", name: "Admin", role: "ADMIN" },
  });
  console.log("✅ Admin:", admin.username);

  const salesman = await prisma.user.create({
    data: { username: "salesman", password: "sales123", name: "Budi Salesman", role: "SALESMAN" },
  });
  console.log("✅ Salesman:", salesman.username);

  // Seed Products
  await prisma.product.createMany({
    data: [
      { name: "Product A", price: 15000 },
      { name: "Product B", price: 25000 },
      { name: "Product C", price: 10000 },
    ],
  });
  console.log("✅ Products seeded");

  // Seed POSM Items
  await prisma.posm.createMany({
    data: [
      { name: "Banner A" },
      { name: "Sticker B" },
      { name: "Display Stand C" },
    ],
  });
  console.log("✅ POSM seeded");

  // Seed Outlets
  await prisma.outlet.createMany({
    data: [
      { name: "Warung Pak Bejo", picName: "Pak Bejo", picPhone: "08123456789", topTerm: "COD", routeSeq: 1, routeGroup: "Route A", latitude: -6.2088, longitude: 106.8456 },
      { name: "Toko Maju Jaya", picName: "Bu Sari", picPhone: "08234567890", topTerm: "3 Days", routeSeq: 2, routeGroup: "Route B", latitude: -6.2100, longitude: 106.8465 },
      { name: "Minimarket Sejahtera", picName: "Pak Heri", picPhone: "08345678901", topTerm: "7 Days", routeSeq: 3, routeGroup: "Route C", latitude: -6.2115, longitude: 106.8475 },
    ],
  });
  console.log("✅ Outlets seeded");

  console.log("\n🎉 Database fully reset and seeded!");
  console.log("  Admin    → username: admin    | password: admin123");
  console.log("  Salesman → username: salesman | password: sales123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
