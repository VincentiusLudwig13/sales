import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DEV ONLY: Approve today's product and posm loading for the current user
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [product, posm] = await Promise.all([
    prisma.loadingReport.updateMany({
      where: { userId: session.user.id, date: { gte: today } },
      data: { status: "APPROVED" },
    }),
    prisma.posmLoadingReport.updateMany({
      where: { userId: session.user.id, date: { gte: today } },
      data: { status: "APPROVED" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    productUpdated: product.count,
    posmUpdated: posm.count,
  });
}
