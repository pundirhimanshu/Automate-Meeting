'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong');
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/login?reset=true');
                }, 2000);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
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
                            <h1>Invalid Reset Link</h1>
                            <p className="subtitle">This password reset link is invalid. Please request a new one.</p>
                            <div style={{ marginTop: '24px', textAlign: 'center' }}>
                                <Link
                                    href="/forgot-password"
                                    className="btn btn-primary btn-lg"
                                    style={{ borderRadius: '10px', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' }}
                                >
                                    Request New Link
                                </Link>
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

                        <h1>Reset your password</h1>
                        <p className="subtitle">Enter your new password below.</p>

                        {success ? (
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
                                    <span style={{ fontSize: '1.2rem' }}>✅</span>
                                    <strong>Password reset successful!</strong>
                                </div>
                                <p style={{ margin: 0 }}>
                                    Redirecting you to the sign-in page...
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
                                    <label htmlFor="password">New Password</label>
                                    <input
                                        id="password"
                                        type="password"
                                        className="input"
                                        placeholder="Enter new password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        autoFocus
                                    />
                                </div>

                                <div className="input-group">
                                    <label htmlFor="confirmPassword">Confirm Password</label>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        className="input"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
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
                                            Resetting...
                                        </>
                                    ) : (
                                        'Reset Password'
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

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="auth-page"><div className="auth-card"><div className="spinner" style={{ margin: '40px auto' }}></div></div></div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
