import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { custId: string } }
) {
  try {
    const { custId } = params;

    const bills = await prisma.bill.findMany({
      where: {
        outletId: custId,
        outstanding: { gt: 0 }
      },
      orderBy: {
        date: "asc"
      }
    });

    return NextResponse.json(bills);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
