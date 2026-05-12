import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/firebase-admin";

// Test endpoint: GET /api/test-push
// Sends a test push notification to the current logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const tokens = await prisma.fCMToken.findMany({
      where: { userId: session.user.id },
      select: { token: true },
    });

    if (tokens.length === 0) {
      return NextResponse.json({
        error: "No FCM tokens found. Open the app first to register.",
        userId: session.user.id,
      });
    }

    const result = await sendPushNotification(
      tokens.map((t) => t.token),
      "Test Push 🔔",
      "If you see this, push notifications work!",
      { test: "true" }
    );

    return NextResponse.json({
      message: "Push sent!",
      tokens: tokens.length,
      result,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
