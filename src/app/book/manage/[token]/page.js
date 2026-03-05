'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';

export default function ManageBookingPage() {
    const params = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Cancel state
    const [showCancel, setShowCancel] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    // Reschedule state
    const [showReschedule, setShowReschedule] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState(null);
    const [rescheduleTime, setRescheduleTime] = useState(null);
    const [rescheduleMonth, setRescheduleMonth] = useState(new Date());
    const [rescheduling, setRescheduling] = useState(false);

    // Result state
    const [actionDone, setActionDone] = useState(null); // 'cancelled' | 'rescheduled'
    const [actionError, setActionError] = useState('');

    const inviteeTimezone = useMemo(() => {
        try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
    }, []);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/public/manage/${params.token}`);
            if (res.ok) {
                setData(await res.json());
            } else {
                const err = await res.json();
                setError(err.error || 'Booking not found.');
            }
        } catch (e) { setError('Failed to load booking.'); }
        finally { setLoading(false); }
    };

    // Calendar helpers
    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDay = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const isDateAvailable = (date) => {
        if (!data) return false;
        const now = new Date(); now.setHours(0, 0, 0, 0);
        if (date < now) return false;
        const dateStr = date.toISOString().split('T')[0];
        const override = data.dateOverrides?.find(d => new Date(d.date).toISOString().split('T')[0] === dateStr);
        if (override?.isBlocked) return false;
        return data.availability?.some(a => a.dayOfWeek === date.getDay());
    };

    const getTimeSlots = (date) => {
        if (!data || !date) return [];
        const dayAvails = data.availability?.filter(a => a.dayOfWeek === date.getDay()) || [];
        const duration = data.eventType.duration || 30;
        const bufferBefore = data.eventType.bufferTimeBefore || 0;
        const bufferAfter = data.eventType.bufferTimeAfter || 0;
        const slots = [];
        dayAvails.forEach(avail => {
            const [sH, sM] = avail.startTime.split(':').map(Number);
            const [eH, eM] = avail.endTime.split(':').map(Number);
            for (let m = sH * 60 + sM; m + duration <= eH * 60 + eM; m += 30) {
                const start = new Date(date); start.setHours(Math.floor(m / 60), m % 60, 0, 0);
                const end = new Date(start); end.setMinutes(end.getMinutes() + duration);
                if (start.getTime() < Date.now() + (data.eventType.minNotice || 0) * 60000) continue;
                const bufStart = new Date(start); bufStart.setMinutes(bufStart.getMinutes() - bufferBefore);
                const bufEnd = new Date(end); bufEnd.setMinutes(bufEnd.getMinutes() + bufferAfter);
                const hasConflict = data.existingBookings?.some(b => {
                    const bS = new Date(b.startTime), bE = new Date(b.endTime);
                    return bufStart < bE && bufEnd > bS;
                });
                if (!hasConflict) {
                    slots.push({ start, end, label: start.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true }) });
                }
            }
        });
        return slots;
    };

    const handleCancel = async () => {
        setCancelling(true); setActionError('');
        try {
            const res = await fetch(`/api/public/manage/${params.token}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel', cancelReason }),
            });
            if (res.ok) { setActionDone('cancelled'); }
            else { const e = await res.json(); setActionError(e.error || 'Failed to cancel.'); }
        } catch { setActionError('Something went wrong.'); }
        finally { setCancelling(false); }
    };

    const handleReschedule = async () => {
        if (!rescheduleTime) return;
        setRescheduling(true); setActionError('');
        try {
            const res = await fetch(`/api/public/manage/${params.token}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reschedule', startTime: rescheduleTime.start.toISOString(), endTime: rescheduleTime.end.toISOString() }),
            });
            if (res.ok) { setActionDone('rescheduled'); }
            else { const e = await res.json(); setActionError(e.error || 'Failed to reschedule.'); }
        } catch { setActionError('Something went wrong.'); }
        finally { setRescheduling(false); }
    };

    const fmtDate = (d) => new Date(d).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const fmtTime = (d) => new Date(d).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (loading) return <div className="booking-page"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }}></div></div>;

    if (error) return (
        <div className="booking-page">
            <div className="confirmation-card">
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
                <h2>Booking Not Found</h2>
                <p style={{ color: 'var(--text-tertiary)', marginTop: '8px' }}>{error}</p>
            </div>
        </div>
    );

    if (!data) return null;

    const { booking, eventType, host } = data;
    const brandColor = host.brandColor || '#0069ff';
    const isCancelled = booking.status === 'cancelled';
    const isRescheduled = booking.status === 'rescheduled';
    const canManage = booking.status === 'confirmed' || booking.status === 'rescheduled';

    // Success screens
    if (actionDone === 'cancelled') return (
        <div className="booking-page">
            <div className="confirmation-card" style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fce4ec', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.5rem' }}>✕</div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '8px' }}>Meeting Cancelled</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Your meeting with <strong>{host.name}</strong> has been cancelled. A confirmation email has been sent to both parties.</p>
                <div style={{ padding: '12px 16px', background: 'var(--bg-page)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <div><strong>{eventType.title}</strong></div>
                    <div style={{ textDecoration: 'line-through', opacity: 0.6, marginTop: '4px' }}>{fmtDate(booking.startTime)} at {fmtTime(booking.startTime)}</div>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '20px' }}>Powered by <strong style={{ color: brandColor }}>Scheduler</strong></div>
            </div>
        </div>
    );

    if (actionDone === 'rescheduled') return (
        <div className="booking-page">
            <div className="confirmation-card" style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.5rem' }}>✓</div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '8px' }}>Meeting Rescheduled!</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Your meeting with <strong>{host.name}</strong> has been rescheduled. Confirmation emails have been sent.</p>
                <div style={{ padding: '12px 16px', background: 'var(--bg-page)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <div><strong>{eventType.title}</strong></div>
                    <div style={{ marginTop: '4px' }}>{rescheduleDate?.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {rescheduleTime?.label}</div>
                    <div style={{ marginTop: '4px', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{eventType.duration} min • {inviteeTimezone}</div>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '20px' }}>Powered by <strong style={{ color: brandColor }}>Scheduler</strong></div>
            </div>
        </div>
    );

    const daysInMonth = getDaysInMonth(rescheduleMonth);
    const firstDay = getFirstDay(rescheduleMonth);
    const timeSlots = rescheduleDate ? getTimeSlots(rescheduleDate) : [];

    return (
        <div className="booking-page">
            <div style={{ maxWidth: '520px', width: '100%', margin: '0 auto', padding: '20px' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    {host.logo && <img src={host.logo} alt="" style={{ width: 48, height: 48, borderRadius: '8px', objectFit: 'contain', margin: '0 auto 8px' }} />}
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Manage Your Booking</h1>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>with {host.name}</p>
                </div>

                {/* Booking Details Card */}
                <div style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color, #e1e4e8)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ width: '10px', height: '40px', borderRadius: '4px', background: eventType.color || brandColor }} />
                        <div>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{eventType.title}</h2>
                            <span style={{ fontSize: '0.8125rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, background: isCancelled ? '#fce4ec' : '#e6f4ea', color: isCancelled ? '#d73a49' : '#28a745' }}>
                                {isCancelled ? 'Cancelled' : isRescheduled ? 'Rescheduled' : 'Confirmed'}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9375rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                            <span>{fmtDate(booking.startTime)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            <span>{fmtTime(booking.startTime)} - {fmtTime(booking.endTime)} ({eventType.duration} min)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                            <span>{booking.timezone}</span>
                        </div>
                        {booking.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                <span>{booking.location}</span>
                            </div>
                        )}
                    </div>
                    {isRescheduled && booking.rescheduledFromStart && (
                        <div style={{ marginTop: '12px', padding: '10px 12px', background: '#e0f2fe', borderRadius: '6px', fontSize: '0.8125rem', color: brandColor }}>
                            <strong>Rescheduled from:</strong> <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{fmtDate(booking.rescheduledFromStart)} at {fmtTime(booking.rescheduledFromStart)}</span>
                        </div>
                    )}
                </div>

                {/* Action Buttons — only if booking is active */}
                {canManage && !showCancel && !showReschedule && (
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <button onClick={() => setShowReschedule(true)} style={{ flex: 1, padding: '12px', border: `1.5px solid ${brandColor}`, borderRadius: '8px', background: brandColor, color: '#fff', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                            Reschedule
                        </button>
                        <button onClick={() => setShowCancel(true)} style={{ flex: 1, padding: '12px', border: '1.5px solid #d73a49', borderRadius: '8px', background: '#fff', color: '#d73a49', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer' }}>
                            Cancel Meeting
                        </button>
                    </div>
                )}

                {isCancelled && (
                    <div style={{ padding: '12px 16px', background: '#fce4ec', borderRadius: '8px', fontSize: '0.875rem', color: '#d73a49', textAlign: 'center', marginBottom: '16px' }}>
                        This meeting has been cancelled.{booking.cancelReason && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>Reason: {booking.cancelReason}</div>}
                    </div>
                )}

                {/* Cancel Flow */}
                {showCancel && (
                    <div style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color, #e1e4e8)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: '#d73a49' }}>Cancel This Meeting?</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Both you and {host.name} will receive a cancellation email.</p>
                        {actionError && <div style={{ padding: '8px 12px', background: '#fce4ec', borderRadius: '6px', color: '#d73a49', fontSize: '0.8125rem', marginBottom: '12px' }}>{actionError}</div>}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>Reason for cancellation (optional)</label>
                            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Let the host know why..." rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color, #e1e4e8)', borderRadius: '8px', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => { setShowCancel(false); setActionError(''); }} style={{ flex: 1, padding: '10px', border: '1px solid var(--border-color, #e1e4e8)', borderRadius: '8px', background: 'var(--bg-card, #fff)', cursor: 'pointer', fontWeight: 500 }}>Keep Meeting</button>
                            <button onClick={handleCancel} disabled={cancelling} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#d73a49', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{cancelling ? 'Cancelling...' : 'Confirm Cancel'}</button>
                        </div>
                    </div>
                )}

                {/* Reschedule Flow */}
                {showReschedule && (
                    <div style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color, #e1e4e8)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Pick a New Time</h3>
                            <button onClick={() => { setShowReschedule(false); setRescheduleDate(null); setRescheduleTime(null); setActionError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-tertiary)' }}>✕</button>
                        </div>
                        {actionError && <div style={{ padding: '8px 12px', background: '#fce4ec', borderRadius: '6px', color: '#d73a49', fontSize: '0.8125rem', marginBottom: '12px' }}>{actionError}</div>}

                        {/* Calendar */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{rescheduleMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button type="button" onClick={() => setRescheduleMonth(new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth() - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                                    </button>
                                    <button type="button" onClick={() => setRescheduleMonth(new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth() + 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary, #6a737d)', padding: '4px 0' }}>{d}</div>)}
                                {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                    const day = i + 1;
                                    const date = new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth(), day);
                                    const available = isDateAvailable(date);
                                    const isSelected = rescheduleDate?.toDateString() === date.toDateString();
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    return (
                                        <button key={day} type="button" disabled={!available} onClick={() => { setRescheduleDate(date); setRescheduleTime(null); }}
                                            style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: available ? 'pointer' : 'default', background: isSelected ? brandColor : 'transparent', color: isSelected ? '#fff' : !available ? '#ccc' : isToday ? brandColor : 'inherit', fontWeight: isToday || isSelected ? 700 : 400, fontSize: '0.8125rem', opacity: available ? 1 : 0.35, margin: '0 auto' }}>
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time Slots */}
                        {rescheduleDate && (
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '8px' }}>{rescheduleDate.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                                {timeSlots.length === 0 ? (
                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No available time slots.</p>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                        {timeSlots.map((slot, i) => (
                                            <button key={i} type="button" onClick={() => setRescheduleTime(slot)}
                                                style={{ padding: '10px 8px', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${rescheduleTime?.label === slot.label ? brandColor : 'var(--border-color, #e1e4e8)'}`, background: rescheduleTime?.label === slot.label ? brandColor : '#fff', color: rescheduleTime?.label === slot.label ? '#fff' : 'inherit', transition: 'all 0.15s' }}>
                                                {slot.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Confirm Reschedule */}
                        <button onClick={handleReschedule} disabled={!rescheduleTime || rescheduling}
                            style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', background: rescheduleTime ? brandColor : '#ccc', color: '#fff', fontWeight: 600, fontSize: '0.9375rem', cursor: rescheduleTime ? 'pointer' : 'default', opacity: rescheduleTime ? 1 : 0.5 }}>
                            {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-tertiary, #6a737d)', marginTop: '20px' }}>
                    Powered by <strong style={{ color: brandColor }}>Scheduler</strong>
                </div>
            </div>
        </div>
    );
}
