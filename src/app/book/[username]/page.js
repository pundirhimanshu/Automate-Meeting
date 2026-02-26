'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function UserBookingLandingPage() {
    const params = useParams();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch(`/api/public/${params.username}`);
            if (res.ok) {
                const data = await res.json();
                setUserData(data.user);
            }
        } catch (e) { } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="booking-page">
                <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }}></div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="booking-page">
                <div className="confirmation-card">
                    <h2>User not found</h2>
                    <p style={{ color: 'var(--text-tertiary)', marginTop: '8px' }}>This booking page doesn't exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="booking-page">
            <div style={{ maxWidth: '600px', width: '100%' }}>
                {/* User Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div className="avatar avatar-xl" style={{ margin: '0 auto 12px', background: userData.brandColor }}>
                        {userData.name.charAt(0).toUpperCase()}
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{userData.name}</h1>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        Select an event type to schedule a meeting
                    </p>
                </div>

                {/* Event Type Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {userData.eventTypes.map((et) => (
                        <Link
                            key={et.id}
                            href={`/book/${params.username}/${et.slug}`}
                            style={{
                                display: 'block',
                                padding: '20px 24px',
                                background: 'white',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                borderLeft: `4px solid ${et.color}`,
                                transition: 'all 0.2s ease',
                                boxShadow: 'var(--shadow-sm)',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <div style={{ fontWeight: 600, fontSize: '1.0625rem', marginBottom: '6px' }}>{et.title}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    {et.duration} min
                                </span>
                                {et.location && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                        {et.location}
                                    </span>
                                )}
                            </div>
                            {et.description && (
                                <p style={{ marginTop: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{et.description}</p>
                            )}
                        </Link>
                    ))}
                </div>

                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                    Powered by <strong style={{ color: 'var(--primary)' }}>Automate Meetings</strong>
                </div>
            </div>
        </div>
    );
}
