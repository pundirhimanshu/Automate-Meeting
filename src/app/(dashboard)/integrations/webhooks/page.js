'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WebhooksPage() {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const router = useRouter();

    const ALL_EVENTS = [
        { id: 'booking.confirmed', label: 'Booking Confirmed' },
        { id: 'booking.cancelled', label: 'Booking Cancelled' },
        { id: 'booking.rescheduled', label: 'Booking Rescheduled' }
    ];

    useEffect(() => {
        fetch('/api/user/webhook')
            .then(res => res.json())
            .then(data => {
                setWebhookUrl(data.webhookUrl || '');
                setSelectedEvents(data.webhookEvents ? data.webhookEvents.split(',') : ALL_EVENTS.map(e => e.id));
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load webhook URL:', err);
                setLoading(false);
            });
    }, []);

    const toggleEvent = (eventId) => {
        setSelectedEvents(prev => 
            prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]
        );
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const res = await fetch('/api/user/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    webhookUrl, 
                    webhookEvents: selectedEvents.join(',') 
                })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: 'Settings saved successfully!', type: 'success' });
                router.refresh();
            } else {
                setMessage({ text: data.error || 'Failed to save settings', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'A network error occurred', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!webhookUrl) {
            setMessage({ text: 'Please enter a Webhook URL first', type: 'error' });
            return;
        }

        setTesting(true);
        setMessage({ text: 'Sending test payload to Pabbly...', type: 'info' });

        try {
            const res = await fetch('/api/user/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ webhookUrl, test: true })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: 'Test booking sent! Check your Pabbly dashboard.', type: 'success' });
            } else {
                setMessage({ text: data.error || 'Test failed', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Failed to reach the webhook server', type: 'error' });
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return <div className="p-8">Loading settings...</div>;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Link href="/integrations" className="btn btn-secondary" style={{ padding: '8px 12px' }}>
                    ← Back
                </Link>
                <h1 className="page-title">Pabbly & Webhooks</h1>
            </div>

            <div className="card" style={{ padding: '32px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Setup Webhook</h2>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        Connect your app with Pabbly Connect, Zapier, or any custom automation tool using webhooks.
                    </p>
                </div>

                <form onSubmit={handleSave}>
                    <div className="input-group" style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>
                            Your Webhook URL (from Pabbly)
                        </label>
                        <input
                            className="input"
                            type="url"
                            placeholder="https://connect.pabbly.com/webhook/..."
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            style={{ height: '48px', fontSize: '1rem' }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                            We will send a POST request with booking details to this URL whenever an event occurs.
                        </p>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9375rem', marginBottom: '12px' }}>
                            Events to trigger
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {ALL_EVENTS.map(event => (
                                <label key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9375rem' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedEvents.includes(event.id)}
                                        onChange={() => toggleEvent(event.id)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span>{event.label}</span>
                                </label>
                            ))}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '10px' }}>
                            Selective triggers help reduce noise by only sending data for the events you care about.
                        </p>
                    </div>

                    {message.text && (
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '24px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            backgroundColor: message.type === 'success' ? '#ecfdf5' : (message.type === 'error' ? '#fef2f2' : '#eff6ff'),
                            color: message.type === 'success' ? '#065f46' : (message.type === 'error' ? '#991b1b' : '#1e40af'),
                            border: `1px solid ${message.type === 'success' ? '#10b981' : (message.type === 'error' ? '#ef4444' : '#3b82f6')}`
                        }}>
                            {message.text}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{ flex: 1, height: '44px' }}
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleTest}
                            disabled={testing || !webhookUrl}
                            style={{ flex: 1, height: '44px' }}
                        >
                            {testing ? 'Testing...' : 'Send Test Data'}
                        </button>
                    </div>
                </form>

                <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                <div className="info-box" style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        Payload Structure
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        Below is an example of the data structure we send to your webhook:
                    </p>
                    <pre style={{
                        background: '#1e293b',
                        color: '#f8fafc',
                        padding: '16px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        overflowX: 'auto'
                    }}>
{`{
  "event": "booking.confirmed",
  "timestamp": "2024-04-17T12:00:00Z",
  "data": {
    "bookingId": "uuid-string",
    "eventTitle": "Discovery Call",
    "inviteeName": "John Doe",
    "inviteeEmail": "john@example.com",
    "startTime": "2024-04-20T10:00:00Z",
    "location": "Google Meet",
    "notes": "Looking forward to it!"
  }
}`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
