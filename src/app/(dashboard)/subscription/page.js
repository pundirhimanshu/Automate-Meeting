'use client';

import { useState, useEffect } from 'react';
import { PLANS } from '@/lib/plans';

const PLAN_FEATURES_LIST = {
    free: [
        '3 Event Types',
        '50 Bookings/month',
        '1 Team Member',
        'Google Calendar',
        'Google Meet',
    ],
    pro: [
        'Unlimited Event Types',
        'Unlimited Bookings',
        'Up to 5 Team Members',
        'Google Calendar + Meet',
        'Zoom Integration',
        'Custom Branding',
    ],
    enterprise: [
        'Everything in Pro',
        'Unlimited Team Members',
        'Priority Support',
        'Custom Integrations',
        'Advanced Analytics',
    ],
};

const UPI_ID = '8532871802@ptsbi';

export default function SubscriptionPage() {
    const [currentPlan, setCurrentPlan] = useState('free');
    const [status, setStatus] = useState('active');
    const [validUntil, setValidUntil] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            const res = await fetch('/api/subscription');
            const data = await res.json();
            setCurrentPlan(data.plan || 'free');
            setStatus(data.status || 'active');
            setValidUntil(data.validUntil);
        } catch (e) {
            console.error('Failed to fetch subscription:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        if (!selectedPlan || !transactionId.trim()) {
            setMessage({ type: 'error', text: 'Please enter your UPI Transaction ID' });
            return;
        }
        setSubmitting(true);
        setMessage(null);
        try {
            const res = await fetch('/api/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: selectedPlan, transactionId: transactionId.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                setCurrentPlan(data.plan);
                setStatus(data.status);
                setSelectedPlan(null);
                setTransactionId('');
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Something went wrong' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <h1 className="page-title">Subscription</h1>
                </div>
                <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Subscription</h1>
                <p style={{ color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Manage your plan and billing
                </p>
            </div>

            {/* Current Plan Badge */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Current Plan:</span>
                    <span style={{
                        padding: '4px 14px',
                        borderRadius: '20px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: currentPlan === 'free' ? 'var(--bg-tertiary)' : 'var(--primary)',
                        color: currentPlan === 'free' ? 'var(--text-secondary)' : '#fff',
                    }}>
                        {PLANS[currentPlan]?.name || 'Free'}
                    </span>
                    {status === 'pending_verification' && (
                        <span style={{
                            padding: '4px 14px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: '#ff990020',
                            color: '#ff9900',
                        }}>
                            ⏳ Payment Verification Pending
                        </span>
                    )}
                    {validUntil && status === 'active' && currentPlan !== 'free' && (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                            Valid until {new Date(validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                    )}
                </div>
            </div>

            {/* Plans Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {Object.entries(PLANS).map(([key, plan]) => {
                    const isCurrentPlan = currentPlan === key;
                    const isPopular = key === 'pro';
                    return (
                        <div
                            key={key}
                            className="card"
                            style={{
                                padding: '28px 24px',
                                border: isPopular ? '2px solid var(--primary)' : undefined,
                                position: 'relative',
                            }}
                        >
                            {isPopular && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'var(--primary)',
                                    color: '#fff',
                                    padding: '2px 16px',
                                    borderRadius: '12px',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}>
                                    Most Popular
                                </div>
                            )}
                            <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '4px' }}>
                                {plan.name}
                            </h3>
                            <div style={{ marginBottom: '20px' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 800 }}>
                                    {plan.price === 0 ? 'Free' : `${plan.currency}${plan.price}`}
                                </span>
                                {plan.period && (
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                                        {plan.period}
                                    </span>
                                )}
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                                {PLAN_FEATURES_LIST[key].map((feature, i) => (
                                    <li key={i} style={{
                                        padding: '6px 0',
                                        fontSize: '0.8125rem',
                                        color: 'var(--text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}>
                                        <span style={{ color: 'var(--success, #22c55e)' }}>✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            {isCurrentPlan ? (
                                <button className="btn btn-secondary btn-sm w-full" disabled>
                                    Current Plan
                                </button>
                            ) : key === 'free' ? (
                                <button className="btn btn-secondary btn-sm w-full" disabled>
                                    Free Forever
                                </button>
                            ) : (
                                <button
                                    className={`btn ${isPopular ? 'btn-primary' : 'btn-secondary'} btn-sm w-full`}
                                    onClick={() => setSelectedPlan(key)}
                                    disabled={status === 'pending_verification'}
                                >
                                    {status === 'pending_verification' ? 'Pending' : `Upgrade to ${plan.name}`}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Payment Modal */}
            {selectedPlan && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px',
                }}
                    onClick={(e) => { if (e.target === e.currentTarget) setSelectedPlan(null); }}
                >
                    <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '32px' }}>
                        <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '4px' }}>
                            Upgrade to {PLANS[selectedPlan]?.name}
                        </h2>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: '24px' }}>
                            Pay ₹{PLANS[selectedPlan]?.price}/month via UPI
                        </p>

                        {/* UPI Details */}
                        <div style={{
                            background: 'var(--bg-secondary)',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '20px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Pay to UPI ID
                            </div>
                            <div style={{
                                fontSize: '1.125rem',
                                fontWeight: 700,
                                padding: '8px 16px',
                                background: 'var(--bg-primary)',
                                borderRadius: '8px',
                                display: 'inline-block',
                                cursor: 'pointer',
                                marginBottom: '8px',
                            }}
                                onClick={() => { navigator.clipboard.writeText(UPI_ID); }}
                                title="Click to copy"
                            >
                                {UPI_ID}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                Click to copy • Amount: ₹{PLANS[selectedPlan]?.price}
                            </div>
                        </div>

                        <div style={{
                            background: '#0069ff10',
                            border: '1px solid #0069ff30',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '20px',
                            lineHeight: 1.5,
                        }}>
                            <strong>Steps:</strong><br />
                            1. Open Google Pay / PhonePe / Paytm<br />
                            2. Pay ₹{PLANS[selectedPlan]?.price} to the UPI ID above<br />
                            3. Copy the <strong>UPI Transaction ID</strong> (12-digit number)<br />
                            4. Paste it below and submit
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                                UPI Transaction ID
                            </label>
                            <input
                                type="text"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                placeholder="e.g. 432156789012"
                                className="input"
                                style={{ width: '100%' }}
                            />
                        </div>

                        {message && (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                fontSize: '0.8125rem',
                                marginBottom: '16px',
                                background: message.type === 'success' ? '#22c55e15' : '#ef444415',
                                color: message.type === 'success' ? '#22c55e' : '#ef4444',
                                border: `1px solid ${message.type === 'success' ? '#22c55e30' : '#ef444430'}`,
                            }}>
                                {message.text}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                style={{ flex: 1 }}
                                onClick={() => { setSelectedPlan(null); setTransactionId(''); setMessage(null); }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                style={{ flex: 1 }}
                                onClick={handleUpgrade}
                                disabled={submitting || !transactionId.trim()}
                            >
                                {submitting ? 'Submitting...' : 'Submit Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
