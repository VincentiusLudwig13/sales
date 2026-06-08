import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items } = await req.json(); // Array of { posmId, qty }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if report already exists for today
  let report = await prisma.posmLoadingReport.findFirst({
    where: { userId: session.user.id, date: { gte: today } }
  });

  if (report) {
    if (report.status !== "DRAFT") {
      return NextResponse.json({ error: "Report is already locked for approval" }, { status: 400 });
    }
    await prisma.posmLoadingItem.deleteMany({ where: { reportId: report.id } });
  } else {
    report = await prisma.posmLoadingReport.create({
      data: {
        userId: session.user.id,
        date: today,
      }
    });
  }

  await prisma.posmLoadingReport.update({
    where: { id: report.id },
    data: {
      status: "PENDING", // Submit for approval
      items: {
        create: items.map((item: any) => ({
          qty: item.qty,
          posmId: item.posmId,
        }))
      }
    }
  });

  return NextResponse.json({ success: true, status: "PENDING" });
}
