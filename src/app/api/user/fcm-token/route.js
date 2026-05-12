import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { token } = await request.json();
    if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

    await prisma.fCMToken.upsert({
      where: { token },
      update: { userId: session.user.id },
      create: {
        token,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("FCM Token POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { token } = await request.json();
    if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

    await prisma.fCMToken.deleteMany({
      where: {
        token,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("FCM Token DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
