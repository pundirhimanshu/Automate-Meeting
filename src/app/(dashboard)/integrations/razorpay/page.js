'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function RazorpaySettings() {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        razorpayKeyId: '',
        razorpayKeySecret: '',
    });
    const [status, setStatus] = useState(null);

    useEffect(() => {
        fetch('/api/integrations/razorpay')
            .then(res => res.json())
            .then(data => {
                if (data.connected) {
                    setForm({
                        razorpayKeyId: '********', // Don't show the real key for security
                        razorpayKeySecret: '********',
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
            if (!form.razorpayKeyId.startsWith('rzp_')) {
                alert('Invalid Key ID format. It should typically start with "rzp_test_" or "rzp_live_".');
                setSaving(false);
                return;
            }
        }

        try {
            const res = await fetch('/api/integrations/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                alert('Razorpay integration saved successfully!');
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
                <h1 className="page-title">Connect Razorpay</h1>
            </div>

            <div className="card" style={{ padding: '24px' }}>
                <p style={{ marginBottom: '20px', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                    To accept payments via Razorpay, please enter your API Key Details.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                        <label>Key ID</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. rzp_test_..."
                            value={form.razorpayKeyId}
                            onChange={(e) => setForm(f => ({ ...f, razorpayKeyId: e.target.value }))}
                            required={status !== 'connected'}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            Found in Razorpay Dashboard {'>'} Settings {'>'} API Keys
                        </p>
                    </div>

                    <div className="input-group">
                        <label>Key Secret</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="Your Secret Key"
                            value={form.razorpayKeySecret}
                            onChange={(e) => setForm(f => ({ ...f, razorpayKeySecret: e.target.value }))}
                            required={status !== 'connected'}
                        />
                         <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                             Keep this secret and never share it.
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ fontSize: '0.875rem', marginBottom: '8px' }}>Webhook Setup</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            To receive automatic booking confirmations, add this Webhook URL in Razorpay Dashboard:
                        </p>
                        <div style={{ 
                            background: 'white', padding: '10px', borderRadius: '4px', 
                            fontSize: '0.8125rem', fontFamily: 'monospace', marginTop: '8px',
                            border: '1px solid var(--border-color)', overflowX: 'auto'
                        }}>
                            {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/razorpay?hostId=${session?.user?.id || ''}` : ''}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                            Events to subscribe: <b>order.paid</b>
                        </p>
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
                                    if (!confirm('Are you sure you want to disconnect Razorpay?')) return;
                                    setSaving(true);
                                    try {
                                        const res = await fetch('/api/integrations/razorpay', { method: 'DELETE' });
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
