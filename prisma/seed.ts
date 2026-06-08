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

  // Let's keep it simple: just don't delete products if they already exist, only insert if empty.
  const prodCount = await prisma.product.count();
  if (prodCount === 0) {
    await prisma.product.createMany({
      data: [
        { name: "Product A", price: 15000 },
        { name: "Product B", price: 25000 },
        { name: "Product C", price: 10000 },
      ],
    });
  }
  console.log("✅ Products seeded/verified");

  // POSM
  const posmCount = await prisma.posm.count();
  if (posmCount === 0) {
    await prisma.posm.createMany({
      data: [
        { name: "Banner A" },
        { name: "Sticker B" },
        { name: "Display Stand C" },
      ],
    });
  }
  console.log("✅ POSM seeded/verified");

  // Outlets — only create if empty, otherwise update them
  const outletCount = await prisma.outlet.count();
  if (outletCount === 0) {
    await prisma.outlet.createMany({
      data: [
        { name: "Warung Pak Bejo", picName: "Pak Bejo", picPhone: "08123456789", topTerm: "COD", routeSeq: 1, routeGroup: "Route A", latitude: -6.2088, longitude: 106.8456 },
        { name: "Toko Maju Jaya", picName: "Bu Sari", picPhone: "08234567890", topTerm: "3 Days", routeSeq: 2, routeGroup: "Route B", latitude: -6.2100, longitude: 106.8465 },
        { name: "Minimarket Sejahtera", picName: "Pak Heri", picPhone: "08345678901", topTerm: "7 Days", routeSeq: 3, routeGroup: "Route C", latitude: -6.2115, longitude: 106.8475 },
      ],
    });
  } else {
    // Make sure we apply the routeSeq, routeGroup, lat, and long to the existing ones
    const list = await prisma.outlet.findMany({ orderBy: { createdAt: "asc" } });
    const sequenceMap = [
      { routeSeq: 1, routeGroup: "Route A", latitude: -6.2088, longitude: 106.8456 },
      { routeSeq: 2, routeGroup: "Route B", latitude: -6.2100, longitude: 106.8465 },
      { routeSeq: 3, routeGroup: "Route C", latitude: -6.2115, longitude: 106.8475 }
    ];
    for (let i = 0; i < list.length; i++) {
      const seq = sequenceMap[i] || { routeSeq: i + 1, routeGroup: "Route A", latitude: -6.2088, longitude: 106.8456 };
      await prisma.outlet.update({
        where: { id: list[i].id },
        data: seq
      });
    }
  }
  console.log("✅ Outlets seeded");

  console.log("\n🎉 Seed complete!");
  console.log("  Admin    → username: admin    | password: admin123");
  console.log("  Salesman → username: salesman | password: sales123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
