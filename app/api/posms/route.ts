import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posms = await prisma.posm.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(posms);
}
