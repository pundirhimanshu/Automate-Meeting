'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function TwilioSettings() {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [form, setForm] = useState({
        twilioAccountSid: '',
        twilioAuthToken: '',
        twilioPhoneNumber: '',
    });
    const [status, setStatus] = useState(null);

    useEffect(() => {
        fetch('/api/integrations/twilio')
            .then(res => res.json())
            .then(data => {
                if (data.connected) {
                    setForm({
                        twilioAccountSid: '********',
                        twilioAuthToken: '********',
                        twilioPhoneNumber: data.twilioPhoneNumber || '',
                    });
                    setStatus('connected');
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            const res = await fetch('/api/integrations/twilio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                alert('Twilio integration saved successfully!');
                router.push('/integrations');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save integration');
            }
        } catch (e) {
            alert('An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!testPhone) {
            alert('Please enter a phone number to send a test SMS.');
            return;
        }
        setTesting(true);
        try {
            const res = await fetch('/api/integrations/twilio/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testPhoneNumber: testPhone }),
            });
            if (res.ok) {
                alert('Test SMS sent successfully! Please check your phone.');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to send test SMS');
            }
        } catch (e) {
            alert('An error occurred during testing');
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div style={{ maxWidth: '600px', padding: '24px' }}>
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '8px' }}>
                    <Link href="/integrations" style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                        Back to Integrations
                    </Link>
                </div>
                <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Connect Twilio SMS</h1>
            </div>

            <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <img src="https://www.vectorlogo.zone/logos/twilio/twilio-icon.svg" style={{ width: '40px', height: '40px' }} alt="Twilio" />
                    <div>
                        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: 0 }}>
                            Send automated SMS notifications for your bookings.
                        </p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: 0 }}>
                            Each user connects their own Twilio account.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Account SID</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            value={form.twilioAccountSid}
                            onChange={(e) => setForm(f => ({ ...f, twilioAccountSid: e.target.value }))}
                            required={status !== 'connected'}
                        />
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Auth Token</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="Your Twilio Auth Token"
                            value={form.twilioAuthToken}
                            onChange={(e) => setForm(f => ({ ...f, twilioAuthToken: e.target.value }))}
                            required={status !== 'connected'}
                        />
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Twilio Phone Number</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. +1234567890"
                            value={form.twilioPhoneNumber}
                            onChange={(e) => setForm(f => ({ ...f, twilioPhoneNumber: e.target.value }))}
                            required={status !== 'connected'}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            The sender phone number from your Twilio Console.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, height: '42px' }}>
                            {saving ? 'Saving...' : 'Save Integration'}
                        </button>
                        {status === 'connected' && (
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={async () => {
                                    if (!confirm('Are you sure you want to disconnect Twilio?')) return;
                                    setSaving(true);
                                    try {
                                        const res = await fetch('/api/integrations/twilio', { method: 'DELETE' });
                                        if (res.ok) {
                                            alert('Disconnected successfully');
                                            router.refresh();
                                            window.location.reload();
                                        } else {
                                            alert('Failed to disconnect');
                                        }
                                    } catch (e) {
                                        alert('An error occurred');
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444', height: '42px' }}
                            >
                                Disconnect
                            </button>
                        )}
                    </div>
                </form>

                {status === 'connected' && (
                    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Test Integration</h3>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Send a test SMS to verify your connection.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Recipient phone (e.g. +91...)"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={handleTest}
                                disabled={testing}
                            >
                                {testing ? 'Sending...' : 'Send Test'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                    Where to find your credentials?
                </h4>
                <ol style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', paddingLeft: '20px', margin: 0 }}>
                    <li style={{ marginBottom: '4px' }}>Log in to your <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Twilio Console</a>.</li>
                    <li style={{ marginBottom: '4px' }}>Find <b>Account SID</b> and <b>Auth Token</b> on the main dashboard.</li>
                    <li>Copy your <b>Twilio Phone Number</b> from the Active Numbers section.</li>
                </ol>
            </div>
        </div>
    );
}
