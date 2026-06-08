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

  // Check if report already exists for today
  let report = await prisma.loadingReport.findFirst({
    where: { userId: session.user.id, date: { gte: today } }
  });

  if (report) {
    if (report.status !== "DRAFT") {
      return NextResponse.json({ error: "Report is already locked for approval" }, { status: 400 });
    }
    // Update existing
    await prisma.loadingItem.deleteMany({ where: { reportId: report.id } });
  } else {
    // Create new
    report = await prisma.loadingReport.create({
      data: {
        userId: session.user.id,
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
