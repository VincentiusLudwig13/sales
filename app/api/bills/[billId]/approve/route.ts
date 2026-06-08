import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;
    
    // Find pending settlements for this bill
    const settlements = await prisma.paymentSettlement.findMany({
      where: { billId, status: "PENDING" }
    });

    if (settlements.length === 0) {
      return NextResponse.json({ error: "No pending settlements found" }, { status: 404 });
    }

    const totalSettledAmount = settlements.reduce((sum, s) => sum + s.amount, 0);

    const updatedBill = await prisma.$transaction(async (tx) => {
      // Update settlements to APPROVED
      await tx.paymentSettlement.updateMany({
        where: { billId, status: "PENDING" },
        data: { status: "APPROVED" }
      });

      // Update the bill
      const bill = await tx.bill.update({
        where: { id: billId },
        data: {
          settled: { increment: totalSettledAmount },
          outstanding: { decrement: totalSettledAmount }
        }
      });

      // If fully paid, update status to PAID
      if (bill.outstanding <= 0) {
        await tx.bill.update({
          where: { id: billId },
          data: { status: "PAID", outstanding: 0 }
        });
      }

      return bill;
    });

    return NextResponse.json(updatedBill);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
