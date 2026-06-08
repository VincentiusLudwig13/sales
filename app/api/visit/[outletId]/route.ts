import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ outletId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { outletId } = await params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestVisit = await prisma.outletVisit.findFirst({
      where: {
        userId: session.user.id,
        outletId,
        date: { gte: today }
      },
      include: {
        stockChecks: true,
        posmChecks: true
      },
      orderBy: {
        date: "desc"
      }
    });

    return NextResponse.json(latestVisit || null);
  } catch (error) {
    console.error("[Visit] GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ outletId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { outletId } = await params;
    const body = await req.json();
    const { stockChecks, posmChecks } = body;
    // stockChecks: [{ productId, qty, expiryDate? }]
    // posmChecks: [{ posmId, qty }]

    // Delete any existing visit today to overwrite/update the check status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.outletVisit.deleteMany({
      where: {
        userId: session.user.id,
        outletId,
        date: { gte: today }
      }
    });

    const visit = await prisma.outletVisit.create({
      data: {
        userId: session.user.id,
        outletId,
        stockChecks: {
          create: (stockChecks ?? []).map((sc: { productId: string; qty: number; expiryDate?: string }) => ({
            productId: sc.productId,
            qty: sc.qty,
            expiryDate: sc.expiryDate ? new Date(sc.expiryDate) : null,
          })),
        },
        posmChecks: {
          create: (posmChecks ?? []).map((pc: { posmId: string; qty: number }) => ({
            posmId: pc.posmId,
            qty: pc.qty,
          })),
        },
      },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error("[Visit] POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
