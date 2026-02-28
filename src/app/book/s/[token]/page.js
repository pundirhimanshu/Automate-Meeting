'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';

export default function SingleUseLinkBookingPage() {
    const params = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [step, setStep] = useState('calendar');
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [bookedData, setBookedData] = useState(null);

    const inviteeTimezone = useMemo(() => {
        try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
    }, []);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/public/s/${params.token}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
                // Pre-fill contact info
                if (json.prefill) {
                    setFormData(prev => ({
                        ...prev,
                        name: json.prefill.name || '',
                        email: json.prefill.email || '',
                    }));
                }
            } else {
                const errData = await res.json();
                setError(errData.error || 'This link is invalid.');
            }
        } catch (e) { setError('Failed to load.'); }
        finally { setLoading(false); }
    };

    // Calendar helpers
    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const isDateAvailable = (date) => {
        if (!data) return false;
        const now = new Date(); now.setHours(0, 0, 0, 0);
        if (date < now) return false;
        const minNoticeMs = (data.eventType.minNotice || 0) * 60 * 1000;
        if (date.getTime() < Date.now() + minNoticeMs - 86400000) return false;
        const dateStr = date.toISOString().split('T')[0];
        const override = data.dateOverrides?.find((d) => new Date(d.date).toISOString().split('T')[0] === dateStr);
        if (override?.isBlocked) return false;
        const dayOfWeek = date.getDay();
        return data.availability?.some((a) => a.dayOfWeek === dayOfWeek);
    };

    const getTimeSlots = (date) => {
        if (!data || !date) return [];
        const dayOfWeek = date.getDay();
        const dayAvails = data.availability?.filter((a) => a.dayOfWeek === dayOfWeek) || [];
        const duration = data.eventType.duration || 30;
        const bufferBefore = data.eventType.bufferTimeBefore || 0;
        const bufferAfter = data.eventType.bufferTimeAfter || 0;
        const slots = [];
        dayAvails.forEach((avail) => {
            const [startH, startM] = avail.startTime.split(':').map(Number);
            const [endH, endM] = avail.endTime.split(':').map(Number);
            const startMin = startH * 60 + startM;
            const endMin = endH * 60 + endM;
            for (let m = startMin; m + duration <= endMin; m += 30) {
                const slotStart = new Date(date); slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
                const slotEnd = new Date(slotStart); slotEnd.setMinutes(slotEnd.getMinutes() + duration);
                const bufStart = new Date(slotStart); bufStart.setMinutes(bufStart.getMinutes() - bufferBefore);
                const bufEnd = new Date(slotEnd); bufEnd.setMinutes(bufEnd.getMinutes() + bufferAfter);
                if (slotStart.getTime() < Date.now() + (data.eventType.minNotice || 0) * 60000) continue;
                const hasConflict = data.existingBookings?.some((b) => {
                    const bStart = new Date(b.startTime); const bEnd = new Date(b.endTime);
                    return bufStart < bEnd && bufEnd > bStart;
                });
                if (!hasConflict) {
                    slots.push({
                        start: slotStart, end: slotEnd,
                        label: slotStart.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true }),
                    });
                }
            }
        });
        return slots;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTime || !formData.name || !formData.email) return;
        setSubmitting(true); setSubmitError('');
        try {
            const answerList = Object.entries(answers).filter(([_, v]) => v.trim()).map(([questionId, answer]) => ({ questionId, answer }));
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventTypeId: data.eventType.id,
                    inviteeName: formData.name,
                    inviteeEmail: formData.email,
                    startTime: selectedTime.start.toISOString(),
                    endTime: selectedTime.end.toISOString(),
                    timezone: inviteeTimezone,
                    notes: formData.notes,
                    answers: answerList,
                    singleUseToken: data.singleUseToken,
                }),
            });
            if (res.ok) {
                const result = await res.json();
                setBookedData(result.booking);
                setStep('confirmed');
                // Mark single-use link as used
                await fetch(`/api/public/s/${params.token}/mark-used`, { method: 'POST' });
            } else {
                const errData = await res.json();
                setSubmitError(errData.error || 'Failed to book.');
            }
        } catch (e) { setSubmitError('Something went wrong.'); }
        finally { setSubmitting(false); }
    };

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

    if (loading) return <div className="booking-page"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }}></div></div>;

    if (error) {
        return (
            <div className="booking-page">
                <div className="confirmation-card">
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
                    <h2>Link Unavailable</h2>
                    <p style={{ color: 'var(--text-tertiary)', marginTop: '8px' }}>{error}</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    if (step === 'confirmed') {
        return (
            <div className="confirmation-page">
                <div className="confirmation-card">
                    <div className="confirmation-icon">✓</div>
                    <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '8px' }}>You're booked!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>A calendar invitation has been sent to your email.</p>
                    <div style={{ textAlign: 'left', padding: '16px', background: 'var(--bg-page)', borderRadius: '8px', marginBottom: '16px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '8px' }}>{data.eventType.title}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            <div>📅 {selectedDate?.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                            <div>🕐 {selectedTime?.label} ({data.eventType.duration} min)</div>
                            <div>🌍 {inviteeTimezone}</div>
                            {data.eventType.location && <div>📍 {data.eventType.location}</div>}
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                        Powered by <strong style={{ color: 'var(--primary)' }}>Automate Meetings</strong>
                    </div>
                </div>
            </div>
        );
    }

    const brandColor = data.host.brandColor || '#0069ff';
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const timeSlots = selectedDate ? getTimeSlots(selectedDate) : [];
    const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    return (
        <div className="booking-page">
            <div className="booking-container">
                {/* Left Panel */}
                <div className="booking-left">
                    <button onClick={() => { if (step === 'form') setStep('time'); else if (step === 'time') setStep('calendar'); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '16px', display: step !== 'calendar' ? 'flex' : 'none', alignItems: 'center', gap: '4px', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                        ← Back
                    </button>
                    <div className="booking-host-info">
                        {data.host.logo && (
                            <img src={data.host.logo} alt={`${data.host.name} logo`} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'contain', marginBottom: '8px' }} />
                        )}
                        <div className="booking-host-name">{data.host.name}</div>
                        <div className="booking-event-title">{data.eventType.title}</div>
                    </div>
                    <div className="booking-detail">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        {data.eventType.duration} min
                    </div>
                    {data.eventType.location && (
                        <div className="booking-detail">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            {data.eventType.location}
                        </div>
                    )}
                    {selectedDate && (
                        <div className="booking-detail">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                            {selectedDate.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                    )}
                    <div className="booking-detail" style={{ marginTop: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                        {inviteeTimezone}
                    </div>
                    <div style={{ marginTop: '16px', padding: '8px 12px', background: '#fef3c7', borderRadius: '6px', fontSize: '0.75rem', color: '#d97706' }}>
                        🔗 This is a single-use link — it can only be used once
                    </div>
                </div>

                {/* Right Panel */}
                <div className="booking-right">
                    {step === 'calendar' && (
                        <div className="calendar-grid">
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Select a Date</h3>
                            <div className="calendar-header">
                                <span className="calendar-month">{currentMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
                                <div className="calendar-nav">
                                    <button type="button" onClick={prevMonth}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg></button>
                                    <button type="button" onClick={nextMonth}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg></button>
                                </div>
                            </div>
                            <div className="calendar-weekdays">{weekdays.map((d) => <div key={d} className="calendar-weekday">{d}</div>)}</div>
                            <div className="calendar-days">
                                {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="calendar-day empty" />)}
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                    const day = i + 1;
                                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                    const available = isDateAvailable(date);
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                                    return (
                                        <button key={day} type="button" className={`calendar-day ${!available ? 'disabled' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                                            onClick={() => { if (available) { setSelectedDate(date); setSelectedTime(null); setStep('time'); } }} disabled={!available}
                                            style={isSelected ? { background: brandColor, color: 'white' } : {}}>
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === 'time' && (
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>{selectedDate?.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                            {timeSlots.length === 0 ? (
                                <p style={{ color: 'var(--text-tertiary)' }}>No available time slots for this date.</p>
                            ) : (
                                <div className="time-slots">
                                    {timeSlots.map((slot, i) => (
                                        <button key={i} type="button" className={`time-slot ${selectedTime?.label === slot.label ? 'selected' : ''}`}
                                            onClick={() => { setSelectedTime(slot); setStep('form'); }}
                                            style={{ borderColor: brandColor, color: selectedTime?.label === slot.label ? 'white' : brandColor, background: selectedTime?.label === slot.label ? brandColor : 'white' }}
                                            onMouseEnter={(e) => { e.target.style.background = brandColor; e.target.style.color = 'white'; }}
                                            onMouseLeave={(e) => { if (selectedTime?.label !== slot.label) { e.target.style.background = 'white'; e.target.style.color = brandColor; } }}>
                                            {slot.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'form' && (
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Enter Details</h3>
                            {submitError && <div style={{ padding: '10px 14px', background: '#fce4ec', borderRadius: '8px', color: '#e11d48', fontSize: '0.8125rem', marginBottom: '16px' }}>{submitError}</div>}
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="input-group">
                                    <label>Name *</label>
                                    <input className="input" placeholder="Your full name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                                <div className="input-group">
                                    <label>Email *</label>
                                    <input className="input" type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                </div>
                                {data.eventType.customQuestions?.map((q) => (
                                    <div key={q.id} className="input-group">
                                        <label>{q.question} {q.required && '*'}</label>
                                        {q.type === 'textarea' ? (
                                            <textarea className="input" value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} required={q.required} rows={3} />
                                        ) : (
                                            <input className="input" value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} required={q.required} />
                                        )}
                                    </div>
                                ))}
                                <div className="input-group">
                                    <label>Additional Notes</label>
                                    <textarea className="input" placeholder="Anything you'd like to share..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
                                </div>
                                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={submitting} style={{ borderRadius: '8px', background: brandColor }}>
                                    {submitting ? 'Scheduling...' : 'Schedule Event'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
