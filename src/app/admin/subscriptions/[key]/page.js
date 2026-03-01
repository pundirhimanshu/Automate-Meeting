'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const SECRET_KEY = 'amt2026secure';

export default function AdminSubscriptionsPage() {
    const params = useParams();
    const [authorized, setAuthorized] = useState(false);
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.key === SECRET_KEY) {
            setAuthorized(true);
            fetchSubscriptions();
        } else {
            setLoading(false);
        }
    }, [params.key]);

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/subscription/verify');
            if (res.ok) {
                const data = await res.json();
                setSubscriptions(data);
            }
        } catch (e) {
            console.error('Error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId, action) => {
        if (!confirm(`${action === 'approve' ? 'Approve' : 'Reject'} this subscription?`)) return;
        try {
            const res = await fetch('/api/subscription/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action }),
            });
            if (res.ok) fetchSubscriptions();
            else alert('Failed to update');
        } catch (e) {
            alert('Error updating subscription');
        }
    };

    if (!authorized) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0a0a',
                color: '#fff',
                fontFamily: 'system-ui, sans-serif',
            }}>
                <h1 style={{ fontSize: '1.25rem', opacity: 0.5 }}>404 — Page Not Found</h1>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0a0a0a',
            color: '#e5e5e5',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '32px 24px',
        }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>🔐 Subscription Verification</h1>
                        <p style={{ fontSize: '0.875rem', color: '#888', marginTop: '4px' }}>Admin Panel — Automate Meetings</p>
                    </div>
                    <button
                        onClick={fetchSubscriptions}
                        disabled={loading}
                        style={{
                            padding: '8px 20px',
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        {loading ? 'Loading...' : '↻ Refresh'}
                    </button>
                </div>

                {subscriptions.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: '#111',
                        borderRadius: '12px',
                        border: '1px solid #222',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✅</div>
                        <p style={{ color: '#888' }}>No pending subscription requests</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {subscriptions.map((sub) => (
                            <div key={sub.id} style={{
                                background: '#111',
                                border: `1px solid ${sub.status === 'pending_verification' ? '#f59e0b40' : '#22222280'}`,
                                borderRadius: '12px',
                                padding: '20px 24px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{sub.user?.name || 'Unknown'}</div>
                                        <div style={{ fontSize: '0.8125rem', color: '#888', marginTop: '2px' }}>{sub.user?.email}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ fontSize: '0.6875rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plan</div>
                                            <div style={{ fontWeight: 700, textTransform: 'capitalize', color: '#60a5fa' }}>{sub.plan}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.6875rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</div>
                                            <div style={{ fontWeight: 700, color: '#22c55e' }}>₹{sub.amount || 0}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.6875rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transaction ID</div>
                                            <div style={{
                                                fontWeight: 600,
                                                fontFamily: 'monospace',
                                                fontSize: '0.9375rem',
                                                background: '#1a1a1a',
                                                padding: '2px 10px',
                                                borderRadius: '6px',
                                            }}>
                                                {sub.transactionId || 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.6875rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
                                            <span style={{
                                                padding: '2px 10px',
                                                borderRadius: '10px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                background: sub.status === 'pending_verification' ? '#f59e0b20' : '#22c55e20',
                                                color: sub.status === 'pending_verification' ? '#f59e0b' : '#22c55e',
                                            }}>
                                                {sub.status === 'pending_verification' ? '⏳ Pending' : '✅ Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {sub.status === 'pending_verification' && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => handleAction(sub.userId, 'approve')}
                                            style={{
                                                padding: '8px 20px',
                                                background: '#22c55e',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.8125rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ✓ Approve
                                        </button>
                                        <button
                                            onClick={() => handleAction(sub.userId, 'reject')}
                                            style={{
                                                padding: '8px 20px',
                                                background: '#ef4444',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.8125rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ✕ Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.75rem', color: '#444' }}>
                    Last refreshed: {new Date().toLocaleString('en-IN')}
                </div>
            </div>
        </div>
    );
}
