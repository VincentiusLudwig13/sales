import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/outlets/[outletId]/collections
// Returns pending collection-only PaymentSettlements for an outlet.
// These are the options shown in the admin bill-settlement picker.
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

    const collections = await prisma.paymentSettlement.findMany({
      where: {
        collectionOnly: true,
        status: "PENDING",
        bill: { outletId }
      },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error("[Outlet Collections] GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
