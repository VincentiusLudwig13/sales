import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const report = await prisma.posmLoadingReport.update({
      where: { id },
      data: { status: "APPROVED" }
    });
    return NextResponse.json({ success: true, report });
  } catch (error) {
    return NextResponse.json({ error: "Failed to approve report" }, { status: 500 });
  }
}
