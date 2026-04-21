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
            <div className="page-header" style={{ marginBottom: '32px' }}>
                <h1 className="page-title" style={{ fontFamily: 'Inria Serif', fontStyle: 'italic', fontWeight: '700', fontSize: '2rem' }}>Subscription</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9375rem' }}>
                    Manage your plan and billing
                </p>
            </div>

            {/* Current Plan Badge */}
            <div className="card" style={{ 
                padding: '24px', 
                marginBottom: '40px',
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '1rem', color: '#1a1a1a' }}>Current Plan:</span>
                    <span style={{
                        padding: '6px 16px',
                        borderRadius: '24px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.025em',
                        background: currentPlan === 'free' ? '#f3f4f6' : '#1a1a1a',
                        color: currentPlan === 'free' ? '#4b5563' : '#fff',
                    }}>
                        {PLANS[currentPlan]?.name || 'Free'}
                    </span>
                    {status === 'pending_verification' && (
                        <span style={{
                            padding: '6px 16px',
                            borderRadius: '24px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: '#fff7ed',
                            color: '#c2410c',
                            border: '1px solid #ffedd5'
                        }}>
                            ⏳ Payment Verification Pending
                        </span>
                    )}
                    {validUntil && status === 'active' && currentPlan !== 'free' && (
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                            Valid until {new Date(validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                    )}
                </div>
            </div>

            {/* Plans Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                {Object.entries(PLANS).map(([key, plan]) => {
                    const isCurrentPlan = currentPlan === key;
                    const isPopular = key === 'pro';
                    return (
                        <div
                            key={key}
                            className="card"
                            style={{
                                padding: '40px 32px',
                                background: '#ffffff',
                                border: isPopular ? '2px solid #1a1a1a' : '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: isPopular ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {isPopular && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-14px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: '#1a1a1a',
                                    color: '#fff',
                                    padding: '4px 20px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}>
                                    Most Popular
                                </div>
                            )}
                            <h3 style={{ 
                                fontWeight: 700, 
                                fontSize: '1.25rem', 
                                marginBottom: '8px',
                                fontFamily: 'Inria Serif',
                                fontStyle: 'italic',
                                color: '#1a1a1a'
                            }}>
                                {plan.name}
                            </h3>
                            <div style={{ marginBottom: '24px', borderBottom: '1px solid #f3f4f6', pb: '24px' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1a1a1a' }}>
                                    {plan.price === 0 ? 'Free' : `${plan.currency}${plan.price}`}
                                </span>
                                {plan.period && (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginLeft: '4px' }}>
                                        /{plan.period}
                                    </span>
                                )}
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 }}>
                                {PLAN_FEATURES_LIST[key].map((feature, i) => (
                                    <li key={i} style={{
                                        padding: '10px 0',
                                        fontSize: '0.9375rem',
                                        color: 'var(--text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                    }}>
                                        <div style={{ 
                                            width: '18px', 
                                            height: '18px', 
                                            borderRadius: '50%', 
                                            background: '#f0fdf4', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            <span style={{ color: '#16a34a', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            {isCurrentPlan ? (
                                <button className="btn btn-secondary btn-sm w-full" disabled style={{ opacity: 0.6, cursor: 'not-allowed', padding: '12px' }}>
                                    Current Plan
                                </button>
                            ) : key === 'free' ? (
                                <button className="btn btn-secondary btn-sm w-full" disabled style={{ opacity: 0.6, cursor: 'not-allowed', padding: '12px' }}>
                                    Free Forever
                                </button>
                            ) : (
                                <button
                                    className={`btn ${isPopular ? 'btn-primary' : 'btn-secondary'} btn-sm w-full`}
                                    onClick={() => setSelectedPlan(key)}
                                    disabled={status === 'pending_verification'}
                                    style={{ 
                                        padding: '12px', 
                                        background: isPopular ? '#1a1a1a' : '#fff',
                                        color: isPopular ? '#fff' : '#1a1a1a',
                                        border: '1px solid #1a1a1a'
                                    }}
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
                    <div className="card" style={{ 
                        maxWidth: '480px', 
                        width: '100%', 
                        padding: '40px',
                        background: '#ffffff',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: 'none',
                        position: 'relative'
                    }}>
                        <button 
                            onClick={() => setSelectedPlan(null)}
                            style={{
                                position: 'absolute',
                                top: '24px',
                                right: '24px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#9ca3af',
                                fontSize: '1.25rem'
                            }}
                        >
                            ✕
                        </button>
                        <h2 style={{ 
                            fontWeight: 700, 
                            fontSize: '1.5rem', 
                            marginBottom: '8px',
                            fontFamily: 'Inria Serif',
                            fontStyle: 'italic',
                            color: '#1a1a1a'
                        }}>
                            Upgrade to {PLANS[selectedPlan]?.name}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '32px' }}>
                            Securely upgrade your plan via UPI transfer.
                        </p>

                        {/* UPI Details */}
                        <div style={{
                            background: '#f9fafb',
                            borderRadius: '16px',
                            padding: '24px',
                            marginBottom: '24px',
                            textAlign: 'center',
                            border: '1px solid #f3f4f6'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                Pay to UPI ID
                            </div>
                            <div style={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                padding: '12px 24px',
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                display: 'inline-block',
                                cursor: 'pointer',
                                marginBottom: '12px',
                                color: '#1a1a1a',
                                transition: 'all 0.2s ease'
                            }}
                                onClick={() => { 
                                    navigator.clipboard.writeText(UPI_ID); 
                                    alert('UPI ID copied to clipboard!');
                                }}
                                title="Click to copy"
                                onMouseOver={(e) => e.target.style.borderColor = '#1a1a1a'}
                                onMouseOut={(e) => e.target.style.borderColor = '#e5e7eb'}
                            >
                                {UPI_ID}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#1a1a1a', fontWeight: 600 }}>
                                Amount: ₹{PLANS[selectedPlan]?.price}
                            </div>
                        </div>

                        <div style={{
                            background: '#fafafa',
                            border: '1px solid #f0f0f0',
                            borderRadius: '12px',
                            padding: '16px 20px',
                            fontSize: '0.875rem',
                            color: '#4b5563',
                            marginBottom: '24px',
                            lineHeight: 1.6,
                        }}>
                            <div style={{ fontWeight: 700, color: '#1a1a1a', marginBottom: '8px', fontSize: '0.9375rem' }}>Instructions</div>
                            <ol style={{ paddingLeft: '20px', margin: 0 }}>
                                <li>Open your UPI app (GPay, PhonePe, etc.)</li>
                                <li>Transfer <strong>₹{PLANS[selectedPlan]?.price}</strong> to the ID above</li>
                                <li>Copy the <strong>12-digit Transaction ID</strong></li>
                                <li>Paste it below to activate your plan</li>
                            </ol>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', display: 'block', color: '#1a1a1a' }}>
                                UPI Transaction ID
                            </label>
                            <input
                                type="text"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                placeholder="Enter 12-digit ID"
                                className="input"
                                style={{ 
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                    fontSize: '0.9375rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#1a1a1a'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
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

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                style={{ 
                                    flex: 1, 
                                    padding: '14px', 
                                    borderRadius: '10px',
                                    background: '#fff',
                                    color: '#1a1a1a',
                                    border: '1px solid #e5e7eb',
                                    fontWeight: 600
                                }}
                                onClick={() => { setSelectedPlan(null); setTransactionId(''); setMessage(null); }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                style={{ 
                                    flex: 1, 
                                    padding: '14px', 
                                    borderRadius: '10px',
                                    background: '#1a1a1a',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: 700
                                }}
                                onClick={handleUpgrade}
                                disabled={submitting || !transactionId.trim()}
                            >
                                {submitting ? 'Verifying...' : 'Submit Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
