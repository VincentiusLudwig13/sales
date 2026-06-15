import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // type "bill_settlement": admin matched an order bill with a collection-only submission
    //   id           = Bill ID (the outstanding order bill)
    //   collectionId = PaymentSettlement ID (collection-only, PENDING)
    // type "settlement": direct/bundled settlement — legacy path
    //   id           = PaymentSettlement ID
    //   targetBillId = optional bill override
    const { type, id, action, targetBillId, collectionId } = await req.json();

    if (!type || !id || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const targetStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // 1. Product Loading Report
    if (type === "product_loading") {
      const report = await prisma.loadingReport.update({ where: { id }, data: { status: targetStatus } });
      return NextResponse.json({ success: true, report });
    }

    // 2. POSM Loading Report
    if (type === "posm_loading") {
      const report = await prisma.posmLoadingReport.update({ where: { id }, data: { status: targetStatus } });
      return NextResponse.json({ success: true, report });
    }

    // 3. Bill settlement (NEW): admin picked an order bill + a collection-only submission
    if (type === "bill_settlement") {
      if (!collectionId) {
        return NextResponse.json({ error: "collectionId is required for bill_settlement" }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const bill = await tx.bill.findUnique({ where: { id } });
        if (!bill) throw new Error(`Bill ${id} not found`);

        const collection = await tx.paymentSettlement.findUnique({ where: { id: collectionId } });
        if (!collection) throw new Error(`Collection ${collectionId} not found`);
        if (collection.status !== "PENDING") throw new Error("Collection already processed");
        if (!collection.collectionOnly) throw new Error("Only collection-only submissions can settle order bills");

        // Mark the collection-only settlement and re-link it to this specific bill
        const updated = await tx.paymentSettlement.update({
          where: { id: collectionId },
          data: { status: targetStatus, billId: id }
        });

        // If approved → credit the bill
        if (action === "approve") {
          const newSettled = bill.settled + collection.amount;
          const newOutstanding = Math.max(0, bill.outstanding - collection.amount);
          await tx.bill.update({
            where: { id },
            data: {
              settled: newSettled,
              outstanding: newOutstanding,
              status: newOutstanding <= 0 ? "PAID" : bill.status
            }
          });
        }

        return updated;
      });

      return NextResponse.json({ success: true, settlement: result });
    }

    // 4. Legacy direct/bundled settlement
    if (type === "settlement") {
      const settlement = await prisma.paymentSettlement.findUnique({ where: { id } });
      if (!settlement) return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
      if (settlement.status !== "PENDING") return NextResponse.json({ error: "Settlement already processed" }, { status: 400 });

      const billIdToCredit = targetBillId ?? settlement.billId;

      const result = await prisma.$transaction(async (tx) => {
        const updatedSettlement = await tx.paymentSettlement.update({
          where: { id },
          data: {
            status: targetStatus,
            ...(targetBillId && targetBillId !== settlement.billId ? { billId: targetBillId } : {})
          }
        });

        if (action === "approve") {
          const bill = await tx.bill.findUnique({ where: { id: billIdToCredit } });
          if (!bill) throw new Error(`Bill ${billIdToCredit} not found`);
          const newSettled = bill.settled + settlement.amount;
          const newOutstanding = Math.max(0, bill.outstanding - settlement.amount);
          await tx.bill.update({
            where: { id: billIdToCredit },
            data: {
              settled: newSettled,
              outstanding: newOutstanding,
              status: newOutstanding <= 0 ? "PAID" : bill.status
            }
          });
        }
        return updatedSettlement;
      });

      return NextResponse.json({ success: true, settlement: result });
    }

    return NextResponse.json({ error: "Invalid record type" }, { status: 400 });
  } catch (error) {
    console.error("[Admin Approvals API] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
