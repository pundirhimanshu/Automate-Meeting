import admin from "firebase-admin";

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) return true;

  try {
    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!rawJson) {
      console.warn("Firebase Admin: FIREBASE_SERVICE_ACCOUNT_JSON is missing in .env");
      return false;
    }

    const serviceAccount = JSON.parse(rawJson);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    if (serviceAccount.project_id) {
      console.log("Firebase Admin: Initializing with project ID:", serviceAccount.project_id);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("Firebase Admin: Initialized successfully");
      return true;
    } else {
      console.warn("Firebase Admin: Service account missing project_id.");
      return false;
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    return false;
  }
};

export const sendPushNotification = async (tokens, title, body, data = {}) => {
  const isInitialized = initializeFirebaseAdmin();
  
  if (!isInitialized || !tokens || tokens.length === 0) {
    console.warn(`[FCM] Notification skipped: Init=${isInitialized}, Tokens=${tokens?.length || 0}`);
    return { success: false, error: "Initialization failed or no tokens" };
  }

  // Send with BOTH notification AND data fields.
  // - notification: Required for Chrome to auto-display when tab is closed
  // - data: Used by our foreground handler for in-app toast
  // - webpush.headers.Urgency: Ensures Chrome treats this as high priority
  const message = {
    notification: {
      title: String(title),
      body: String(body),
    },
    data: {
      ...data,
      title: String(title),
      body: String(body),
    },
    webpush: {
      headers: {
        Urgency: "high",
      },
      notification: {
        title: String(title),
        body: String(body),
        icon: "/uploads/logos/ID.png",
        requireInteraction: true,
      },
    },
    tokens: Array.isArray(tokens) ? tokens : [tokens],
  };


  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM] Push notifications sent: Success=${response.successCount}, Failure=${response.failureCount}`);
    
    // Auto-clean invalid/stale tokens from the database
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.log(`[FCM] Token failed:`, resp.error?.code, resp.error?.message);
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token"
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      // Delete stale tokens from DB
      if (failedTokens.length > 0) {
        try {
          const { prisma } = await import("@/lib/prisma");
          await prisma.fCMToken.deleteMany({
            where: { token: { in: failedTokens } }
          });
          console.log(`[FCM] Cleaned up ${failedTokens.length} stale tokens from database`);
        } catch (cleanupErr) {
          console.error("[FCM] Failed to cleanup stale tokens:", cleanupErr);
        }
      }

      return { success: true, failedTokens };
    }
    
    return { success: true };
  } catch (error) {
    console.error("[FCM] Error sending push notification:", error);
    return { success: false, error };
  }
};


export default admin;

