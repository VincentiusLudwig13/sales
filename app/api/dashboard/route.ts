import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In a real app, we'd filter by the current month.
  // For now, aggregate over all data for this user.

  // 1. Total Sales
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id }
  });
  const totalSales = orders.reduce((sum, order) => sum + order.nettSales, 0);

  // 2. Paid / Unpaid Bill
  const bills = await prisma.bill.findMany({
    where: { order: { userId: session.user.id } }
  });
  const paidBill = bills.reduce((sum, bill) => sum + bill.settled, 0);
  const unpaidBill = bills.reduce((sum, bill) => sum + bill.outstanding, 0);

  // 3. Outlet Active (count unique outlets that have placed an order)
  const activeOutletsCount = await prisma.order.groupBy({
    by: ['outletId'],
    where: { userId: session.user.id }
  });
  const outletActive = activeOutletsCount.length;

  // 4. Outlet Visit & Total Call
  const visits = await prisma.outletVisit.findMany({
    where: { userId: session.user.id }
  });
  // Unique outlets visited
  const uniqueVisited = new Set(visits.map(v => v.outletId));
  const outletVisit = uniqueVisited.size;
  const totalCall = visits.length;

  return NextResponse.json({
    totalSales,
    paidBill,
    unpaidBill,
    outletActive,
    outletVisit,
    totalCall
  });
}
