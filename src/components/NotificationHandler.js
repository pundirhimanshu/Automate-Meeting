'use client';

import { useEffect, useState, useCallback } from 'react';
import { getFcmToken, onForegroundMessage } from '@/lib/firebase';
import { useSession } from 'next-auth/react';

export default function NotificationHandler() {
    const { data: session } = useSession();
    const [toasts, setToasts] = useState([]);

    // Play a doorbell "ding-dong" notification sound
    const playNotificationSound = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;

            // "Ding" — higher note
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.type = 'sine';
            osc1.frequency.value = 698;
            gain1.gain.setValueAtTime(0.4, now);
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc1.start(now);
            osc1.stop(now + 0.5);

            // "Dong" — lower note
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.value = 523;
            gain2.gain.setValueAtTime(0.4, now + 0.35);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
            osc2.start(now + 0.35);
            osc2.stop(now + 0.9);

            setTimeout(() => ctx.close(), 1200);
        } catch (e) {
            console.log('Could not play notification sound:', e);
        }
    }, []);







    const addToast = useCallback((title, body) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, title, body, exiting: false }]);
        // Auto-dismiss after 6 seconds
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 400);
        }, 6000);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 400);
    }, []);

    useEffect(() => {
        if (!session?.user) return;

        let unsubscribe = null;

        const setup = async () => {
            try {
                if (!('Notification' in window)) return;

                const token = await getFcmToken();
                if (token) {
                    await fetch('/api/user/fcm-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token }),
                    });
                    console.log('FCM Token registered successfully');
                }

                // Listen for foreground messages
                unsubscribe = onForegroundMessage((payload) => {
                    console.log('Foreground message received:', payload);

                    const title = payload?.data?.title || payload?.notification?.title || 'New Notification';
                    const body = payload?.data?.body || payload?.notification?.body || '';


                    // Play notification sound
                    playNotificationSound();

                    // Show in-app toast popup
                    addToast(title, body);


                    // Also try browser notification (works when tab is not focused)
                    try {
                        if (Notification.permission === 'granted') {
                            new Notification(title, { body, icon: '/uploads/logos/ID.png' });
                        }
                    } catch (e) {
                        // Browser might block this, toast is the primary fallback
                    }

                    // Dispatch event to refresh notification bell
                    window.dispatchEvent(new CustomEvent('fcm-notification-received', { detail: payload }));
                });
            } catch (error) {
                console.error('Error setting up notifications:', error);
            }
        };

        setup();

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [session, addToast]);

    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none',
        }}>
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    style={{
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        background: '#1a1a1a',
                        color: '#fff',
                        padding: '16px 20px',
                        borderRadius: '14px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)',
                        minWidth: '320px',
                        maxWidth: '400px',
                        animation: toast.exiting
                            ? 'toastSlideOut 0.4s ease-in forwards'
                            : 'toastSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    onClick={() => dismissToast(toast.id)}
                >
                    {/* Bell icon */}
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontWeight: 700,
                            fontSize: '0.9375rem',
                            fontFamily: 'Inria Serif, serif',
                            fontStyle: 'italic',
                            marginBottom: '4px',
                            lineHeight: 1.3,
                        }}>
                            {toast.title}
                        </div>
                        <div style={{
                            fontSize: '0.8125rem',
                            color: 'rgba(255,255,255,0.7)',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {toast.body}
                        </div>
                    </div>
                    {/* Close button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            padding: '2px',
                            flexShrink: 0,
                            marginTop: '2px',
                            lineHeight: 1,
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ))}

            <style jsx>{`
                @keyframes toastSlideIn {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes toastSlideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(120%); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
