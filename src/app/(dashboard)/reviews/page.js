'use client';
import { useState, useEffect } from 'react';
import { Star, MessageSquare, TrendingUp, Shield, Eye, EyeOff, User, MoreHorizontal, CheckCircle } from 'lucide-react';

export default function ReviewsDashboard() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/user/reviews')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setReviews(data);
                setLoading(false);
            });
    }, []);

    const togglePublic = async (id, currentStatus) => {
        // Optimistic UI update
        setReviews(reviews.map(r => r.id === id ? { ...r, isPublic: !currentStatus } : r));
        
        try {
            await fetch(`/api/user/reviews`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isPublic: !currentStatus })
            });
        } catch(e) {
            // Revert on fail
            setReviews(reviews.map(r => r.id === id ? { ...r, isPublic: currentStatus } : r));
        }
    };

    const avgRating = reviews.length > 0 
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : 0;
    
    const publicCount = reviews.filter(r => r.isPublic).length;

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const formatDateShort = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div>
            {/* Native Page Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <MessageSquare size={20} strokeWidth={2.5} style={{ color: 'var(--primary)' }} />
                    Testimonials & Reviews
                </h1>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9375rem' }}>
                Manage social proof to build trust with your invitees on your public start page.
            </p>

            {/* Native Stat Cards System */}
            <div className="stat-cards" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-label">Total Reviews</div>
                    <div className="stat-value">{reviews.length}</div>
                    <div className="stat-trend" style={{ color: 'var(--text-tertiary)' }}>Feedback received</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Average Rating</div>
                    <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {avgRating}
                        <Star size={18} fill="var(--warning)" stroke="var(--warning)" />
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Featured Reviews</div>
                    <div className="stat-value" style={{ color: 'var(--success)' }}>{publicCount}</div>
                    <div className="stat-trend up">Visible on your page</div>
                </div>
            </div>
            
            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '16px', color: 'var(--text-tertiary)' }}>Fetching testimonials...</p>
                </div>
            ) : reviews.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon" style={{ fontSize: '40px' }}>⭐</div>
                    <h3>No reviews yet</h3>
                    <p>Collect feedback by adding a "Review Request" to your workflows.</p>
                    <div style={{ marginTop: '20px' }}>
                        <a href="/workflows/create" className="btn btn-primary btn-sm">Create Workflow</a>
                    </div>
                </div>
            ) : (
                <div className="reviews-section">
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
                        Recent Feedback
                    </h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {reviews.map(review => (
                            <div 
                                key={review.id} 
                                className="meeting-card" 
                                style={{ 
                                    borderLeft: `4px solid ${review.isPublic ? 'var(--success)' : 'var(--border-color)'}`,
                                    alignItems: 'center',
                                    padding: '24px'
                                }}
                            >
                                {/* Reviewer Avatar Block */}
                                <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                                    <div className="avatar avatar-lg" style={{ background: review.isPublic ? 'var(--primary)' : 'var(--text-tertiary)' }}>
                                        {getInitials(review.booking?.inviteeName)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                                {review.booking?.inviteeName}
                                            </span>
                                            <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '1px 8px' }}>
                                                {review.booking?.eventType?.title || 'Meeting'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                                            Reviewed on {formatDateShort(review.createdAt)}
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star key={star} size={16} fill={review.rating >= star ? 'var(--warning)' : 'var(--border-light)'} stroke={review.rating >= star ? 'var(--warning)' : 'var(--border-color)'} />
                                            ))}
                                        </div>

                                        {review.comment ? (
                                            <div style={{ 
                                                fontSize: '0.9375rem', 
                                                color: 'var(--text-primary)', 
                                                lineHeight: 1.6,
                                                fontStyle: 'italic',
                                                background: 'var(--bg-page)',
                                                padding: '12px 16px',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-light)'
                                            }}>
                                                "{review.comment}"
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                                No comment provided.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Area */}
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    gap: '12px',
                                    paddingLeft: '24px',
                                    borderLeft: '1px solid var(--border-light)',
                                    minWidth: '160px'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ 
                                            fontSize: '0.75rem', 
                                            fontWeight: 700, 
                                            color: review.isPublic ? 'var(--success)' : 'var(--text-tertiary)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            marginBottom: '8px'
                                        }}>
                                            {review.isPublic ? 'Publicly Featured' : 'Hidden from View'}
                                        </div>
                                        {/* Native Project Toggle Switch */}
                                        <button 
                                            className={`availability-toggle ${review.isPublic ? 'active' : ''}`}
                                            onClick={() => togglePublic(review.id, review.isPublic)}
                                            style={{ margin: '0 auto', display: 'block' }}
                                        />
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                        Toggle Visibility
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
