'use client';

import { useState, useEffect } from 'react';

export default function MeetingsPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [cancelModal, setCancelModal] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [search, setSearch] = useState('');
    const [eventTypeFilter, setEventTypeFilter] = useState('');
    const [eventTypes, setEventTypes] = useState([]);
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Detail drawer
    const [selectedBooking, setSelectedBooking] = useState(null);

    useEffect(() => {
        fetchEventTypes();
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [activeTab, eventTypeFilter]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchBookings();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchEventTypes = async () => {
        try {
            const res = await fetch('/api/event-types');
            if (res.ok) {
                const data = await res.json();
                setEventTypes(data.eventTypes || []);
            }
        } catch (e) { }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ status: activeTab });
            if (search) params.set('search', search);
            if (eventTypeFilter) params.set('eventTypeId', eventTypeFilter);
            const res = await fetch(`/api/bookings?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setBookings(data.bookings || []);
            }
        } catch (e) { } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelModal) return;
        try {
            await fetch(`/api/bookings/${cancelModal}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel', cancelReason }),
            });
            fetchBookings();
            if (selectedBooking?.id === cancelModal) setSelectedBooking(null);
        } catch (e) { }
        setCancelModal(null);
        setCancelReason('');
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return {
            month: d.toLocaleDateString('en', { month: 'short' }).toUpperCase(),
            day: d.getDate(),
            weekday: d.toLocaleDateString('en', { weekday: 'long' }),
            full: d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        };
    };

    const formatTime = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        const fmt = (d) => d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${fmt(s)} - ${fmt(e)}`;
    };

    const statusBadge = (status) => {
        const map = {
            confirmed: { cls: 'badge-primary', label: 'Confirmed' },
            pending: { cls: 'badge-warning', label: 'Pending' },
            cancelled: { cls: 'badge-danger', label: 'Cancelled' },
            completed: { cls: 'badge-success', label: 'Completed' },
        };
        const s = map[status] || { cls: 'badge-primary', label: status };
        return <span className={`badge ${s.cls}`}>{s.label}</span>;
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Meetings</h1>
            </div>

            <div className="tabs" style={{ marginBottom: '16px' }}>
                {['upcoming', 'past', 'cancelled'].map((tab) => (
                    <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Search & Filter Bar */}
            <div className="filter-bar" style={{ marginBottom: '16px' }}>
                <div className="search-input" style={{ flex: 1, maxWidth: '280px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input type="text" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                <div className="dropdown" style={{ position: 'relative' }}>
                    <button className={`filter-btn ${eventTypeFilter ? 'active' : ''}`} onClick={() => setShowFilterMenu(!showFilterMenu)} style={eventTypeFilter ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--primary-light)' } : {}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                        {eventTypeFilter ? eventTypes.find(e => e.id === eventTypeFilter)?.title || 'Filtered' : 'Event type'}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                    {showFilterMenu && (
                        <div className="dropdown-menu" style={{ minWidth: '220px' }}>
                            <button className={`dropdown-item ${!eventTypeFilter ? 'active' : ''}`} onClick={() => { setEventTypeFilter(''); setShowFilterMenu(false); }} style={!eventTypeFilter ? { background: 'var(--primary-light)', color: 'var(--primary)' } : {}}>
                                All event types
                            </button>
                            <div className="dropdown-divider" />
                            {eventTypes.map(et => (
                                <button key={et.id} className={`dropdown-item ${eventTypeFilter === et.id ? 'active' : ''}`} onClick={() => { setEventTypeFilter(et.id); setShowFilterMenu(false); }}
                                    style={eventTypeFilter === et.id ? { background: 'var(--primary-light)', color: 'var(--primary)' } : {}}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: et.color || '#ff9500', display: 'inline-block', marginRight: '8px', flexShrink: 0 }} />
                                    {et.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {(search || eventTypeFilter) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setEventTypeFilter(''); }} style={{ gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        Clear filters
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                </div>
            ) : bookings.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3>No {activeTab} meetings</h3>
                    <p>{activeTab === 'upcoming' ? 'You have no upcoming meetings scheduled.' : `No ${activeTab} meetings to show.`}</p>
                </div>
            ) : (
                <div>
                    {bookings.map((b) => {
                        const { month, day } = formatDate(b.startTime);
                        return (
                            <div
                                key={b.id}
                                className="meeting-card clickable"
                                onClick={() => setSelectedBooking(b)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="meeting-time-block">
                                    <span className="meeting-date">{month}</span>
                                    <span className="meeting-day">{day}</span>
                                </div>
                                <div className="meeting-info">
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="color-dot" style={{ background: b.eventType?.color || '#ff9500' }}></span>
                                        {b.eventType?.title || 'Meeting'}
                                    </h3>
                                    <div className="invitee">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                        </svg>
                                        {b.inviteeName} ({b.inviteeEmail})
                                    </div>
                                    <div className="time-range">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        {formatTime(b.startTime, b.endTime)}
                                        <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)' }}>({b.timezone})</span>
                                    </div>
                                    {b.notes && (
                                        <div style={{ marginTop: '6px', fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                            &ldquo;{b.notes}&rdquo;
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                    {b.status === 'confirmed' && activeTab === 'upcoming' && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => setCancelModal(b.id)}>Cancel</button>
                                    )}
                                    {b.status === 'cancelled' && <span className="badge badge-danger">Cancelled</span>}
                                    {b.status === 'completed' && <span className="badge badge-success">Completed</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== MEETING DETAIL DRAWER ===== */}
            {selectedBooking && (
                <>
                    <div className="drawer-overlay" onClick={() => setSelectedBooking(null)} />
                    <div className="drawer">
                        <div className="drawer-header">
                            <h2>Meeting Details</h2>
                            <button className="drawer-close" onClick={() => setSelectedBooking(null)}>✕</button>
                        </div>
                        <div className="drawer-body">
                            {/* Event Title & Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ width: '10px', height: '40px', borderRadius: '4px', background: selectedBooking.eventType?.color || '#ff9500', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '4px' }}>{selectedBooking.eventType?.title || 'Meeting'}</h3>
                                    {statusBadge(selectedBooking.status)}
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div className="drawer-section">
                                <div className="drawer-section-title">Schedule</div>
                                <div className="drawer-detail-row">
                                    <div className="detail-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                                    </div>
                                    <div>
                                        <div className="detail-value">{formatDate(selectedBooking.startTime).full}</div>
                                    </div>
                                </div>
                                <div className="drawer-detail-row">
                                    <div className="detail-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    </div>
                                    <div>
                                        <div className="detail-value">{formatTime(selectedBooking.startTime, selectedBooking.endTime)}</div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>{selectedBooking.eventType?.duration || 30} minutes</div>
                                    </div>
                                </div>
                                <div className="drawer-detail-row">
                                    <div className="detail-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                                    </div>
                                    <div className="detail-value">{selectedBooking.timezone}</div>
                                </div>
                            </div>

                            {/* Invitee Info */}
                            <div className="drawer-section">
                                <div className="drawer-section-title">Invitee</div>
                                <div className="drawer-detail-row">
                                    <div className="detail-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    </div>
                                    <div className="detail-value">{selectedBooking.inviteeName}</div>
                                </div>
                                <div className="drawer-detail-row">
                                    <div className="detail-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                    </div>
                                    <div className="detail-value" style={{ color: 'var(--primary)' }}>{selectedBooking.inviteeEmail}</div>
                                </div>
                            </div>

                            {/* Meeting Type */}
                            <div className="drawer-section">
                                <div className="drawer-section-title">Meeting Type</div>
                                <div className="drawer-detail-row">
                                    <div className="detail-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                                    </div>
                                    <div className="detail-value">{selectedBooking.eventType?.type === 'one-on-one' ? 'One-on-One' : selectedBooking.eventType?.type || '—'}</div>
                                </div>
                                {selectedBooking.location && (
                                    <div className="drawer-detail-row">
                                        <div className="detail-icon">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                        </div>
                                        <div className="detail-value">{selectedBooking.location}</div>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {selectedBooking.notes && (
                                <div className="drawer-section">
                                    <div className="drawer-section-title">Notes from Invitee</div>
                                    <div style={{ padding: '12px 16px', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                                        &ldquo;{selectedBooking.notes}&rdquo;
                                    </div>
                                </div>
                            )}

                            {/* Cancel Reason */}
                            {selectedBooking.cancelReason && (
                                <div className="drawer-section">
                                    <div className="drawer-section-title">Cancellation Reason</div>
                                    <div style={{ padding: '12px 16px', background: '#fce4ec', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--danger)', lineHeight: 1.6 }}>
                                        {selectedBooking.cancelReason}
                                    </div>
                                </div>
                            )}

                            {/* Created At */}
                            <div className="drawer-section">
                                <div className="drawer-section-title">Booked On</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                                    {new Date(selectedBooking.createdAt).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer Actions */}
                        {selectedBooking.status === 'confirmed' && (
                            <div className="drawer-footer">
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        setCancelModal(selectedBooking.id);
                                    }}
                                >
                                    Cancel Meeting
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Cancel Modal */}
            {cancelModal && (
                <div className="modal-overlay" onClick={() => setCancelModal(null)} style={{ zIndex: 300 }}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Cancel Meeting</h2>
                            <button className="btn-icon btn-ghost" onClick={() => setCancelModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                Are you sure you want to cancel this meeting? The invitee will be notified.
                            </p>
                            <div className="input-group">
                                <label>Reason for cancellation (optional)</label>
                                <textarea className="input" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} placeholder="Let the invitee know why..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setCancelModal(null)}>Keep Meeting</button>
                            <button className="btn btn-danger" onClick={handleCancel}>Cancel Meeting</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
