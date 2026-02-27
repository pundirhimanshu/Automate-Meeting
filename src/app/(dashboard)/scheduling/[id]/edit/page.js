'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const COLORS = ['#ff9500', '#0069ff', '#8b5cf6', '#00a854', '#e11d48', '#0d9488', '#f59e0b', '#6366f1'];

export default function EditEventTypePage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(null);

    useEffect(() => {
        fetchEventType();
    }, []);

    const fetchEventType = async () => {
        try {
            const res = await fetch(`/api/event-types/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setForm({
                    ...data.eventType,
                    maxBookingsPerDay: data.eventType.maxBookingsPerDay || '',
                    price: data.eventType.price || '',
                    locationType: data.eventType.locationType || 'none',
                    customQuestions: data.eventType.customQuestions || [],
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type: inputType, checked } = e.target;
        setForm((prev) => {
            const newState = {
                ...prev,
                [name]: inputType === 'checkbox' ? checked : value,
            };

            // Clear location if type changes to a non-text type
            if (name === 'locationType' && ['none', 'google_meet', 'zoom', 'teams'].includes(value)) {
                newState.location = '';
            }

            return newState;
        });
    };

    const addQuestion = () => {
        setForm((prev) => ({
            ...prev,
            customQuestions: [...prev.customQuestions, { question: '', type: 'text', required: false }],
        }));
    };

    const updateQuestion = (index, field, value) => {
        setForm((prev) => ({
            ...prev,
            customQuestions: prev.customQuestions.map((q, i) =>
                i === index ? { ...q, [field]: value } : q
            ),
        }));
    };

    const removeQuestion = (index) => {
        setForm((prev) => ({
            ...prev,
            customQuestions: prev.customQuestions.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch(`/api/event-types/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    duration: parseInt(form.duration),
                    type: form.type,
                    color: form.color,
                    locationType: form.locationType,
                    location: form.location,
                    bufferTimeBefore: parseInt(form.bufferTimeBefore),
                    bufferTimeAfter: parseInt(form.bufferTimeAfter),
                    dateRangeType: form.dateRangeType,
                    dateRangeDays: form.dateRangeDays ? parseInt(form.dateRangeDays) : null,
                    maxBookingsPerDay: form.maxBookingsPerDay ? parseInt(form.maxBookingsPerDay) : null,
                    minNotice: parseInt(form.minNotice),
                    isActive: form.isActive,
                    requiresPayment: form.requiresPayment,
                    price: form.price ? parseFloat(form.price) : null,
                    customQuestions: form.customQuestions.filter((q) => q.question.trim()),
                }),
            });

            if (res.ok) {
                router.push('/scheduling');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
        );
    }

    if (!form) {
        return (
            <div className="empty-state">
                <h3>Event type not found</h3>
                <button className="btn btn-primary" onClick={() => router.push('/scheduling')}>
                    Back to Scheduling
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '720px' }}>
            <div className="page-header">
                <h1 className="page-title">Edit Event Type</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: form.isActive ? '#dcfce7' : '#fce4ec',
                        color: form.isActive ? '#00a854' : '#e11d48',
                    }}>
                        {form.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Basic Info */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Basic Information</h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="input-group">
                            <label>Event Name *</label>
                            <input name="title" className="input" value={form.title} onChange={handleChange} required />
                        </div>
                        <div className="input-group">
                            <label>Description</label>
                            <textarea name="description" className="input" value={form.description || ''} onChange={handleChange} rows={3} style={{ resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label>Duration</label>
                                <select name="duration" className="input" value={form.duration} onChange={handleChange}>
                                    {[15, 30, 45, 60, 90, 120].map((d) => (
                                        <option key={d} value={d}>{d} minutes</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Type</label>
                                <select name="type" className="input" value={form.type} onChange={handleChange}>
                                    <option value="one-on-one">One-on-One</option>
                                    <option value="group">Group</option>
                                    <option value="collective">Collective</option>
                                    <option value="round-robin">Round Robin</option>
                                </select>
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Location</label>
                            <select name="locationType" className="input" value={form.locationType || 'none'} onChange={handleChange}>
                                <option value="none">No location set</option>
                                <option value="google_meet">Google Meet</option>
                                <option value="zoom">Zoom</option>
                                <option value="teams">Microsoft Teams</option>
                                <option value="phone">Phone Call</option>
                                <option value="in_person">In Person</option>
                            </select>
                        </div>

                        {form.locationType === 'phone' && (
                            <div className="input-group">
                                <label>Phone Number</label>
                                <input
                                    name="location"
                                    className="input"
                                    placeholder="Enter your phone number or 'Invitee will provide'"
                                    value={form.location || ''}
                                    onChange={handleChange}
                                    required
                                />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    This number will be shared with the invitee after they book.
                                </p>
                            </div>
                        )}

                        {form.locationType === 'in_person' && (
                            <div className="input-group">
                                <label>Meeting Address *</label>
                                <input
                                    name="location"
                                    className="input"
                                    placeholder="e.g., 123 Main St, New York, NY"
                                    value={form.location || ''}
                                    onChange={handleChange}
                                    required
                                />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    Provide a full address or specific meeting spot.
                                </p>
                            </div>
                        )}
                        <div className="input-group">
                            <label>Color</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setForm((p) => ({ ...p, color: c }))}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '50%', background: c,
                                            border: form.color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                                            cursor: 'pointer',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scheduling */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Scheduling Settings</h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label>Buffer before</label>
                                <select name="bufferTimeBefore" className="input" value={form.bufferTimeBefore} onChange={handleChange}>
                                    {[0, 5, 10, 15, 30].map((v) => <option key={v} value={v}>{v === 0 ? 'No buffer' : `${v} min`}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Buffer after</label>
                                <select name="bufferTimeAfter" className="input" value={form.bufferTimeAfter} onChange={handleChange}>
                                    {[0, 5, 10, 15, 30].map((v) => <option key={v} value={v}>{v === 0 ? 'No buffer' : `${v} min`}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label>Max bookings/day</label>
                                <input name="maxBookingsPerDay" type="number" className="input" placeholder="No limit" value={form.maxBookingsPerDay} onChange={handleChange} min={1} />
                            </div>
                            <div className="input-group">
                                <label>Min notice</label>
                                <select name="minNotice" className="input" value={form.minNotice} onChange={handleChange}>
                                    {[0, 15, 30, 60, 120, 240, 1440].map((v) => <option key={v} value={v}>{v === 0 ? 'None' : v < 60 ? `${v} min` : `${v / 60}h`}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Custom Questions */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Custom Questions</h3>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={addQuestion}>+ Add</button>
                    </div>
                    <div className="card-body">
                        {form.customQuestions.length === 0 ? (
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No custom questions.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {form.customQuestions.map((q, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input className="input" value={q.question} onChange={(e) => updateQuestion(i, 'question', e.target.value)} style={{ flex: 1 }} placeholder="Question..." />
                                        <select className="input" value={q.type} onChange={(e) => updateQuestion(i, 'type', e.target.value)} style={{ width: '90px' }}>
                                            <option value="text">Text</option>
                                            <option value="textarea">Long</option>
                                            <option value="select">Select</option>
                                        </select>
                                        <button type="button" className="btn-icon btn-ghost" onClick={() => removeQuestion(i)} style={{ color: 'var(--danger)' }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => router.push('/scheduling')}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </form>
        </div>
    );
}
