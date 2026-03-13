'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PublicRouterPage({ params }) {
    const { slug } = params;
    const [form, setForm] = useState(null);
    const [answers, setAnswers] = useState({});
    const [status, setStatus] = useState('loading'); // 'loading', 'ready', 'submitting', 'error'
    const [invitee, setInvitee] = useState({ name: '', email: '' });

    useEffect(() => {
        fetchForm();
    }, [slug]);

    const fetchForm = async () => {
        try {
            const res = await fetch(`/api/router/${slug}/submit`, { cache: 'no-store' });
            const data = await res.json();
            if (data.form) {
                const processedQuestions = data.form.questions.map(q => ({
                    ...q,
                    options: q.options ? JSON.parse(q.options) : []
                }));
                setForm({ ...data.form, questions: processedQuestions });
                setStatus('ready');
            } else {
                setStatus('error');
            }
        } catch (error) {
            setStatus('error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('submitting');
        try {
            const res = await fetch(`/api/router/${slug}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inviteeName: invitee.name,
                    inviteeEmail: invitee.email,
                    answers,
                    source: 'routing-form'
                }),
            });
            const data = await res.json();
            if (data.destination) {
                window.location.href = data.destination;
            } else {
                alert('Connection error. Please try again.');
                setStatus('ready');
            }
        } catch (error) {
            console.error('Submission error:', error);
            setStatus('ready');
        }
    };

    if (status === 'loading') {
        return (
            <div className="public-layout">
                <div className="focused-card loading-card">
                    <div className="pulsing-circle"></div>
                    <p>Securing your spot...</p>
                </div>
                <style jsx>{`
                    .public-layout { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fafafa; }
                    .loading-card { text-align: center; }
                    .pulsing-circle { width: 40px; height: 40px; background: #0069ff; border-radius: 50%; margin: 0 auto 20px; animation: pulse 1.5s infinite ease-in-out; }
                    @keyframes pulse { 0% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.4; transform: scale(0.8); } }
                `}</style>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="public-layout">
                <div className="focused-card error-card">
                    <span className="error-icon">⚠️</span>
                    <h2>Form unavailable</h2>
                    <p>This scheduling link is either expired or invalid.</p>
                </div>
                <style jsx>{`
                    .public-layout { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fff; }
                    .focused-card { text-align: center; padding: 40px; }
                    .error-icon { font-size: 40px; display: block; margin-bottom: 20px; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="public-page-wrapper">
            <main className="form-canvas">
                <div className="form-card">
                    <header className="form-header">
                        <div className="brand-dot"></div>
                        <h1 className="form-title">{form.name}</h1>
                        <p className="form-subtitle">{form.description || 'Welcome. Please fill out the details below to find the best time for our meeting.'}</p>
                    </header>

                    <form onSubmit={handleSubmit} className="actual-form">
                        <div className="form-section">
                            <h3 className="section-label">Your Details</h3>
                            <div className="input-grid">
                                <div className="field-block">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="premium-input"
                                        value={invitee.name}
                                        onChange={(e) => setInvitee({ ...invitee, name: e.target.value })}
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div className="field-block">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="premium-input"
                                        value={invitee.email}
                                        onChange={(e) => setInvitee({ ...invitee, email: e.target.value })}
                                        placeholder="name@company.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-section divider-top">
                            <h3 className="section-label">Tell us more</h3>
                            <div className="input-stack">
                                {form.questions.map((q) => (
                                    <div key={q.id} className="field-block">
                                        <label>{q.label} {q.required && <span className="req">*</span>}</label>

                                        {q.type === 'text' && (
                                            <input
                                                type="text"
                                                required={q.required}
                                                className="premium-input"
                                                placeholder={q.placeholder || 'Type your answer...'}
                                                value={answers[q.id] || ''}
                                                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                            />
                                        )}

                                        {q.type === 'dropdown' && (
                                            <div className="select-wrapper">
                                                <select
                                                    required={q.required}
                                                    className="premium-select"
                                                    value={answers[q.id] || ''}
                                                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                                >
                                                    <option value="" disabled>Choose an option</option>
                                                    {q.options.map((opt, i) => (
                                                        <option key={i} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                                <span className="select-icon">▼</span>
                                            </div>
                                        )}

                                        {q.type === 'radio' && (
                                            <div className="radio-list">
                                                {q.options.map((opt, i) => (
                                                    <label key={i} className={`radio-pill ${answers[q.id] === opt ? 'selected' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            name={q.id}
                                                            required={q.required}
                                                            value={opt}
                                                            checked={answers[q.id] === opt}
                                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                                        />
                                                        {opt}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`submit-action-btn ${status === 'submitting' ? 'spinning' : ''}`}
                            disabled={status === 'submitting'}
                        >
                            {status === 'submitting' ? 'Finding available times...' : 'Next'}
                            <span className="arrow">→</span>
                        </button>
                    </form>
                </div>
                
                <footer className="public-form-footer">
                    <p>Powered by <strong>Automate Bookings</strong></p>
                </footer>
            </main>

            <style jsx>{`
                .public-page-wrapper {
                    min-height: 100vh;
                    background: #fff;
                    background-image: radial-gradient(#e5e7eb 1px, transparent 0);
                    background-size: 40px 40px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 60px 20px;
                    font-family: 'Inter', system-ui, sans-serif;
                }
                .form-canvas {
                    width: 100%;
                    max-width: 600px;
                }
                .form-card {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
                    padding: 48px;
                    margin-bottom: 24px;
                }
                .brand-dot {
                    width: 12px;
                    height: 12px;
                    background: #0069ff;
                    border-radius: 50%;
                    margin-bottom: 24px;
                }
                .form-title {
                    font-size: 28px;
                    font-weight: 800;
                    color: #111827;
                    letter-spacing: -0.025em;
                    margin-bottom: 12px;
                }
                .form-subtitle {
                    font-size: 15px;
                    line-height: 1.6;
                    color: #6b7280;
                    margin-bottom: 40px;
                }
                .section-label {
                    font-size: 13px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #9ca3af;
                    margin-bottom: 24px;
                }
                .field-block {
                    margin-bottom: 24px;
                }
                .field-block label {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                }
                .req { color: #ef4444; margin-left: 2px; }
                .premium-input, .premium-select {
                    width: 100%;
                    padding: 14px 16px;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 12px;
                    font-size: 16px;
                    color: #111827;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    appearance: none;
                    background: #fff;
                }
                .premium-input:focus, .premium-select:focus {
                    outline: none;
                    border-color: #0069ff;
                    box-shadow: 0 0 0 4px rgba(0, 105, 255, 0.1);
                }
                .input-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                .divider-top {
                    margin-top: 40px;
                    padding-top: 40px;
                    border-top: 1px solid #f3f4f6;
                }
                .select-wrapper {
                    position: relative;
                }
                .select-icon {
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    pointer-events: none;
                    font-size: 12px;
                    color: #9ca3af;
                }
                .radio-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .radio-pill {
                    padding: 14px 18px;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.2s;
                    font-size: 15px;
                    font-weight: 500;
                    color: #4b5563;
                }
                .radio-pill:hover { background: #f9fafb; border-color: #d1d5db; }
                .radio-pill.selected {
                    background: #f0f6ff;
                    border-color: #0069ff;
                    color: #0069ff;
                    box-shadow: 0 2px 4px rgba(0, 105, 255, 0.05);
                }
                .radio-pill input { display: none; }
                .submit-action-btn {
                    width: 100%;
                    background: #111827;
                    color: #fff;
                    padding: 18px;
                    border: none;
                    border-radius: 14px;
                    font-size: 16px;
                    font-weight: 700;
                    margin-top: 40px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    transition: all 0.2s;
                }
                .submit-action-btn:hover { background: #000; transform: translateY(-1px); }
                .submit-action-btn .arrow { font-size: 20px; transition: transform 0.2s; }
                .submit-action-btn:hover .arrow { transform: translateX(4px); }
                .public-form-footer {
                    text-align: center;
                    font-size: 13px;
                    color: #9ca3af;
                }
                @media (max-width: 640px) {
                    .input-grid { grid-template-columns: 1fr; }
                    .form-card { padding: 32px 24px; }
                }
            `}</style>
        </div>
    );
}
