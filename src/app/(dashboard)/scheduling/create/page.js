'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const COLORS = ['#ff9500', '#0069ff', '#8b5cf6', '#00a854', '#e11d48', '#0d9488', '#f59e0b', '#6366f1'];

const COUNTRY_CODES = [
    { code: '+1', flag: '🇺🇸', label: 'United States (+1)' },
    { code: '+91', flag: '🇮🇳', label: 'India (+91)' },
    { code: '+44', flag: '🇬🇧', label: 'United Kingdom (+44)' },
    { code: '+1', flag: '🇨🇦', label: 'Canada (+1)' },
    { code: '+61', flag: '🇦🇺', label: 'Australia (+61)' },
    { code: '+971', flag: '🇦🇪', label: 'United Arab Emirates (+971)' },
    { code: '+49', flag: '🇩🇪', label: 'Germany (+49)' },
    { code: '+33', flag: '🇫🇷', label: 'France (+33)' },
    { code: '+81', flag: '🇯🇵', label: 'Japan (+81)' },
    { code: '+65', flag: '🇸🇬', label: 'Singapore (+65)' },
    { code: '+852', flag: '🇭🇰', label: 'Hong Kong (+852)' },
    { code: '+353', flag: '🇮🇪', label: 'Ireland (+353)' },
    { code: '+31', flag: '🇳🇱', label: 'Netherlands (+31)' },
    { code: '+34', flag: '🇪🇸', label: 'Spain (+34)' },
    { code: '+39', flag: '🇮🇹', label: 'Italy (+39)' },
    { code: '+55', flag: '🇧🇷', label: 'Brazil (+55)' },
    { code: '+52', flag: '🇲🇽', label: 'Mexico (+52)' },
    { code: '+27', flag: '🇿🇦', label: 'South Africa (+27)' },
    { code: '+64', flag: '🇳🇿', label: 'New Zealand (+64)' },
    { code: '+41', flag: '🇨🇭', label: 'Switzerland (+41)' },
    { code: '+46', flag: '🇸🇪', label: 'Sweden (+46)' },
    { code: '+47', flag: '🇳🇴', label: 'Norway (+47)' },
    { code: '+45', flag: '🇩🇰', label: 'Denmark (+45)' },
    { code: '+7', flag: '🇷🇺', label: 'Russia (+7)' },
    { code: '+86', flag: '🇨🇳', label: 'China (+86)' },
    { code: '+82', flag: '🇰🇷', label: 'South Korea (+82)' },
    { code: '+90', flag: '🇹🇷', label: 'Turkey (+90)' },
    { code: '+62', flag: '🇮🇩', label: 'Indonesia (+62)' },
    { code: '+66', flag: '🇹🇭', label: 'Thailand (+66)' },
    { code: '+60', flag: '🇲🇾', label: 'Malaysia (+60)' },
    { code: '+63', flag: '🇵🇭', label: 'Philippines (+63)' },
    { code: '+84', flag: '🇻🇳', label: 'Vietnam (+84)' },
    { code: '+966', flag: '🇸🇦', label: 'Saudi Arabia (+966)' },
    { code: '+965', flag: '🇰🇼', label: 'Kuwait (+965)' },
    { code: '+968', flag: '🇴🇲', label: 'Oman (+968)' },
    { code: '+974', flag: '🇶🇦', label: 'Qatar (+974)' },
    { code: '+973', flag: '🇧🇭', label: 'Bahrain (+973)' },
];

const CURRENCIES = [
    { code: 'USD', symbol: '$', label: 'US Dollar' },
    { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
    { code: 'EUR', symbol: '€', label: 'Euro' },
    { code: 'GBP', symbol: '£', label: 'British Pound' },
    { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
    { code: 'AED', symbol: 'DH', label: 'UAE Dirham' },
    { code: 'SAR', symbol: 'SR', label: 'Saudi Riyal' },
    { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
    { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
    { code: 'CHF', symbol: 'Fr', label: 'Swiss Franc' },
    { code: 'NZD', symbol: '$', label: 'New Zealand Dollar' },
    { code: 'HKD', symbol: '$', label: 'Hong Kong Dollar' },
    { code: 'ZAR', symbol: 'R', label: 'South African Rand' },
];

export default function CreateEventType() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [userPlan, setUserPlan] = useState('free');
    const [teamMembers, setTeamMembers] = useState([]);

    useEffect(() => {
        fetch('/api/subscription').then(r => r.json()).then(d => setUserPlan(d.plan || 'free')).catch(() => { });
        fetch('/api/team').then(r => r.json()).then(d => setTeamMembers(d.members || [])).catch(() => { });
    }, []);
    const [form, setForm] = useState({
        title: '',
        description: '',
        duration: 30,
        type: 'one-on-one',
        color: '#ff9500',
        locationType: 'none',
        location: '',
        countryCode: '+1',
        phoneCallSource: 'host',
        bufferTimeBefore: 0,
        bufferTimeAfter: 0,
        dateRangeType: 'indefinite',
        dateRangeDays: 60,
        maxBookingsPerDay: '',
        minNotice: 60,
        requiresPayment: false,
        paymentProvider: 'dodo',
        currency: 'USD',
        price: '',
        customQuestions: [],
        inviteeLimit: 1,
        coHostIds: [],
    });

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

            // Reset phone source if switching to phone
            if (name === 'locationType' && value === 'phone') {
                newState.phoneCallSource = 'host';
                newState.countryCode = '+1';
            }

            return newState;
        });
    };

    const addQuestion = () => {
        setForm((prev) => ({
            ...prev,
            customQuestions: [...prev.customQuestions, { question: '', type: 'text', required: false, options: '' }],
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

                        {form.type === 'group' && (
                            <div className="input-group">
                                <label>Invitee Limit (Group)</label>
                                <input
                                    name="inviteeLimit"
                                    type="number"
                                    className="input"
                                    placeholder="Number of people who can attend"
                                    value={form.inviteeLimit}
                                    onChange={handleChange}
                                    min={2}
                                    required
                                />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    Allow multiple people to sign up for the same time slot.
                                </p>
                            </div>
                        )}

                        {(form.type === 'collective' || form.type === 'round-robin') && (
                            <div className="input-group">
                                <label>Add Co-hosts</label>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                                    {form.type === 'collective'
                                        ? "This event is only available when everyone is free."
                                        : "Bookings will rotate between you and these hosts."}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                    {teamMembers.length === 0 ? (
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>No team members available. Invite them in the Admin Center first.</p>
                                    ) : (
                                        teamMembers
                                            .filter(m => !m.user.isPending)
                                            .map((member) => (
                                                <label key={member.user.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={form.coHostIds.includes(member.user.id)}
                                                        onChange={(e) => {
                                                            const ids = e.target.checked
                                                                ? [...form.coHostIds, member.user.id]
                                                                : form.coHostIds.filter(id => id !== member.user.id);
                                                            setForm({ ...form, coHostIds: ids });
                                                        }}
                                                    />
                                                    {member.user.name} ({member.user.email})
                                                </label>
                                            ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="input-group">
                            <label>Location</label>
                            <select name="locationType" className="input" value={form.locationType} onChange={handleChange}>
                                <option value="none">No location set</option>
                                <option value="google_meet">Google Meet</option>
                                {['pro', 'enterprise'].includes(userPlan) ? (
                                    <option value="zoom">Zoom</option>
                                ) : (
                                    <option value="zoom" disabled>Zoom (Pro Plan)</option>
                                )}
                                <option value="teams" disabled>Microsoft Teams (Coming Soon)</option>
                                <option value="phone">Phone Call</option>
                                <option value="in_person">In Person</option>
                            </select>
                        </div>

                        {form.locationType === 'phone' && (
                            <div className="input-group" style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                                <label style={{ fontWeight: 600, marginBottom: '12px', display: 'block' }}>How will you get in touch?</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9375rem' }}>
                                        <input
                                            type="radio"
                                            name="phoneCallSource"
                                            value="invitee"
                                            checked={form.phoneCallSource === 'invitee'}
                                            onChange={handleChange}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        Require invitee's phone number.
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9375rem' }}>
                                        <input
                                            type="radio"
                                            name="phoneCallSource"
                                            value="host"
                                            checked={form.phoneCallSource === 'host'}
                                            onChange={handleChange}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        Provide a phone number to invitees after they book.
                                    </label>
                                </div>

                                {form.phoneCallSource === 'host' && (
                                    <div style={{ marginTop: '16px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select
                                                name="countryCode"
                                                className="input"
                                                value={form.countryCode}
                                                onChange={handleChange}
                                                style={{ width: '90px', padding: '8px 4px', fontSize: '0.875rem', flexShrink: 0 }}
                                            >
                                                {COUNTRY_CODES.map(c => (
                                                    <option key={`${c.flag}-${c.code}`} value={c.code}>{c.flag} {c.code}</option>
                                                ))}
                                            </select>
                                            <input
                                                name="location"
                                                className="input"
                                                placeholder="Enter your phone number"
                                                value={form.location || ''}
                                                onChange={handleChange}
                                                required
                                                style={{ flex: 1 }}
                                            />
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                            Include your area code (e.g. 555-0123)
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {form.locationType === 'in_person' && (
                            <div className="input-group">
                                <label style={{ fontWeight: 600 }}>Location name/address</label>
                                <textarea
                                    name="location"
                                    className="input"
                                    placeholder="(e.g. Hollywood Bowl, 2301 Highland Ave, Los Angeles, CA 90068)"
                                    value={form.location}
                                    onChange={handleChange}
                                    required
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                />
                                <p style={{ fontSize: '0.75rem', color: '#d93025', marginTop: '4px' }}>
                                    Physical location is required.
                                </p>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Custom Questions</h3>
                            <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>NEW</span>
                        </div>
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
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
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
                                                style={{ width: '130px' }}
                                            >
                                                <option value="text">Text</option>
                                                <option value="textarea">Long text</option>
                                                <option value="number">Number</option>
                                                <option value="phone">Phone</option>
                                                <option value="date">Date</option>
                                                <option value="select">Dropdown</option>
                                                <option value="radio">Radio</option>
                                            </select>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', whiteSpace: 'nowrap', marginTop: '10px' }}>
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
                                                style={{ color: 'var(--danger)', marginTop: '4px' }}
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {['select', 'radio'].includes(q.type) ? (
                                            <div style={{ marginTop: '8px' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                                    Options (comma separated)
                                                </label>
                                                <input
                                                    className="input"
                                                    placeholder="Option 1, Option 2, Option 3"
                                                    value={q.options || ''}
                                                    onChange={(e) => updateQuestion(i, 'options', e.target.value)}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Payment Settings</h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="requiresPayment"
                                checked={form.requiresPayment}
                                onChange={handleChange}
                            />
                            <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Collect payment for this event</span>
                        </label>

                        {!!form.requiresPayment && (
                            <div style={{ marginTop: '16px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-page)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <div className="input-group" style={{ marginBottom: '20px' }}>
                                    <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Payment Provider</label>
                                    <select 
                                        name="paymentProvider" 
                                        className="input" 
                                        value={form.paymentProvider || 'dodo'} 
                                        onChange={handleChange}
                                        style={{ height: '44px', fontSize: '0.9375rem' }}
                                    >
                                        <option value="dodo">Dodo Payments (Recommended)</option>
                                        <option value="stripe">Stripe</option>
                                        <option value="razorpay">Razorpay</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="input-group">
                                        <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Currency</label>
                                        <select 
                                            name="currency" 
                                            className="input" 
                                            value={form.currency || 'USD'} 
                                            onChange={handleChange}
                                            style={{ height: '44px', fontSize: '0.9375rem' }}
                                        >
                                            {CURRENCIES.map(c => (
                                                <option key={c.code} value={c.code}>{c.label} ({c.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Price ({form.currency || 'USD'})</label>
                                        <input
                                            name="price"
                                            type="number"
                                            className="input"
                                            placeholder="0.00"
                                            value={form.price}
                                            onChange={handleChange}
                                            min={0}
                                            step="0.01"
                                            required
                                            style={{ height: '44px', fontSize: '0.9375rem' }}
                                        />
                                    </div>
                                </div>
                                
                                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                                        <strong>Note:</strong> Ensure you have connected your <strong>{form.paymentProvider === 'dodo' ? 'Dodo Payments' : form.paymentProvider === 'stripe' ? 'Stripe' : 'Razorpay'}</strong> account in the <a href="/integrations" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Integrations</a> page to receive payments.
                                    </p>
                                </div>
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
