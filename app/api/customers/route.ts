import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  picName: z.string().min(1, "PIC Name is required"),
  picPhone: z.string().min(1, "PIC Phone is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  topTerm: z.string().default("COD"),
  photoUrl: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = customerSchema.parse(body);

    const outlet = await prisma.outlet.create({
      data: {
        name: validatedData.name,
        picName: validatedData.picName,
        picPhone: validatedData.picPhone,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        topTerm: validatedData.topTerm,
        photoUrl: validatedData.photoUrl,
        isActive: true,
      },
    });

    return NextResponse.json(outlet, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  const customers = await prisma.outlet.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(customers);
}
