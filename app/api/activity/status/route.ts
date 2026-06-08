import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check product loading
  const productLoading = await prisma.loadingReport.findFirst({
    where: {
      userId: session.user.id,
      date: { gte: today },
    },
    include: {
      items: true
    }
  });

  // Check POSM loading
  const posmLoading = await prisma.posmLoadingReport.findFirst({
    where: {
      userId: session.user.id,
      date: { gte: today },
    },
    include: {
      items: true
    }
  });

  // Check daily route closure status
  const closure = await prisma.routeClosure.findFirst({
    where: {
      userId: session.user.id,
      date: { gte: today },
    },
  });

  // Is validated if both exist and both are APPROVED
  const isProductApproved = productLoading?.status === "APPROVED";
  const isPosmApproved = posmLoading?.status === "APPROVED";
  
  const isValidated = isProductApproved && isPosmApproved;
  const isClosed = closure?.isClosed || false;

  return NextResponse.json({
    isValidated,
    isClosed,
    productLoadingStatus: productLoading?.status || "DRAFT",
    posmLoadingStatus: posmLoading?.status || "DRAFT",
    productItems: productLoading?.items || [],
    posmItems: posmLoading?.items || [],
    user: { id: session.user.id, name: session.user.name }
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const closure = await prisma.routeClosure.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
      update: {
        isClosed: true,
      },
      create: {
        userId: session.user.id,
        date: today,
        isClosed: true,
      },
    });

    return NextResponse.json({ success: true, closure });
  } catch (error) {
    console.error("[Status] POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
