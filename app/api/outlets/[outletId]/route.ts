import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ outletId: string }> }
) {
  try {
    const { outletId } = await params;

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      include: {
        bills: {
          where: { outstanding: { gt: 0 } },
          orderBy: { date: "asc" },
          include: {
            order: {
              include: {
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!outlet) {
      return NextResponse.json({ error: "Outlet not found" }, { status: 404 });
    }

    return NextResponse.json(outlet);
  } catch (error) {
    console.error("[Outlet] GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ outletId: string }> }
) {
  try {
    const { outletId } = await params;
    const body = await req.json();
    const { routeSeq } = body;

    if (routeSeq === undefined) {
      return NextResponse.json({ error: "routeSeq is required" }, { status: 400 });
    }

    const updatedOutlet = await prisma.outlet.update({
      where: { id: outletId },
      data: { routeSeq: parseInt(routeSeq) }
    });

    return NextResponse.json(updatedOutlet);
  } catch (error) {
    console.error("[Outlet] PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
