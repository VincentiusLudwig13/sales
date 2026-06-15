import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items } = await req.json(); // Array of { productId, qty, value }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Validate that all productIds actually exist in the database
  const productIds = items.map((item: any) => item.productId);
  const existingProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });
  const existingProductIds = new Set(existingProducts.map((p) => p.id));
  const invalidIds = productIds.filter((id: string) => !existingProductIds.has(id));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      {
        error: "STALE_PRODUCT_IDS",
        message: "Some products no longer exist. Your local data is outdated — please refresh the page and try again.",
        invalidIds,
      },
      { status: 422 }
    );
  }

  // Check if report already exists for today
  let report = await prisma.loadingReport.findFirst({
    where: { userId: session.user.id, date: { gte: today } }
  });

  if (report) {
    if (report.status !== "DRAFT" && report.status !== "REJECTED") {
      return NextResponse.json({ error: "Report is already locked for approval" }, { status: 400 });
    }
    // Update existing
    await prisma.loadingItem.deleteMany({ where: { reportId: report.id } });
  } else {
    // Create new with date locked to start of today to satisfy the @@unique constraint
    report = await prisma.loadingReport.create({
      data: {
        userId: session.user.id,
        date: today,
      }
    });
  }

  const totalValue = items.reduce((sum: number, item: any) => sum + item.value, 0);

  await prisma.loadingReport.update({
    where: { id: report.id },
    data: {
      totalValue,
      status: "PENDING", // Submit for approval
      items: {
        create: items.map((item: any) => ({
          qty: item.qty,
          value: item.value,
          productId: item.productId,
        }))
      }
    }
  });

  return NextResponse.json({ success: true, status: "PENDING" });
}
