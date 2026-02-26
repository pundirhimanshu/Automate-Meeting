'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const verified = searchParams.get('verified');
    const verifyError = searchParams.get('error');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push('/scheduling');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="logo-icon">C</div>
                    Automate Meetings
                </div>
                <h1>Welcome back</h1>
                <p className="subtitle">Sign in to your account to continue</p>

                <button className="btn-google" type="button">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {verified === 'true' && (
                        <div style={{
                            padding: '12px 14px',
                            background: '#dcfce7',
                            borderRadius: '8px',
                            color: '#166534',
                            fontSize: '0.8125rem',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <span style={{ fontSize: '1.1rem' }}>✅</span>
                            <span><strong>Email verified!</strong> You can now sign in to your account.</span>
                        </div>
                    )}
                    {verified === 'already' && (
                        <div style={{
                            padding: '12px 14px',
                            background: '#f0f9ff',
                            borderRadius: '8px',
                            color: '#0c4a6e',
                            fontSize: '0.8125rem',
                        }}>
                            Your email is already verified. Please sign in.
                        </div>
                    )}
                    {verifyError && (
                        <div style={{
                            padding: '10px 14px',
                            background: '#fce4ec',
                            borderRadius: '8px',
                            color: '#e11d48',
                            fontSize: '0.8125rem',
                        }}>
                            {verifyError}
                        </div>
                    )}
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
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                        style={{ borderRadius: '8px', marginTop: '8px' }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                                Signing in...
                            </>
                        ) : (
                            'Sign in'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    Don't have an account?{' '}
                    <Link href="/signup">Sign up for free</Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="auth-page"><div className="auth-card"><div className="spinner" style={{ margin: '40px auto' }}></div></div></div>}>
            <LoginForm />
        </Suspense>
    );
}
