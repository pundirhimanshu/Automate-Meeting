export default function IntegrationsPage() {
    const integrations = [
        { name: 'Google Calendar', desc: 'Two-way calendar sync', icon: '📅', connected: true },
        { name: 'Zoom', desc: 'Auto-create Zoom meetings', icon: '🎥', connected: false },
        { name: 'Microsoft Teams', desc: 'Teams meeting links', icon: '💼', connected: false },
        { name: 'Google Meet', desc: 'Google Meet integration', icon: '📹', connected: false },
        { name: 'Stripe', desc: 'Collect payments', icon: '💳', connected: false },
        { name: 'Slack', desc: 'Booking notifications', icon: '💬', connected: false },
        { name: 'Outlook', desc: 'Outlook calendar sync', icon: '📧', connected: false },
        { name: 'HubSpot', desc: 'CRM integration', icon: '🔗', connected: false },
    ];

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Integrations & Apps</h1>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {integrations.map((int) => (
                    <div key={int.name} className="card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '1.5rem' }}>{int.icon}</span>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{int.name}</div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{int.desc}</div>
                            </div>
                        </div>
                        <button className={`btn ${int.connected ? 'btn-secondary' : 'btn-primary'} btn-sm w-full`}>
                            {int.connected ? '✓ Connected' : 'Connect'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
