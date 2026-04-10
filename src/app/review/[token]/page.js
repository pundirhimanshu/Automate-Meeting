'use client';

import { useState, useEffect } from 'react';
import { Star, CheckCircle, MessageSquare, User, Calendar, Clock, Shield } from 'lucide-react';
import Image from 'next/image';

export default function ReviewPage({ params }) {
    const { token } = params;
    const [booking, setBooking] = useState(null);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/reviews/${token}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) setError(data.error);
                else {
                    setBooking(data);
                    if (data.review) setSuccess(true); // Already submitted
                }
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load. Link may be invalid.');
                setLoading(false);
            });
    }, [token]);

    const handleSubmit = async () => {
        if (rating === 0) return setError('Please select a rating');
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/reviews/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating, comment })
            });

            const data = await res.json();
            if (data.error) setError(data.error);
            else setSuccess(true);
        } catch (err) {
            setError('Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
            <div className="spinner"></div>
        </div>
    );

    if (error && !booking) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '24px' }}>
            <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '40px', marginBottom: '20px' }}>⚠️</div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Link Error</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{error}</p>
                <a href="/" className="btn btn-secondary btn-sm" style={{ marginTop: '24px' }}>Back to home</a>
            </div>
        </div>
    );

    if (success) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '24px' }}>
                <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '48px', boxShadow: 'var(--shadow-xl)' }}>
                    <div style={{ width: '64px', height: '64px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <CheckCircle size={32} color="var(--primary)" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>Thank you!</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9375rem' }}>
                        Your feedback has been submitted. It helps {booking?.host?.name || 'the host'} improve their sessions and helps others book with confidence.
                    </p>
                    <div style={{ marginTop: '32px', padding: '16px', borderTop: '1px border-light' }}>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>You can now close this tab.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '40px 24px' }}>
            <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '0', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
                {/* Card Header Branding */}
                <div style={{ background: 'var(--primary)', height: '120px', position: 'relative' }}>
                    <div className="avatar-xl shadow-lg" style={{ 
                        position: 'absolute', 
                        bottom: '-40px', 
                        left: '50%', 
                        transform: 'translateX(-50%)',
                        border: '4px solid white',
                        background: 'var(--bg-white)',
                        color: 'var(--primary)',
                        fontSize: '32px'
                    }}>
                        {booking.host?.avatar ? (
                            <img src={booking.host.avatar} alt="host" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                            booking.host?.name?.charAt(0)
                        )}
                    </div>
                </div>

                <div style={{ padding: '64px 40px 48px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>How was your session?</h2>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            <Calendar size={14} />
                            <span>{booking.eventType?.title || 'Meeting'} with {booking.host?.name}</span>
                        </div>
                    </div>

                    {error && (
                        <div style={{ background: '#fce4ec', padding: '12px 16px', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '24px', textAlign: 'center', fontWeight: 500 }}>
                            {error}
                        </div>
                    )}

                    {/* Star Rating Section */}
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                            Select your rating
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    style={{ 
                                        background: 'transparent', 
                                        border: 'none', 
                                        cursor: 'pointer',
                                        transition: 'transform 0.15s'
                                    }}
                                    className="hover-scale"
                                >
                                    <Star
                                        size={44}
                                        fill={(hoverRating || rating) >= star ? 'var(--warning)' : 'var(--bg-page)'}
                                        stroke={(hoverRating || rating) >= star ? 'var(--warning)' : 'var(--border-color)'}
                                        strokeWidth={(hoverRating || rating) >= star ? 0 : 1.5}
                                        style={{ transition: 'all 0.2s' }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comment Form */}
                    <div className="input-group" style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Public testimonial (Optional)</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.6 }}>Tell others what you liked!</span>
                        </label>
                        <textarea
                            className="input"
                            style={{ minHeight: '120px', resize: 'none', padding: '16px', lineHeight: 1.6 }}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your experience..."
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', height: '56px', fontSize: '1rem', boxShadow: '0 4px 12px rgba(0, 105, 255, 0.2)' }}
                        onClick={handleSubmit}
                        disabled={submitting || rating === 0}
                    >
                        {submitting ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }}></div>
                                Submitting...
                            </div>
                        ) : (
                            'Submit Review'
                        )}
                    </button>
                    
                    <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        <Shield size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Your review will be shared with {booking.host?.name.split(' ')[0]}.
                    </p>
                </div>
            </div>

            <style jsx>{`
                .hover-scale:hover {
                    transform: scale(1.15);
                }
                .hover-scale:active {
                    transform: scale(0.95);
                }
            `}</style>
        </div>
    );
}
