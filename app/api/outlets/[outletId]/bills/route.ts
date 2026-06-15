import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/outlets/[outletId]/bills
// Returns all unsettled bills for an outlet, including the order's collectionAmount
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ outletId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { outletId } = await params;

    const bills = await prisma.bill.findMany({
      where: {
        outletId,
        outstanding: { gt: 0 }
      },
      include: {
        order: {
          select: {
            id: true,
            date: true,
            nettSales: true,
            collectionAmount: true,
            topTerm: true
          }
        }
      },
      orderBy: { date: "asc" }
    });

    return NextResponse.json(bills);
  } catch (error) {
    console.error("[Outlet Bills] GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
