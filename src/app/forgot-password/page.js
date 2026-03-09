'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong');
            } else {
                setSent(true);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-split-layout">
            <div className="auth-form-side">
                <div className="auth-inner-form">
                    <div className="auth-card">
                        <div className="auth-logo" style={{ justifyContent: 'center', marginBottom: '48px' }}>
                            <img
                                src="/uploads/logos/Not Collapse.png"
                                alt="Logo"
                                style={{ height: '110px', width: 'auto', objectFit: 'contain' }}
                            />
                        </div>

                        <h1>Forgot your password?</h1>
                        <p className="subtitle">
                            Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
                        </p>

                        {sent ? (
                            <div style={{
                                padding: '16px',
                                background: '#dcfce7',
                                borderRadius: '10px',
                                color: '#166534',
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                                marginTop: '16px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>✉️</span>
                                    <strong>Check your email</strong>
                                </div>
                                <p style={{ margin: 0 }}>
                                    If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
                                    Please check your inbox (and spam folder).
                                </p>
                                <p style={{ margin: '12px 0 0', fontSize: '0.8125rem', color: '#15803d' }}>
                                    The link will expire in 1 hour.
                                </p>
                            </div>
                        ) : (
                            <form className="auth-form" onSubmit={handleSubmit}>
                                {error && (
                                    <div style={{
                                        padding: '10px 14px',
                                        background: '#fce4ec',
                                        borderRadius: '8px',
                                        color: '#e11d48',
                                        fontSize: '0.8125rem',
                                    }}>
                                        {error}
                                    </div>
                                )}

                                <div className="input-group">
                                    <label htmlFor="email">Email address</label>
                                    <input
                                        id="email"
                                        type="email"
                                        className="input"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary btn-lg w-full"
                                    disabled={loading}
                                    style={{ borderRadius: '10px', marginTop: '8px', padding: '14px' }}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>
                            </form>
                        )}

                        <div className="auth-footer" style={{ marginTop: '32px', textAlign: 'center', color: '#73767a' }}>
                            Remember your password?{' '}
                            <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Back to sign in</Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auth-image-side">
                <div className="auth-image-container">
                    <div className="auth-image-quote">
                        <div>"Your time,</div>
                        <div className="auth-quote-indented">perfectly scheduled."</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
