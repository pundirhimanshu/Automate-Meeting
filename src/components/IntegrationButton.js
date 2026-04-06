'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function IntegrationButton({ provider, connected, connectUrl }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDisconnect = async () => {
        if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;
        setLoading(true);
        try {
            let disconnectPath = `/api/integrations/${provider}/disconnect`;
            let method = 'POST';

            if (provider === 'google_calendar' || provider === 'google_meet') {
                disconnectPath = '/api/integrations/google/disconnect';
            } else if (provider === 'dodo' || provider === 'razorpay') {
                disconnectPath = `/api/integrations/${provider}`;
                method = 'DELETE';
            }

            const res = await fetch(disconnectPath, { method });
            if (res.ok) {
                router.refresh();
            } else {
                alert('Failed to disconnect');
            }
        } catch (e) {
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (connected) {
        return (
            <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} disabled>
                    ✓ Connected
                </button>
                <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--error)' }}
                    onClick={handleDisconnect}
                    disabled={loading}
                >
                    {loading ? '...' : 'Disconnect'}
                </button>
            </div>
        );
    }

    if (connectUrl) {
        return (
            <a href={connectUrl} className="btn btn-primary btn-sm w-full" style={{ textAlign: 'center', display: 'block' }}>
                Connect
            </a>
        );
    }

    return (
        <button className="btn btn-primary btn-sm w-full" disabled>
            Connect
        </button>
    );
}
