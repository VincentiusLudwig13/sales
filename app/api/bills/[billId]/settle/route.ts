import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const settleSchema = z.object({
  amount: z.number().min(1, "Amount must be greater than 0"),
  userId: z.string()
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;
    const body = await req.json();
    const validatedData = settleSchema.parse(body);

    // Verify bill exists
    const bill = await prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (validatedData.amount > bill.outstanding) {
      return NextResponse.json({ error: "Amount exceeds outstanding balance" }, { status: 400 });
    }

    // Create pending settlement
    const settlement = await prisma.paymentSettlement.create({
      data: {
        amount: validatedData.amount,
        status: "PENDING",
        userId: validatedData.userId,
        billId: bill.id
      }
    });

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
