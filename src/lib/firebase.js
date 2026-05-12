import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const getFcmToken = async () => {
  try {
    // First, make sure our service worker is registered
    let swRegistration = null;
    if ("serviceWorker" in navigator) {
      swRegistration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/" }
      );
      // Wait for the SW to be ready
      await navigator.serviceWorker.ready;
      console.log("[FCM] Service Worker ready, scope:", swRegistration.scope);
    }

    const messaging = getMessaging(app);
    const status = await Notification.requestPermission();
    
    if (status === "granted") {
      const tokenOptions = {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      };
      
      if (swRegistration) {
        tokenOptions.serviceWorkerRegistration = swRegistration;
      }
      
      const fcmToken = await getToken(messaging, tokenOptions);
      console.log("[FCM] Token obtained:", fcmToken ? fcmToken.substring(0, 20) + "..." : "none");
      return fcmToken;
    }
    
    console.log("[FCM] Notification permission denied:", status);
    return null;
  } catch (error) {
    console.error("[FCM] Error getting token:", error);
    return null;
  }
};

export const onForegroundMessage = (callback) => {
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};
