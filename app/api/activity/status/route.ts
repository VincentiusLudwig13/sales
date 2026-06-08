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
  });

  // Check POSM loading
  const posmLoading = await prisma.posmLoadingReport.findFirst({
    where: {
      userId: session.user.id,
      date: { gte: today },
    },
  });

  // Is validated if both exist and both are APPROVED
  const isProductApproved = productLoading?.status === "APPROVED";
  const isPosmApproved = posmLoading?.status === "APPROVED";
  
  const isValidated = isProductApproved && isPosmApproved;

  return NextResponse.json({
    isValidated,
    productLoadingStatus: productLoading?.status || "DRAFT",
    posmLoadingStatus: posmLoading?.status || "DRAFT"
  });
}
