'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // First, unregister any old/stale service workers
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                registrations.forEach((registration) => {
                    // Force update existing service workers
                    registration.update().catch(() => {});
                });
            });

            // Register our Firebase service worker
            navigator.serviceWorker
                .register('/firebase-messaging-sw.js', { scope: '/' })
                .then((registration) => {
                    console.log('[SW] Firebase service worker registered, scope:', registration.scope);
                    console.log('[SW] Active:', !!registration.active, 'Waiting:', !!registration.waiting, 'Installing:', !!registration.installing);
                    
                    // Force update to pick up any new version
                    registration.update().catch(() => {});
                })
                .catch((err) => {
                    console.error('[SW] Service worker registration failed:', err);
                });
        }
    }, []);

    return null;
}
