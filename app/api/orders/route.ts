import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string(),
  qty: z.number().min(1),
  grossSales: z.number().min(0),
  discount: z.number().min(0).default(0),
  nettSales: z.number().min(0),
});

const returnItemSchema = z.object({
  productId: z.string(),
  qty: z.number().min(1),
  value: z.number().min(0),
});

const orderSchema = z.object({
  userId: z.string().optional(),
  outletId: z.string(),
  grossSales: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  nettSales: z.number().min(0).default(0),
  topTerm: z.string(),
  photoUrl: z.string().optional(),
  collectionAmount: z.number().min(0).default(0),
  returnDeduction: z.number().min(0).default(0),
  items: z.array(orderItemSchema).optional().default([]),
  returns: z.array(returnItemSchema).optional().default([]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessionUserId = session.user.id;

  try {
    const body = await req.json();
    const validatedData = orderSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the order with returns and items (items can be empty if only processing returns/collections)
      const newOrder = await tx.order.create({
        data: {
          userId: sessionUserId,
          outletId: validatedData.outletId,
          grossSales: validatedData.grossSales,
          discount: validatedData.discount,
          nettSales: validatedData.nettSales,
          topTerm: validatedData.topTerm,
          photoUrl: validatedData.photoUrl,
          collectionAmount: validatedData.collectionAmount,
          returnDeduction: validatedData.returnDeduction,
          items: {
            create: validatedData.items.map(item => ({
              productId: item.productId,
              qty: item.qty,
              grossSales: item.grossSales,
              discount: item.discount,
              nettSales: item.nettSales,
            }))
          }
        },
      });

      // 2. If there are return items, create the Return object
      if (validatedData.returns.length > 0) {
        await tx.return.create({
          data: {
            orderId: newOrder.id,
            totalValue: validatedData.returnDeduction,
            items: {
              create: validatedData.returns.map(retItem => ({
                productId: retItem.productId,
                qty: retItem.qty,
                value: retItem.value
              }))
            }
          }
        });
      }

      // 3. Generate a bill for this new order if there are items ordered
      let newBill = null;
      if (validatedData.items.length > 0) {
        newBill = await tx.bill.create({
          data: {
            value: validatedData.nettSales,
            outstanding: validatedData.nettSales,
            status: "NON_DUE",
            outletId: validatedData.outletId,
            orderId: newOrder.id,
          }
        });
      }

      // 4. Deduct outstanding bills based on collection and return deduction
      // We process older outstanding bills first (FIFO)
      let remainingDeduction = validatedData.collectionAmount + validatedData.returnDeduction;

      if (remainingDeduction > 0) {
        const outstandingBills = await tx.bill.findMany({
          where: {
            outletId: validatedData.outletId,
            outstanding: { gt: 0 }
          },
          orderBy: { date: "asc" } // Pay oldest first
        });

        for (const bill of outstandingBills) {
          if (remainingDeduction <= 0) break;

          const amountToDeduct = Math.min(bill.outstanding, remainingDeduction);
          const newOutstanding = bill.outstanding - amountToDeduct;
          const newSettled = bill.settled + amountToDeduct;

          // Record payment settlement for audit trail if it is part of collectionAmount
          // If we also track returnDeduction, we can record it as a approved settlement
          if (validatedData.collectionAmount > 0) {
            // Calculate how much of this deduction is from collection vs return
            // For simplicity, we create a PaymentSettlement marked as APPROVED directly
            await tx.paymentSettlement.create({
              data: {
                amount: amountToDeduct,
                status: "APPROVED", // Auto-approved because it's recorded directly at order submission
                userId: sessionUserId,
                billId: bill.id
              }
            });
          }

          await tx.bill.update({
            where: { id: bill.id },
            data: {
              outstanding: newOutstanding,
              settled: newSettled,
            }
          });

          remainingDeduction -= amountToDeduct;
        }
      }

      return { order: newOrder, bill: newBill };
    }, {
      timeout: 30000 // 30 seconds timeout limit
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    console.error("[Orders] POST full error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
