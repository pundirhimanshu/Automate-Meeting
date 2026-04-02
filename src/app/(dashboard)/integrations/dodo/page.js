'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function DodoSettings() {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        dodoApiKey: '',
        dodoWebhookSecret: '',
    });
    const [status, setStatus] = useState(null);

    useEffect(() => {
        fetch('/api/integrations/dodo')
            .then(res => res.json())
            .then(data => {
                if (data.connected) {
                    setForm({
                        dodoApiKey: '********', // Don't show the real key for security
                        dodoWebhookSecret: '********',
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
        if (status !== 'connected') {
            if (!form.dodoApiKey.startsWith('dp_live_') && !form.dodoApiKey.startsWith('dp_test_')) {
                alert('Invalid API Key format. It should start with "dp_live_" or "dp_test_".');
                setSaving(false);
                return;
            }
            if (!form.dodoWebhookSecret.startsWith('whsec_')) {
                alert('Invalid Webhook Secret format. It should start with "whsec_".');
                setSaving(false);
                return;
            }
        }

        try {
            const res = await fetch('/api/integrations/dodo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                alert('Dodo Payments integration saved successfully!');
                router.push('/integrations');
            } else {
                alert('Failed to save integration');
            }
        } catch (e) {
            alert('An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '600px' }}>
            <div className="page-header">
                <div style={{ marginBottom: '8px' }}>
                    <Link href="/integrations" style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none' }}>
                        ← Back to Integrations
                    </Link>
                </div>
                <h1 className="page-title">Connect Dodo Payments</h1>
            </div>

            <div className="card" style={{ padding: '24px' }}>
                <p style={{ marginBottom: '20px', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                    To accept payments directly into your account, please enter your Dodo Payments API details.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                        <label>Live API Key</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. dp_live_..."
                            value={form.dodoApiKey}
                            onChange={(e) => setForm(f => ({ ...f, dodoApiKey: e.target.value }))}
                            required={status !== 'connected'}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            Found in Dodo Dashboard {'>'} Developers {'>'} API Keys
                        </p>
                    </div>

                    <div className="input-group">
                        <label>Webhook Secret</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. whsec_..."
                            value={form.dodoWebhookSecret}
                            onChange={(e) => setForm(f => ({ ...f, dodoWebhookSecret: e.target.value }))}
                            required={status !== 'connected'}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                             Needed to verify payments. Enter your hostId if prompted.
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ fontSize: '0.875rem', marginBottom: '8px' }}>Webhook Setup</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            In your Dodo Dashboard, add this Webhook URL:
                        </p>
                        <div style={{ 
                            background: 'white', padding: '10px', borderRadius: '4px', 
                            fontSize: '0.8125rem', fontFamily: 'monospace', marginTop: '8px',
                            border: '1px solid var(--border-color)', overflowX: 'auto'
                        }}>
                            {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/dodo?hostId=${session?.user?.id || ''}` : ''}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                            {saving ? 'Saving...' : 'Save Integration'}
                        </button>
                        {status === 'connected' && (
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={async () => {
                                    if (!confirm('Are you sure you want to disconnect Dodo Payments?')) return;
                                    setSaving(true);
                                    try {
                                        const res = await fetch('/api/integrations/dodo', { method: 'DELETE' });
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
                                style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}
                            >
                                Disconnect
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
