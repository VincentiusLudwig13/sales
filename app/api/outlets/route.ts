import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true },
    orderBy: { routeSeq: "asc" },
    include: {
      bills: { select: { outstanding: true, value: true, settled: true, status: true } },
      orders: { select: { nettSales: true, topTerm: true } },
    },
  });
  return NextResponse.json(outlets);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, picName, picPhone, latitude, longitude, topTerm, photoUrl, routeGroup } = body;

    if (!name || !picName || !picPhone) {
      return NextResponse.json({ error: "Name, PIC Name, and PIC Phone are required" }, { status: 400 });
    }

    // Get current max routeSeq
    const maxSeqOutlet = await prisma.outlet.findFirst({
      orderBy: { routeSeq: "desc" },
    });
    const nextSeq = (maxSeqOutlet?.routeSeq || 0) + 1;

    const newOutlet = await prisma.outlet.create({
      data: {
        name,
        picName,
        picPhone,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        topTerm: topTerm || "COD",
        photoUrl: photoUrl || null,
        routeSeq: nextSeq,
        routeGroup: routeGroup || "Route A",
        isActive: true,
      },
    });

    return NextResponse.json(newOutlet, { status: 201 });
  } catch (error) {
    console.error("[Outlets] POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
