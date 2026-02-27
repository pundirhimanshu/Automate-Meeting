'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const COLORS = ['#ff9500', '#0069ff', '#8b5cf6', '#00a854', '#e11d48', '#0d9488', '#f59e0b', '#6366f1'];

export default function CreateEventTypePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        duration: 30,
        type: 'one-on-one',
        color: '#ff9500',
        locationType: 'none',
        location: '',
        bufferTimeBefore: 0,
        bufferTimeAfter: 0,
        dateRangeType: 'indefinite',
        dateRangeDays: 60,
        maxBookingsPerDay: '',
        minNotice: 60,
        requiresPayment: false,
        price: '',
        customQuestions: [],
    });

    const handleChange = (e) => {
        const { name, value, type: inputType, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: inputType === 'checkbox' ? checked : value,
        }));
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
        if (!form.title.trim()) return;
        setLoading(true);

        try {
            const res = await fetch('/api/event-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    duration: parseInt(form.duration),
                    bufferTimeBefore: parseInt(form.bufferTimeBefore),
                    bufferTimeAfter: parseInt(form.bufferTimeAfter),
                    minNotice: parseInt(form.minNotice),
                    maxBookingsPerDay: form.maxBookingsPerDay ? parseInt(form.maxBookingsPerDay) : null,
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
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '720px' }}>
            <div className="page-header">
                <h1 className="page-title">Create Event Type</h1>
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
                            <input
                                name="title"
                                className="input"
                                placeholder="e.g., Quick Chat, Discovery Call"
                                value={form.title}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                className="input"
                                placeholder="Describe what this meeting is about..."
                                value={form.description}
                                onChange={handleChange}
                                rows={3}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label>Duration (minutes)</label>
                                <select name="duration" className="input" value={form.duration} onChange={handleChange}>
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>60 minutes</option>
                                    <option value={90}>90 minutes</option>
                                    <option value={120}>120 minutes</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Meeting Type</label>
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
                            <select name="locationType" className="input" value={form.locationType} onChange={handleChange}>
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
                                    value={form.location}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        )}

                        {form.locationType === 'in_person' && (
                            <div className="input-group">
                                <label>Meeting Address</label>
                                <input
                                    name="location"
                                    className="input"
                                    placeholder="Enter physical address"
                                    value={form.location}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        )}

                        <div className="input-group">
                            <label>Color</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setForm((p) => ({ ...p, color: c }))}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: c,
                                            border: form.color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scheduling Settings */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Scheduling Settings</h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label>Buffer before (minutes)</label>
                                <select name="bufferTimeBefore" className="input" value={form.bufferTimeBefore} onChange={handleChange}>
                                    <option value={0}>No buffer</option>
                                    <option value={5}>5 minutes</option>
                                    <option value={10}>10 minutes</option>
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Buffer after (minutes)</label>
                                <select name="bufferTimeAfter" className="input" value={form.bufferTimeAfter} onChange={handleChange}>
                                    <option value={0}>No buffer</option>
                                    <option value={5}>5 minutes</option>
                                    <option value={10}>10 minutes</option>
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label>Date Range</label>
                                <select name="dateRangeType" className="input" value={form.dateRangeType} onChange={handleChange}>
                                    <option value="indefinite">Indefinitely into the future</option>
                                    <option value="days">Rolling days</option>
                                    <option value="range">Date range</option>
                                </select>
                            </div>

                            {form.dateRangeType === 'days' && (
                                <div className="input-group">
                                    <label>Number of days</label>
                                    <input
                                        name="dateRangeDays"
                                        type="number"
                                        className="input"
                                        value={form.dateRangeDays}
                                        onChange={handleChange}
                                        min={1}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label>Maximum bookings per day</label>
                                <input
                                    name="maxBookingsPerDay"
                                    type="number"
                                    className="input"
                                    placeholder="No limit"
                                    value={form.maxBookingsPerDay}
                                    onChange={handleChange}
                                    min={1}
                                />
                            </div>

                            <div className="input-group">
                                <label>Minimum notice (minutes)</label>
                                <select name="minNotice" className="input" value={form.minNotice} onChange={handleChange}>
                                    <option value={0}>No minimum</option>
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={60}>1 hour</option>
                                    <option value={120}>2 hours</option>
                                    <option value={240}>4 hours</option>
                                    <option value={1440}>24 hours</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Custom Questions */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Custom Questions</h3>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={addQuestion}>
                            + Add Question
                        </button>
                    </div>
                    <div className="card-body">
                        {form.customQuestions.length === 0 ? (
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                                No custom questions added. Invitees will only be asked for their name and email.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {form.customQuestions.map((q, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                        <input
                                            className="input"
                                            placeholder="Your question..."
                                            value={q.question}
                                            onChange={(e) => updateQuestion(i, 'question', e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                        <select
                                            className="input"
                                            value={q.type}
                                            onChange={(e) => updateQuestion(i, 'type', e.target.value)}
                                            style={{ width: '100px' }}
                                        >
                                            <option value="text">Text</option>
                                            <option value="textarea">Long text</option>
                                            <option value="select">Dropdown</option>
                                        </select>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                                            <input
                                                type="checkbox"
                                                checked={q.required}
                                                onChange={(e) => updateQuestion(i, 'required', e.target.checked)}
                                            />
                                            Required
                                        </label>
                                        <button
                                            type="button"
                                            className="btn-icon btn-ghost"
                                            onClick={() => removeQuestion(i)}
                                            style={{ color: 'var(--danger)' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Payment</h3>
                    </div>
                    <div className="card-body">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="requiresPayment"
                                checked={form.requiresPayment}
                                onChange={handleChange}
                            />
                            <span style={{ fontSize: '0.875rem' }}>Require payment before booking</span>
                        </label>
                        {form.requiresPayment && (
                            <div className="input-group" style={{ marginTop: '12px' }}>
                                <label>Price (USD)</label>
                                <input
                                    name="price"
                                    type="number"
                                    className="input"
                                    placeholder="0.00"
                                    value={form.price}
                                    onChange={handleChange}
                                    min={0}
                                    step="0.01"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Event Type'}
                    </button>
                </div>
            </form>
        </div>
    );
}
