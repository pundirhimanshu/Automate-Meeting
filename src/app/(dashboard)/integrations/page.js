import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import IntegrationButton from '@/components/IntegrationButton';

export default async function IntegrationsPage() {
    const session = await getServerSession(authOptions);
    const userIntegrations = await prisma.integration.findMany({
        where: { userId: session.user.id }
    });

    const isConnected = (provider) => userIntegrations.some(i => i.provider === provider);

    const integrations = [
        { id: 'google_calendar', name: 'Google Calendar', desc: 'Two-way calendar sync', icon: '📅', connected: isConnected('google_calendar'), connectUrl: '/api/integrations/google/connect' },
        { id: 'zoom', name: 'Zoom', desc: 'Auto-create Zoom meetings', icon: '🎥', connected: isConnected('zoom'), connectUrl: '/api/integrations/zoom/connect' },
        { id: 'teams', name: 'Microsoft Teams', desc: 'Teams meeting links', icon: '💼', connected: isConnected('teams') },
        { id: 'google_meet', name: 'Google Meet', desc: 'Google Meet integration', icon: '📹', connected: isConnected('google_calendar'), connectUrl: isConnected('google_calendar') ? null : '/api/integrations/google/connect' },
        { id: 'stripe', name: 'Stripe', desc: 'Collect payments', icon: '💳', connected: isConnected('stripe') },
        { id: 'slack', name: 'Slack', desc: 'Booking notifications', icon: '💬', connected: isConnected('slack') },
        { id: 'outlook', name: 'Outlook', desc: 'Outlook calendar sync', icon: '📧', connected: isConnected('outlook') },
        { id: 'hubspot', name: 'HubSpot', desc: 'CRM integration', icon: '🔗', connected: isConnected('hubspot') },
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
                        <IntegrationButton
                            provider={int.id}
                            connected={int.connected}
                            connectUrl={int.connectUrl}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
