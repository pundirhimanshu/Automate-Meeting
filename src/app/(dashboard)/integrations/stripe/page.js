'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Suspense } from 'react';

function StripeSettingsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState('connect'); // 'connect' or 'keys'
    const [status, setStatus] = useState(null); // { connected, connectMethod, stripeAccountId }
    const [form, setForm] = useState({ stripeSecretKey: '', stripeWebhookSecret: '' });
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchStatus();
        if (searchParams.get('success') === 'true') {
            setMessage({ type: 'success', text: 'Stripe connected successfully!' });
        } else if (searchParams.get('error')) {
            setMessage({ type: 'error', text: `Connection error: ${searchParams.get('error')}` });
        }
    }, [searchParams]);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/integrations/stripe');
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
                if (data.connectMethod === 'connect') setTab('connect');
                else if (data.connectMethod === 'keys') setTab('keys');
            }
        } catch (e) { }
        finally { setLoading(false); }
    };

    const handleSaveKeys = async (e) => {
        e.preventDefault();
        if (status?.connectMethod !== 'keys' && !form.stripeSecretKey.startsWith('sk_')) {
            alert('Secret key should start with "sk_test_" or "sk_live_"');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/integrations/stripe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Stripe API keys saved!' });
                fetchStatus();
            } else {
                alert('Failed to save');
            }
        } catch (e) { alert('Error'); }
        finally { setSaving(false); }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect Stripe?')) return;
        setSaving(true);
        try {
            const res = await fetch('/api/integrations/stripe/disconnect', { method: 'POST' });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Disconnected successfully' });
                setStatus({ connected: false, connectMethod: null });
                setForm({ stripeSecretKey: '', stripeWebhookSecret: '' });
            }
        } catch (e) { alert('Error'); }
        finally { setSaving(false); }
    };

    if (loading) return <div style={{ padding: '60px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

    return (
        <div style={{ maxWidth: '600px' }}>
            <div className="page-header">
                <div style={{ marginBottom: '8px' }}>
                    <Link href="/integrations" style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none' }}>← Back to Integrations</Link>
                </div>
                <h1 className="page-title">Connect Stripe</h1>
            </div>

            {message && (
                <div style={{
                    padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                    background: message.type === 'success' ? '#e8f5e9' : '#fbe9e7',
                    color: message.type === 'success' ? '#2e7d32' : '#c62828',
                    fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                </div>
            )}

            {/* Manual Keys Only */}
            <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '10px', fontSize: '1rem' }}>🔑 Manual API Keys</h3>
                <p style={{ marginBottom: '20px', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                    Enter your Stripe API keys directly. Find them in your <a href="https://dashboard.stripe.com/apikeys" target="_blank" style={{ color: 'var(--primary)' }}>Stripe Dashboard</a>.
                </p>

                <form onSubmit={handleSaveKeys} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                        <label>Secret Key</label>
                        <input
                            type="text" className="input"
                            placeholder={status?.connectMethod === 'keys' ? '********' : 'sk_test_...'}
                            value={form.stripeSecretKey}
                            onChange={(e) => setForm(f => ({ ...f, stripeSecretKey: e.target.value }))}
                            required={status?.connectMethod !== 'keys'}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            Found in Stripe Dashboard {'>'} Developers {'>'} API Keys
                        </p>
                    </div>

                    <div className="input-group">
                        <label>Webhook Secret (Optional)</label>
                        <input
                            type="text" className="input"
                            placeholder={status?.connectMethod === 'keys' ? '********' : 'whsec_...'}
                            value={form.stripeWebhookSecret}
                            onChange={(e) => setForm(f => ({ ...f, stripeWebhookSecret: e.target.value }))}
                        />
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ fontSize: '0.875rem', marginBottom: '8px' }}>Webhook Setup</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            In your Stripe Dashboard, add this Webhook URL:
                        </p>
                        <div style={{
                            background: 'white', padding: '10px', borderRadius: '4px',
                            fontSize: '0.8125rem', fontFamily: 'monospace', marginTop: '8px',
                            border: '1px solid var(--border-color)', overflowX: 'auto'
                        }}>
                            {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/stripe` : ''}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                            {saving ? 'Saving...' : 'Save Keys'}
                        </button>
                        {status?.connected && (
                            <button type="button" className="btn btn-outline" onClick={handleDisconnect} disabled={saving}
                                style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}>
                                Disconnect
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function StripeSettingsPage() {
    return (
        <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>}>
            <StripeSettingsContent />
        </Suspense>
    );
}
