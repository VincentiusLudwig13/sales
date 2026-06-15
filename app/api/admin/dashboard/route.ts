import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Core KPIs
    const todayOrders = await prisma.order.findMany({
      where: { date: { gte: today } }
    });
    const totalSales = todayOrders.reduce((sum, o) => sum + o.nettSales, 0);

    const bills = await prisma.bill.findMany();
    const totalCollectionTarget = bills.reduce((sum, b) => sum + b.value, 0);
    const totalCollectionActual = bills.reduce((sum, b) => sum + b.settled, 0);

    const todayVisitsCount = await prisma.outletVisit.count({
      where: { date: { gte: today } }
    });

    const totalOutletsCount = await prisma.outlet.count();

    // 2. Pending Approvals Lists
    const pendingProductReports = await prisma.loadingReport.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, username: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, price: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const pendingPosmReports = await prisma.posmLoadingReport.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, username: true } },
        items: {
          include: {
            posm: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Outstanding Bills from real orders (have items) — these need to be settled
    // Admin matches each bill against a collection-only submission from the same outlet
    const pendingBills = await prisma.bill.findMany({
      where: {
        outstanding: { gt: 0 },
        order: { items: { some: {} } } // only bills from real orders (with items)
      },
      include: {
        outlet: { select: { id: true, name: true } },
        order: {
          select: {
            id: true,
            date: true,
            nettSales: true,
            topTerm: true,
            collectionAmount: true
          }
        }
      },
      orderBy: { date: "asc" }
    });

    // Pending settlements that came bundled with a regular order (collectionOnly=false)
    // These are shown in a simple approve/reject list — no bill-picker needed
    const pendingDirectSettlements = await prisma.paymentSettlement.findMany({
      where: { status: "PENDING", collectionOnly: false },
      include: {
        user: { select: { id: true, name: true } },
        bill: {
          include: {
            outlet: { select: { id: true, name: true } },
            order: { select: { id: true, date: true, nettSales: true, collectionAmount: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // 3. Salesmen Daily Statuses
    const salesmenData = await prisma.user.findMany({
      where: { role: "SALESMAN" },
      include: {
        loadingReports: {
          where: { date: { gte: today } }
        },
        posmReports: {
          where: { date: { gte: today } }
        },
        routeClosures: {
          where: { date: { gte: today } }
        },
        orders: {
          where: { date: { gte: today } }
        },
        visits: {
          where: { date: { gte: today } }
        }
      }
    });

    const salesmenStatuses = salesmenData.map((s) => {
      const prodRep = s.loadingReports[0];
      const posmRep = s.posmReports[0];
      const closure = s.routeClosures[0];
      const todaySales = s.orders.reduce((sum, o) => sum + o.nettSales, 0);

      return {
        id: s.id,
        name: s.name,
        username: s.username,
        productStatus: prodRep ? prodRep.status : "NOT_SUBMITTED",
        posmStatus: posmRep ? posmRep.status : "NOT_SUBMITTED",
        isClosed: closure ? closure.isClosed : false,
        visitsCount: s.visits.length,
        todaySales
      };
    });

    // 4. MTD Sales Data
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const mtdOrders = await prisma.order.findMany({
      where: {
        date: { gte: startOfMonth }
      },
      select: {
        date: true,
        nettSales: true
      },
      orderBy: { date: "asc" }
    });

    // 5. Active vs Inactive Stores Ratio (active if at least 1 order in the last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeOutlets = await prisma.outlet.findMany({
      where: {
        orders: {
          some: {
            date: { gte: sevenDaysAgo }
          }
        }
      },
      select: { id: true }
    });
    const activeOutletsCount = activeOutlets.length;
    const inactiveOutletsCount = Math.max(0, totalOutletsCount - activeOutletsCount);

    // 6. All Bills with settlements & order info
    const allBills = await prisma.bill.findMany({
      include: {
        outlet: { select: { id: true, name: true } },
        order: {
          select: {
            id: true,
            date: true,
            nettSales: true,
          }
        },
        settlements: {
          include: {
            user: { select: { name: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      metrics: {
        totalSales,
        totalCollectionTarget,
        totalCollectionActual,
        todayVisitsCount,
        totalOutletsCount,
        pendingProductReportsCount: pendingProductReports.length,
        pendingPosmReportsCount: pendingPosmReports.length,
        pendingSettlementsCount: pendingBills.length // badge = number of unpaid order bills
      },
      pendingProductReports,
      pendingPosmReports,
      pendingBills,
      pendingDirectSettlements,
      salesmenStatuses,
      mtdOrders,
      storeActivity: {
        active: activeOutletsCount,
        inactive: inactiveOutletsCount,
        total: totalOutletsCount
      },
      allBills
    });
  } catch (error) {
    console.error("[Admin Dashboard API] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
