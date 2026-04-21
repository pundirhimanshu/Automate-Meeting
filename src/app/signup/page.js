'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get('invite');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, invite: inviteToken }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong');
                setLoading(false);
                return;
            }

            setEmailSent(true);
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Shared styles for dark theme
    const commonStyles = (
        <style dangerouslySetInnerHTML={{ __html: `
            .auth-monochrome {
                display: flex;
                min-height: 100vh;
                background-color: #000000 !important;
                color: #ffffff !important;
                font-family: 'Inter', sans-serif;
            }
            .auth-form-side {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                position: relative;
                overflow-y: auto;
            }
            .auth-image-side {
                flex: 1;
                padding: 12px;
                display: flex;
                background: #000;
            }
            .auth-image-container {
                flex: 1;
                position: relative;
                background: #050505;
                border-radius: 24px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            /* GLOBE ANIMATION & REALISM */
            .globe-wrapper {
                position: absolute;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 1;
                pointer-events: none;
            }
            
            .globe-wrapper::before {
                content: '';
                position: absolute;
                width: 650px;
                height: 650px;
                background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
                border-radius: 50%;
                z-index: 0;
            }

            .globe-sphere {
                position: relative;
                width: 600px;
                height: 600px;
                border-radius: 50%;
                background: #000;
                overflow: hidden;
                z-index: 1;
                box-shadow: 
                    inset -60px -60px 150px rgba(0,0,0,0.9),
                    inset 60px 60px 150px rgba(255,255,255,0.05),
                    inset 0 0 40px rgba(255,255,255,0.02);
            }

            .globe-sphere::after {
                content: '';
                position: absolute;
                inset: 0;
                background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 40%);
                z-index: 5;
                pointer-events: none;
            }

            .globe-map {
                position: absolute;
                inset: 0;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1000' height='500' viewBox='0 0 1000 500'%3E%3Cpath fill='rgba(255,255,255,0.3)' d='M50,100h10v10H50V100z M120,50h10v10h-10V50z M200,150h10v10h-10V150z M300,80h10v10h-10V80z M400,200h10v10h-10V200z M500,120h10v10h-10V120z M600,280h10v10h-10V280z M700,50h10v10h-10V50z M800,220h10v10h-10V220z M900,100h10v10h-10V100z M150,300h10v10h-10V300z M250,400h10v10h-10V400z M350,320h10v10h-10V320z M450,420h10v10h-10V420z M550,350h10v10h-10V350z M650,450h10v10h-10V450z M750,310h10v10h-10V310z M850,380h10v10h-10V380z M950,420h10v10h-10V420z'/%3E%3C/svg%3E");
                background-size: 1200px 600px;
                animation: rotateGlobe 50s linear infinite;
                mask-image: radial-gradient(circle, black 45%, transparent 72%);
                opacity: 0.6;
                z-index: 2;
            }
            
            @keyframes rotateGlobe {
                from { background-position: 0 0; }
                to { background-position: -1200px 0; }
            }

            .globe-radar-layer {
                position: absolute;
                inset: 0;
                z-index: 4;
            }
            .radar-path {
                fill: none;
                stroke: rgba(255,255,255,0.2);
                stroke-width: 1.5;
                stroke-linecap: round;
                stroke-dasharray: 5, 20;
                animation: radarFlow 3s linear infinite;
            }
            @keyframes radarFlow {
                from { stroke-dashoffset: 50; }
                to { stroke-dashoffset: 0; }
            }

            .ping {
                position: absolute;
                width: 6px;
                height: 6px;
                background: #fff;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 15px #fff;
                z-index: 6;
            }
            .ping::after {
                content: '';
                position: absolute;
                inset: -10px;
                border: 1px solid #fff;
                border-radius: 50%;
                animation: ping-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            }
            @keyframes ping-pulse {
                0% { transform: scale(1); opacity: 0.8; }
                100% { transform: scale(3); opacity: 0; }
            }

            .halftone-content {
                position: relative;
                z-index: 10;
                padding: 60px;
                width: 100%;
                margin-top: auto;
                background: linear-gradient(to top, #000 0%, transparent 100%);
            }
            .halftone-logo {
                width: 48px; height: 48px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 32px;
            }
            .halftone-title {
                font-family: 'Inria Serif', serif; font-size: 2.75rem; font-weight: 800; font-style: italic; line-height: 1.1; color: #fff; letter-spacing: -1.5px;
            }
            .halftone-subtitle {
                margin-top: 24px; font-size: 0.9375rem; color: #888; max-width: 380px; line-height: 1.6;
            }
            .auth-container {
                max-width: 420px; width: 100%; padding: 40px 0;
            }
            .brand-header {
                display: flex; align-items: center; gap: 12px; margin-bottom: 60px;
            }
            .brand-logo { width: 32px; height: 32px; border-radius: 50%; background: #fff; color: #000 !important; display: flex !important; align-items: center; justify-content: center; font-weight: 800; }
            .brand-name { font-weight: 800; font-size: 1.5rem; letter-spacing: -1px; }
            
            .welcome-title { font-family: 'Inria Serif', serif; font-size: 2.5rem; font-weight: 800; font-style: italic; margin-bottom: 12px; letter-spacing: -1.5px; }
            .welcome-subtitle { color: #888; font-size: 0.9375rem; margin-bottom: 32px; }
            
            .btn-google-premium {
                display: flex !important; align-items: center; justify-content: center; gap: 12px; width: 100%;
                background: #fff !important; color: #000 !important; border-radius: 100px !important; padding: 16px !important; font-weight: 700;
                border: none; margin: 32px 0 16px 0; font-size: 0.9375rem; transition: all 0.2s; cursor: pointer;
            }
            .btn-google-premium:hover { background: #f0f0f0 !important; transform: translateY(-1px); }
            
            .auth-divider { display: flex; align-items: center; gap: 16px; margin: 24px 0; color: #444; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
            .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: #222; }
            
            .input-group-premium { margin-bottom: 20px; }
            .input-group-premium label { display: block; font-size: 0.75rem; font-weight: 700; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
            .input-premium {
                width: 100%; background: #000 !important; border: 1px solid #222 !important; color: #fff !important; border-radius: 12px !important;
                padding: 14px 16px !important; font-size: 0.9375rem; transition: all 0.2s;
            }
            .input-premium:focus { border-color: #444 !important; outline: none; background: #050505 !important; }
            
            .btn-sign-in {
                width: 100%; background: #fff !important; color: #000 !important; border-radius: 12px !important; padding: 16px !important; 
                font-weight: 700 !important; border: none !important; font-size: 1rem !important; cursor: pointer; margin-top: 12px; transition: 0.2s;
            }
            .btn-sign-in:hover { background: #e5e5e5 !important; }
            .btn-sign-in:disabled { opacity: 0.5; cursor: not-allowed; }
            
            .social-proof { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
            .avatar-stack { display: flex; }
            .avatar-placeholder { 
                width: 24px !important; height: 24px !important; border-radius: 50% !important; border: 2px solid #000 !important; 
                margin-left: -8px !important; background: #222; display: flex !important; align-items: center; justify-content: center; 
                font-size: 10px; font-weight: 800; 
            }
            .avatar-placeholder:first-child { margin-left: 0 !important; }
            .social-proof-text { font-size: 0.8125rem; color: #555; font-weight: 500; }
            
            select.input-premium { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; background-size: 16px; }

            @media (max-width: 768px) {
                .auth-image-side { display: none; }
            }
        ` }} />
    );

    if (emailSent) {
        return (
            <>
                {commonStyles}
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
                                    </svg>
                                    <div className="ping" style={{ top: '33%', left: '25%', animationDelay: '0s' }} />
                                    <div className="ping" style={{ top: '42%', left: '75%', animationDelay: '1s' }} />
                                    <div className="ping" style={{ top: '58%', left: '66%', animationDelay: '0.5s' }} />
                                </div>
                            </div>
                            <div className="halftone-content">
                                <div className="halftone-logo">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
                                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                    </svg>
                                </div>
                                <h2 className="halftone-title">Check your email, {formData.name.split(' ')[0]}.</h2>
                                <p className="halftone-subtitle">We've sent a verification link to your inbox. Please click it to activate your premium scheduling workspace.</p>
                            </div>
                        </div>
                    </div>
                    <div className="auth-form-side">
                        <div className="auth-container" style={{ textAlign: 'center' }}>
                            <div className="brand-header" style={{ justifyContent: 'center' }}>
                                <div className="brand-logo">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                    </svg>
                                </div>
                                <div className="brand-name">Scheduler</div>
                            </div>
                            <h1 className="welcome-title" style={{ textAlign: 'center' }}>Verify email</h1>
                            <p className="welcome-subtitle" style={{ textAlign: 'center' }}> We've sent a link to <strong>{formData.email}</strong>. Please check your inbox.</p>
                            
                            <div style={{ padding: '24px', background: '#111', borderRadius: '16px', fontSize: '0.875rem', color: '#888', marginBottom: '32px', textAlign: 'left', border: '1px solid #222' }}>
                                <strong style={{ color: '#fff' }}>Didn't receive it?</strong><br />
                                Check your spam folder or wait a moment. Emails usually arrive within 60 seconds.
                            </div>

                            <Link href="/login" className="btn-sign-in" style={{ textDecoration: 'none', display: 'block', padding: '16px' }}>
                                Back to login
                            </Link>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {commonStyles}
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
                            <h2 className="halftone-title">Elevate your scheduling experience today.</h2>
                            <p className="halftone-subtitle">Join hundreds of professionals who have simplified their workflow with our premium booking engine.</p>
                        </div>
                    </div>
                </div>

                <div className="auth-form-side">
                    <div className="auth-container">
                        <div className="brand-header">
                            <div className="brand-name">Scheduler</div>
                        </div>

                        <h1 className="welcome-title">Join us</h1>
                        <p className="welcome-subtitle">Create your premium account and start scaling your bookings in minutes.</p>

                        <button className="btn-google-premium" type="button" onClick={() => signIn('google', { callbackUrl: inviteToken ? `/scheduling?invite=${inviteToken}` : '/scheduling' })}>
                            <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '4px' }}>
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>

                        <div className="social-proof">
                            <div className="avatar-stack">
                                {['H', 'S', 'A'].map((initial, i) => (
                                    <div key={i} className="avatar-placeholder" style={{ backgroundColor: i === 0 ? '#ff4d4d' : i === 1 ? '#4dff4d' : '#4d4dff', color: '#fff' }}>
                                        {initial}
                                    </div>
                                ))}
                            </div>
                            <div className="social-proof-text">382 people already here — join them.</div>
                        </div>

                        <div className="auth-divider">
                            <span>registration details</span>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div style={{ padding: '12px 14px', background: 'rgba(225, 29, 72, 0.1)', borderRadius: '8px', color: '#fb7185', fontSize: '0.8125rem', marginBottom: '16px', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
                                    {error}
                                </div>
                            )}

                            <div className="input-group-premium">
                                <label htmlFor="name">Full Name</label>
                                <input id="name" name="name" type="text" className="input-premium" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
                            </div>

                            <div className="input-group-premium">
                                <label htmlFor="email">Email</label>
                                <input id="email" name="email" type="email" className="input-premium" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
                            </div>

                            <div className="input-group-premium">
                                <label htmlFor="password">Password</label>
                                <input id="password" name="password" type="password" className="input-premium" placeholder="min 6 chars" value={formData.password} onChange={handleChange} required minLength={6} />
                            </div>

                            <div className="input-group-premium">
                                <label htmlFor="timezone">Time Zone</label>
                                <select id="timezone" name="timezone" className="input-premium" value={formData.timezone} onChange={handleChange}>
                                    <option value="America/New_York">Eastern Time (US)</option>
                                    <option value="America/Chicago">Central Time (US)</option>
                                    <option value="America/Denver">Mountain Time (US)</option>
                                    <option value="America/Los_Angeles">Pacific Time (US)</option>
                                    <option value="Europe/London">London (GMT)</option>
                                    <option value="Asia/Kolkata">India (IST)</option>
                                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                                    <option value="UTC">UTC</option>
                                </select>
                            </div>

                            <button type="submit" className="btn-sign-in" disabled={loading}>
                                {loading ? 'Creating account...' : 'Create account'}
                            </button>
                        </form>

                        <div style={{ marginTop: '32px', textAlign: 'center', color: '#555', fontSize: '0.875rem' }}>
                            Already have an account?{' '}
                            <Link href="/login" style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="auth-monochrome"></div>}>
            <SignupForm />
        </Suspense>
    );
}
