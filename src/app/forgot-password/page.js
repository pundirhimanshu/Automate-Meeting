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
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                .auth-monochrome {
                    display: flex; min-height: 100vh; background-color: #000 !important; color: #fff !important; font-family: 'Inter', sans-serif;
                }
                .auth-form-side { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; position: relative; }
                .auth-image-side { flex: 1; padding: 12px; display: flex; background: #000; }
                .auth-image-container { 
                    flex: 1; position: relative; background: #050505; border-radius: 24px; overflow: hidden; 
                    display: flex; flex-direction: column; align-items: center; justify-content: center; 
                }
                
                /* GLOBE ANIMATION & REALISM */
                .globe-wrapper {
                    position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; opacity: 1; pointer-events: none;
                }
                .globe-wrapper::before {
                    content: ''; position: absolute; width: 650px; height: 650px; background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%); border-radius: 50%; z-index: 0;
                }
                .globe-sphere {
                    position: relative; width: 600px; height: 600px; border-radius: 50%; background: #000; overflow: hidden; z-index: 1;
                    box-shadow: inset -60px -60px 150px rgba(0,0,0,0.9), inset 60px 60px 150px rgba(255,255,255,0.05), inset 0 0 40px rgba(255,255,255,0.02);
                }
                .globe-sphere::after {
                    content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 40%); z-index: 5; pointer-events: none;
                }
                .globe-map {
                    position: absolute; inset: 0; 
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1000' height='500' viewBox='0 0 1000 500'%3E%3Cpath fill='rgba(255,255,255,0.3)' d='M50,100h10v10H50V100z M120,50h10v10h-10V50z M200,150h10v10h-10V150z M300,80h10v10h-10V80z M400,200h10v10h-10V200z M500,120h10v10h-10V120z M600,280h10v10h-10V280z M700,50h10v10h-10V50z M800,220h10v10h-10V220z M900,100h10v10h-10V100z M150,300h10v10h-10V300z M250,400h10v10h-10V400z M350,320h10v10h-10V320z M450,420h10v10h-10V420z M550,350h10v10h-10V350z M650,450h10v10h-10V450z M750,310h10v10h-10V310z M850,380h10v10h-10V380z M950,420h10v10h-10V420z'/%3E%3C/svg%3E");
                    background-size: 1200px 600px; animation: rotateGlobe 50s linear infinite; mask-image: radial-gradient(circle, black 45%, transparent 72%); opacity: 0.6; z-index: 2;
                }
                @keyframes rotateGlobe { from { background-position: 0 0; } to { background-position: -1200px 0; } }

                .globe-radar-layer { position: absolute; inset: 0; z-index: 4; }
                .radar-path { fill: none; stroke: rgba(255,255,255,0.2); stroke-width: 1.5; stroke-linecap: round; stroke-dasharray: 5, 20; animation: radarFlow 3s linear infinite; }
                @keyframes radarFlow { from { stroke-dashoffset: 50; } to { stroke-dashoffset: 0; } }

                .ping { 
                    position: absolute; width: 6px; height: 6px; background: #fff; border-radius: 50%; transform: translate(-50%, -50%); 
                    box-shadow: 0 0 15px #fff; z-index: 6; 
                }
                .ping::after { content: ''; position: absolute; inset: -10px; border: 1px solid #fff; border-radius: 50%; animation: ping-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
                @keyframes ping-pulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(3); opacity: 0; } }

                .halftone-content { 
                    position: relative; z-index: 10; padding: 60px; width: 100%; margin-top: auto; 
                    background: linear-gradient(to top, #000 0%, transparent 100%);
                }
                .halftone-title { font-family: 'Inria Serif', serif; font-size: 2.75rem; font-weight: 800; font-style: italic; line-height: 1.1; color: #fff; letter-spacing: -1.5px; }
                .auth-container { max-width: 420px; width: 100%; }
                .brand-header { display: flex; align-items: center; gap: 12px; margin-bottom: 60px; }
                .brand-logo { width: 32px; height: 32px; border-radius: 50%; background: #fff; color: #000 !important; display: flex !important; align-items: center; justify-content: center; font-weight: 800; }
                .brand-name { font-weight: 800; font-size: 1.5rem; letter-spacing: -1px; }
                .welcome-title { font-family: 'Inria Serif', serif; font-size: 2.5rem; font-weight: 800; font-style: italic; margin-bottom: 12px; letter-spacing: -1.5px; }
                .welcome-subtitle { color: #888; font-size: 0.9375rem; margin-bottom: 32px; }
                .input-group-premium { margin-bottom: 20px; }
                .input-group-premium label { display: block; font-size: 0.75rem; font-weight: 700; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
                .input-premium { width: 100%; background: #000 !important; border: 1px solid #222 !important; color: #fff !important; border-radius: 12px !important; padding: 14px 16px !important; font-size: 0.9375rem; transition: all 0.2s; }
                .input-premium:focus { border-color: #444 !important; outline: none; background: #050505 !important; }
                .btn-sign-in { width: 100%; background: #fff !important; color: #000 !important; border-radius: 12px !important; padding: 16px !important; font-weight: 700 !important; border: none !important; font-size: 1rem !important; cursor: pointer; margin-top: 12px; transition: 0.2s; }
                .btn-sign-in:hover { background: #e5e5e5 !important; }
                .btn-sign-in:disabled { opacity: 0.5; cursor: not-allowed; }
                @media (max-width: 768px) { .auth-image-side { display: none; } }
            ` }} />

            <div className="auth-monochrome">
                <div className="auth-image-side">
                    <div className="auth-image-container">
                        <div className="globe-wrapper">
                            <div className="globe-sphere">
                                <div className="globe-map" />
                                <svg className="globe-radar-layer" viewBox="0 0 600 600">
                                    <path className="radar-path" d="M150,200 Q300,50 450,250" />
                                    <path className="radar-path" d="M100,300 Q250,450 400,350" style={{ animationDelay: '1s' }} />
                                    <path className="radar-path" d="M500,200 Q400,100 300,150" style={{ animationDelay: '1.5s' }} />
                                    <path className="radar-path" d="M200,450 Q300,300 400,400" style={{ animationDelay: '2s' }} />
                                </svg>
                                <div className="ping" style={{ top: '33%', left: '25%', animationDelay: '0s' }} />
                                <div className="ping" style={{ top: '42%', left: '75%', animationDelay: '1s' }} />
                                <div className="ping" style={{ top: '58%', left: '66%', animationDelay: '0.5s' }} />
                                <div className="ping" style={{ top: '75%', left: '33%', animationDelay: '1.5s' }} />
                                <div className="ping" style={{ top: '50%', left: '50%', animationDelay: '2s' }} />
                            </div>
                        </div>
                        <div className="halftone-content">
                            <h2 className="halftone-title">Security is our priority. Reset your access.</h2>
                        </div>
                    </div>
                </div>

                <div className="auth-form-side">
                    <div className="auth-container">
                        <div className="brand-header">
                            <div className="brand-name">Scheduler</div>
                        </div>

                        <h1 className="welcome-title">Forgot password?</h1>
                        <p className="welcome-subtitle">Enter your email and we'll send you a link to get back into your account.</p>

                        {sent ? (
                            <div style={{ padding: '24px', background: '#111', borderRadius: '16px', fontSize: '0.875rem', color: '#888', marginBottom: '32px', border: '1px solid #222' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>✉️</span>
                                    <strong style={{ color: '#fff' }}>Check your email</strong>
                                </div>
                                <p style={{ margin: 0 }}>
                                    If an account exists with <strong>{email}</strong>, we've sent a password reset link.
                                </p>
                                <p style={{ margin: '12px 0 0', fontSize: '0.8125rem', color: '#666' }}>
                                    Link expires in 1 hour.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {error && (
                                    <div style={{ padding: '12px 14px', background: 'rgba(225, 29, 72, 0.1)', borderRadius: '8px', color: '#fb7185', fontSize: '0.8125rem', marginBottom: '16px', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
                                        {error}
                                    </div>
                                )}

                                <div className="input-group-premium">
                                    <label htmlFor="email">Email address</label>
                                    <input id="email" type="email" className="input-premium" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                                </div>

                                <button type="submit" className="btn-sign-in" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send reset link'}
                                </button>
                            </form>
                        )}

                        <div style={{ marginTop: '32px', textAlign: 'center', color: '#555', fontSize: '0.875rem' }}>
                            Remember password?{' '}
                            <Link href="/login" style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}>Back to sign in</Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
