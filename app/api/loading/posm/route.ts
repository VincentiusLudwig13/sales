import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items } = await req.json(); // Array of { posmId, qty }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Validate that all posmIds actually exist in the database
  const posmIds = items.map((item: any) => item.posmId);
  const existingPosms = await prisma.posm.findMany({
    where: { id: { in: posmIds } },
    select: { id: true }
  });
  const existingPosmIds = new Set(existingPosms.map((p) => p.id));
  const invalidIds = posmIds.filter((id: string) => !existingPosmIds.has(id));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      {
        error: "STALE_POSM_IDS",
        message: "Some POSM items no longer exist. Your local data is outdated — please refresh the page and try again.",
        invalidIds
      },
      { status: 422 }
    );
  }

  // Check if report already exists for today
  let report = await prisma.posmLoadingReport.findFirst({
    where: { userId: session.user.id, date: { gte: today } }
  });

  if (report) {
    if (report.status !== "DRAFT" && report.status !== "REJECTED") {
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
