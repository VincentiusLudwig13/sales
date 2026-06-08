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

    // Query existing visit today to merge fields
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingVisit = await prisma.outletVisit.findFirst({
      where: {
        userId: session.user.id,
        outletId,
        date: { gte: today }
      },
      include: {
        stockChecks: true,
        posmChecks: true
      }
    });

    // Merge stockChecks and posmChecks
    let mergedStockChecks = stockChecks;
    let mergedPosmChecks = posmChecks;

    if (existingVisit) {
      if (!stockChecks) {
        // If saving POSM, preserve existing stock checks
        mergedStockChecks = existingVisit.stockChecks.map(sc => ({
          productId: sc.productId,
          qty: sc.qty,
          expiryDate: sc.expiryDate ? sc.expiryDate.toISOString() : undefined
        }));
      }
      if (!posmChecks) {
        // If saving Stock, preserve existing POSM checks
        mergedPosmChecks = existingVisit.posmChecks.map(pc => ({
          posmId: pc.posmId,
          qty: pc.qty
        }));
      }

      await prisma.outletVisit.deleteMany({
        where: {
          userId: session.user.id,
          outletId,
          date: { gte: today }
        }
      });
    }

    const visit = await prisma.outletVisit.create({
      data: {
        userId: session.user.id,
        outletId,
        stockChecks: {
          create: (mergedStockChecks ?? []).map((sc: { productId: string; qty: number; expiryDate?: string }) => ({
            productId: sc.productId,
            qty: sc.qty,
            expiryDate: sc.expiryDate ? new Date(sc.expiryDate) : null,
          })),
        },
        posmChecks: {
          create: (mergedPosmChecks ?? []).map((pc: { posmId: string; qty: number }) => ({
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
