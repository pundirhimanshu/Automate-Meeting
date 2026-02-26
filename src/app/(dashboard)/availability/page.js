'use client';

import { useState, useEffect } from 'react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityPage() {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSchedule, setActiveSchedule] = useState(null);
    const [availability, setAvailability] = useState({});
    const [saved, setSaved] = useState(false);

    // Date overrides state
    const [dateOverrides, setDateOverrides] = useState([]);
    const [showAddOverride, setShowAddOverride] = useState(false);
    const [newOverride, setNewOverride] = useState({
        date: '',
        mode: 'blocked', // 'blocked' or 'custom'
        startTime: '09:00',
        endTime: '17:00',
    });

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            const res = await fetch('/api/availability');
            if (res.ok) {
                const data = await res.json();
                const scheds = data.schedules || [];
                setSchedules(scheds);
                if (scheds.length > 0) {
                    const defaultSched = scheds.find((s) => s.isDefault) || scheds[0];
                    setActiveSchedule(defaultSched);
                    initAvailability(defaultSched);
                    setDateOverrides(defaultSched.dateOverrides || []);
                }
            }
        } catch (e) { } finally {
            setLoading(false);
        }
    };

    const initAvailability = (schedule) => {
        const avail = {};
        for (let i = 0; i < 7; i++) {
            const dayAvails = schedule.availabilities.filter((a) => a.dayOfWeek === i);
            if (dayAvails.length > 0) {
                avail[i] = { enabled: true, startTime: dayAvails[0].startTime, endTime: dayAvails[0].endTime };
            } else {
                avail[i] = { enabled: false, startTime: '09:00', endTime: '17:00' };
            }
        }
        setAvailability(avail);
    };

    const toggleDay = (day) => {
        setAvailability((prev) => ({
            ...prev,
            [day]: { ...prev[day], enabled: !prev[day].enabled },
        }));
    };

    const updateTime = (day, field, value) => {
        setAvailability((prev) => ({
            ...prev,
            [day]: { ...prev[day], [field]: value },
        }));
    };

    // Date override handlers
    const addOverride = () => {
        if (!newOverride.date) return;

        // Check if date already exists
        const exists = dateOverrides.some((d) => {
            const existingDate = new Date(d.date).toISOString().split('T')[0];
            return existingDate === newOverride.date;
        });
        if (exists) {
            alert('An override for this date already exists.');
            return;
        }

        const override = {
            id: `temp-${Date.now()}`,
            date: newOverride.date,
            isBlocked: newOverride.mode === 'blocked',
            startTime: newOverride.mode === 'custom' ? newOverride.startTime : null,
            endTime: newOverride.mode === 'custom' ? newOverride.endTime : null,
        };

        setDateOverrides((prev) => [...prev, override].sort((a, b) => new Date(a.date) - new Date(b.date)));
        setNewOverride({ date: '', mode: 'blocked', startTime: '09:00', endTime: '17:00' });
        setShowAddOverride(false);
    };

    const removeOverride = (index) => {
        setDateOverrides((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!activeSchedule) return;
        setSaving(true);

        const availabilities = [];
        Object.entries(availability).forEach(([day, config]) => {
            if (config.enabled) {
                availabilities.push({
                    dayOfWeek: parseInt(day),
                    startTime: config.startTime,
                    endTime: config.endTime,
                });
            }
        });

        const overridesPayload = dateOverrides.map((d) => ({
            date: d.date,
            isBlocked: d.isBlocked,
            startTime: d.isBlocked ? null : d.startTime,
            endTime: d.isBlocked ? null : d.endTime,
        }));

        try {
            const res = await fetch('/api/availability', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduleId: activeSchedule.id,
                    availabilities,
                    dateOverrides: overridesPayload,
                }),
            });

            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (e) { } finally {
            setSaving(false);
        }
    };

    const timeOptions = () => {
        const opts = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 30) {
                const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                const label = new Date(2000, 0, 1, h, m).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true });
                opts.push({ value: time, label });
            }
        }
        return opts;
    };

    const times = timeOptions();

    const formatOverrideDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTimeLabel = (time) => {
        if (!time) return '';
        const [h, m] = time.split(':').map(Number);
        return new Date(2000, 0, 1, h, m).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Get min date for the date picker (today)
    const today = new Date().toISOString().split('T')[0];

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>;
    }

    return (
        <div style={{ maxWidth: '800px' }}>
            <div className="page-header">
                <h1 className="page-title">Availability</h1>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
                </button>
            </div>

            {/* Schedule selector */}
            {schedules.length > 1 && (
                <div className="filter-bar" style={{ marginBottom: '16px' }}>
                    {schedules.map((s) => (
                        <button
                            key={s.id}
                            className={`btn ${activeSchedule?.id === s.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => { setActiveSchedule(s); initAvailability(s); setDateOverrides(s.dateOverrides || []); }}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Weekly Hours */}
            <div className="card">
                <div className="card-header">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{activeSchedule?.name || 'Working Hours'}</h3>
                </div>
                <div className="card-body">
                    <div className="availability-grid">
                        {DAYS.map((day, i) => (
                            <div key={i} className="availability-row">
                                <div className="availability-day">
                                    <button
                                        className={`availability-toggle ${availability[i]?.enabled ? 'active' : ''}`}
                                        onClick={() => toggleDay(i)}
                                    />
                                    <span style={{ fontWeight: 500, color: availability[i]?.enabled ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                        {day}
                                    </span>
                                </div>
                                {availability[i]?.enabled ? (
                                    <div className="availability-times">
                                        <select className="time-input" value={availability[i].startTime} onChange={(e) => updateTime(i, 'startTime', e.target.value)}>
                                            {times.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                                        <select className="time-input" value={availability[i].endTime} onChange={(e) => updateTime(i, 'endTime', e.target.value)}>
                                            {times.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>Unavailable</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Date Overrides */}
            <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Date Overrides</h3>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddOverride(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Override
                    </button>
                </div>
                <div className="card-body">
                    {/* Add Override Form */}
                    {showAddOverride && (
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-page)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: dateOverrides.length > 0 ? '16px' : '0',
                            border: '1px solid var(--border-color)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>New Date Override</span>
                                <button
                                    className="drawer-close"
                                    onClick={() => setShowAddOverride(false)}
                                    style={{ width: 24, height: 24, fontSize: '0.875rem' }}
                                >✕</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div className="input-group">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={newOverride.date}
                                        onChange={(e) => setNewOverride({ ...newOverride, date: e.target.value })}
                                        min={today}
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Override Type</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${newOverride.mode === 'blocked' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setNewOverride({ ...newOverride, mode: 'blocked' })}
                                            style={{ flex: 1 }}
                                        >
                                            🚫 Block Entire Day
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${newOverride.mode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setNewOverride({ ...newOverride, mode: 'custom' })}
                                            style={{ flex: 1 }}
                                        >
                                            🕐 Custom Hours
                                        </button>
                                    </div>
                                </div>

                                {newOverride.mode === 'custom' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'end' }}>
                                        <div className="input-group">
                                            <label>From</label>
                                            <select
                                                className="input"
                                                value={newOverride.startTime}
                                                onChange={(e) => setNewOverride({ ...newOverride, startTime: e.target.value })}
                                            >
                                                {times.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>
                                        <span style={{ padding: '10px 0', color: 'var(--text-tertiary)' }}>—</span>
                                        <div className="input-group">
                                            <label>To</label>
                                            <select
                                                className="input"
                                                value={newOverride.endTime}
                                                onChange={(e) => setNewOverride({ ...newOverride, endTime: e.target.value })}
                                            >
                                                {times.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddOverride(false)}>Cancel</button>
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={addOverride}
                                        disabled={!newOverride.date}
                                    >
                                        Add Override
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Overrides List */}
                    {dateOverrides.length === 0 && !showAddOverride ? (
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                            No date overrides set. Use these to block vacation days or set special hours for specific dates.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {dateOverrides.map((override, i) => {
                                const dateStr = typeof override.date === 'string' && override.date.includes('T')
                                    ? override.date.split('T')[0]
                                    : override.date;

                                return (
                                    <div
                                        key={override.id || i}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 0',
                                            borderBottom: i < dateOverrides.length - 1 ? '1px solid var(--border-light)' : 'none',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {/* Date icon */}
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: 'var(--radius-md)',
                                                background: override.isBlocked ? '#fce4ec' : 'var(--primary-light)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: override.isBlocked ? 'var(--danger)' : 'var(--primary)', lineHeight: 1, textTransform: 'uppercase' }}>
                                                    {new Date(dateStr + 'T00:00:00').toLocaleDateString('en', { month: 'short' })}
                                                </span>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: override.isBlocked ? 'var(--danger)' : 'var(--primary)', lineHeight: 1.2 }}>
                                                    {new Date(dateStr + 'T00:00:00').getDate()}
                                                </span>
                                            </div>

                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                                    {formatOverrideDate(dateStr)}
                                                </div>
                                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                    {override.isBlocked ? (
                                                        <span style={{ color: 'var(--danger)', fontWeight: 500 }}>🚫 Blocked — No bookings</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--primary)', fontWeight: 500 }}>🕐 {formatTimeLabel(override.startTime)} — {formatTimeLabel(override.endTime)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            className="btn-icon btn-ghost"
                                            onClick={() => removeOverride(i)}
                                            style={{ color: 'var(--text-tertiary)', width: 28, height: 28 }}
                                            title="Remove override"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
