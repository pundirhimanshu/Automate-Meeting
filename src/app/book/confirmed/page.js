'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ConfirmedContent() {
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!bookingId) {
            setLoading(false);
            setError('Missing booking reference');
            return;
        }

        const fetchBooking = async () => {
            try {
                const res = await fetch(`/api/bookings/${bookingId}`);
                if (res.ok) {
                    const data = await res.json();
                    setBooking(data.booking);
                } else {
                    setError('Unable to find your booking details.');
                }
            } catch (err) {
                setError('Something went wrong. Please check your email for confirmation.');
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [bookingId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="flex items-center justify-center p-4" style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
                <div className="card text-center" style={{ maxWidth: '400px', width: '100%', padding: '40px 24px', boxShadow: 'var(--shadow-lg)' }}>
                    <div style={{ width: '64px', height: '64px', background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center', margin: '0 auto 24px' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Oops!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>{error || 'Booking not found'}</p>
                    <Link href="/" className="btn btn-primary w-full" style={{ padding: '12px' }}>
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    const { eventType } = booking;
    const host = eventType.user;
    const startTime = new Date(booking.startTime);
    
    // Fallback timezone if not in booking (should be there)
    const timezone = booking.timezone || 'UTC';

    return (
        <div className="flex flex-col items-center justify-center p-4" style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: 'var(--font-sans)' }}>
            <div className="card" style={{ maxWidth: '480px', width: '100%', borderRadius: '24px', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
                {/* Brand Strip */}
                <div style={{ height: '8px', width: '100%', backgroundColor: host?.brandColor || 'var(--primary)' }}></div>
                
                <div style={{ padding: '40px 32px' }}>
                    {/* Success Icon */}
                    <div className="flex items-center justify-center scale-in" style={{ width: '80px', height: '80px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', margin: '0 auto 32px' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <div className="text-center" style={{ marginBottom: '32px' }}>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>You're all booked!</h1>
                        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                            A calendar invitation has been sent to <br/><strong style={{ color: 'var(--text-primary)' }}>{booking.inviteeEmail}</strong>.
                        </p>
                    </div>

                    {/* Booking Details Card */}
                    <div style={{ background: 'var(--bg-page)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)', marginBottom: '32px' }}>
                        <div className="flex items-center gap-md" style={{ marginBottom: '20px' }}>
                            {(host?.logo || host?.avatar) ? (
                                <img 
                                    src={host?.logo || host?.avatar} 
                                    alt={host?.name} 
                                    style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'contain', background: 'white', border: '1px solid var(--border-light)' }}
                                />
                            ) : (
                                <div className="flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>
                                    {host?.name?.charAt(0)}
                                </div>
                            )}
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Meeting with {host?.name}</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{eventType.title}</div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-md" style={{ color: 'var(--text-secondary)' }}>
                            <div className="flex items-center gap-md">
                                <div className="flex items-center justify-center" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid var(--border-light)', color: 'var(--text-tertiary)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-md">
                                <div className="flex items-center justify-center" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid var(--border-light)', color: 'var(--text-tertiary)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>({eventType.duration} min)</span>
                            </div>
                            <div className="flex items-center gap-md">
                                <div className="flex items-center justify-center" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', border: '1px solid var(--border-light)', color: 'var(--text-tertiary)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                                </div>
                                <span style={{ fontSize: '0.875rem' }}>{timezone}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <button 
                            onClick={() => window.print()}
                            className="btn btn-secondary"
                            style={{ padding: '14px', borderRadius: '12px' }}
                        >
                            Print
                        </button>
                        <Link 
                            href="/" 
                            className="btn btn-primary"
                            style={{ padding: '14px', borderRadius: '12px', background: '#1a1a1a', border: 'none' }}
                        >
                            Done
                        </Link>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-sm" style={{ padding: '24px', background: 'var(--bg-page)', borderTop: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Powered by</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>Scheduler</span>
                </div>
            </div>

            <style jsx>{`
                @keyframes scaleIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .scale-in {
                    animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `}</style>
        </div>
    );
}

export default function ConfirmedPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center" style={{ minHeight: '100vh' }}><div className="spinner"></div></div>}>
            <ConfirmedContent />
        </Suspense>
    );
}
