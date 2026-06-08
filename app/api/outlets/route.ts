import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      bills: { select: { outstanding: true, status: true } },
      orders: { select: { nettSales: true } },
    },
  });
  return NextResponse.json(outlets);
}
