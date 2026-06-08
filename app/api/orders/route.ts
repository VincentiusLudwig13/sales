import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string(),
  qty: z.number().min(1),
  grossSales: z.number().min(0),
  discount: z.number().min(0).default(0),
  nettSales: z.number().min(0),
});

const orderSchema = z.object({
  userId: z.string(),
  outletId: z.string(),
  grossSales: z.number().min(0),
  discount: z.number().min(0).default(0),
  nettSales: z.number().min(0),
  topTerm: z.string(),
  photoUrl: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = orderSchema.parse(body);

    const order = await prisma.$transaction(async (tx) => {
      // Create the order and items
      const newOrder = await tx.order.create({
        data: {
          userId: validatedData.userId,
          outletId: validatedData.outletId,
          grossSales: validatedData.grossSales,
          discount: validatedData.discount,
          nettSales: validatedData.nettSales,
          topTerm: validatedData.topTerm,
          photoUrl: validatedData.photoUrl,
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

      // Generate a bill for the order
      const newBill = await tx.bill.create({
        data: {
          value: validatedData.nettSales,
          outstanding: validatedData.nettSales,
          status: "NON_DUE", // or OVERDUE based on logic, but default NON_DUE
          outletId: validatedData.outletId,
          orderId: newOrder.id,
        }
      });

      return { order: newOrder, bill: newBill };
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
