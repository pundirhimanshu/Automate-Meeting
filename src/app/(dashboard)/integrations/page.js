import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import IntegrationButton from '@/components/IntegrationButton';
import { getUserSubscription } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
    const session = await getServerSession(authOptions);
    const [userIntegrations, { plan: userPlan }, user] = await Promise.all([
        prisma.integration.findMany({ where: { userId: session.user.id } }),
        getUserSubscription(session.user.id),
        prisma.user.findUnique({ where: { id: session.user.id } }),
    ]);
    const isConnected = (provider) => {
        if (provider === 'dodo') return !!user?.dodoApiKey;
        if (provider === 'razorpay') return !!user?.razorpayKeyId;
        if (provider === 'stripe') return !!(user?.stripeAccountId || user?.stripeSecretKey);
        return userIntegrations.some(i => i.provider === provider);
    };

    const integrations = [
        { 
            id: 'google_calendar', 
            name: 'Google Calendar', 
            desc: 'Two-way calendar sync', 
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="#4285F4" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                    <path fill="#FBBC05" d="M11 10H7v4h4v-4z"/>
                </svg>
            ),
            connected: isConnected('google_calendar'), 
            connectUrl: '/api/integrations/google/connect' 
        },
        { 
            id: 'google_meet', 
            name: 'Google Meet', 
            desc: 'Google Meet integration', 
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="#00AA47" d="M16 10v-3.5c0-.83-.67-1.5-1.5-1.5h-10c-.83 0-1.5.67-1.5 1.5v9c0 .83.67 1.5 1.5 1.5h10c.83 0 1.5-.67 1.5-1.5v-3.5l4 4v-11l-4 4z"/>
                </svg>
            ),
            connected: isConnected('google_calendar'), 
            connectUrl: isConnected('google_calendar') ? null : '/api/integrations/google/connect' 
        },
        {
            id: 'gmail',
            name: 'Gmail',
            desc: isConnected('gmail')
                ? `Connected: ${userIntegrations.find(i => i.provider === 'gmail')?.email || 'Connected'}`
                : 'Send workflow emails from your Gmail',
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="#EA4335" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
            ),
            connected: isConnected('gmail'),
            connectUrl: '/api/integrations/gmail/connect'
        },
        { 
            id: 'zoom', 
            name: 'Zoom', 
            desc: 'Auto-create Zoom meetings', 
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#2D8CFF">
                    <path d="M16 10v-3.5c0-.83-.67-1.5-1.5-1.5h-10c-.83 0-1.5.67-1.5 1.5v9c0 .83.67 1.5 1.5 1.5h10c.83 0 1.5-.67 1.5-1.5v-3.5l4 4v-11l-4 4z"/>
                </svg>
            ),
            connected: isConnected('zoom'), 
            connectUrl: '/api/integrations/zoom/connect', 
            requiresPlan: 'pro' 
        },
        { 
            id: 'dodo', 
            name: 'Dodo Payments', 
            desc: 'Accept payments directly', 
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#FF9500">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
            ),
            connected: isConnected('dodo'), 
            connectUrl: '/integrations/dodo' 
        },
        { 
            id: 'razorpay', 
            name: 'Razorpay', 
            desc: 'Accept payments via UPI, Card, Netbanking', 
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#02042B">
                    <path d="M18.5 7.5L12 11 5.5 7.5 12 4l6.5 3.5zM20 18.5L13.5 15l6.5-3.5v7zM4 18.5V11.5L10.5 15l-6.5 3.5z"/>
                </svg>
            ),
            connected: isConnected('razorpay'), 
            connectUrl: '/integrations/razorpay' 
        },
        { 
            id: 'stripe', 
            name: 'Stripe', 
            desc: 'Accept payments via cards globally', 
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#635BFF">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 6h16v2H4V6zm0 12v-8h16v8H4z"/>
                </svg>
            ),
            connected: isConnected('stripe'), 
            connectUrl: '/integrations/stripe' 
        },
        { 
            id: 'slack', 
            name: 'Slack', 
            desc: 'Booking notifications', 
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="#36C5F0" d="M6 12a1.5 1.5 0 01-1.5 1.5h-1V15a1.5 1.5 0 01-3 0V9a1.5 1.5 0 011.5-1.5h1V6a1.5 1.5 0 013 0v6z"/>
                    <path fill="#2EB67D" d="M12 6a1.5 1.5 0 011.5-1.5h1V3a1.5 1.5 0 010-3h-6a1.5 1.5 0 01-1.5 1.5v1h-1.5a1.5 1.5 0 110-3v6z"/>
                    <path fill="#ECB22E" d="M18 12a1.5 1.5 0 011.5-1.5h1V9a1.5 1.5 0 013 0v6a1.5 1.5 0 01-1.5 1.5h-1v1.5a1.5 1.5 0 11-3 0v-6z"/>
                    <path fill="#E01E5A" d="M12 18a1.5 1.5 0 01-1.5 1.5h-1V21a1.5 1.5 0 110 3h6a1.5 1.5 0 011.5-1.5v-1h1.5a1.5 1.5 0 110 3v-6z"/>
                </svg>
            ),
            connected: isConnected('slack'), 
            connectUrl: '/api/integrations/slack/connect' 
        },
        { 
            id: 'webhooks', 
            name: 'Pabbly / Webhooks', 
            desc: 'Automate with 1000+ apps', 
            icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#0069ff">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
            ),
            connected: !!user?.webhookUrl, 
            connectUrl: '/integrations/webhooks' 
        },
    ];

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Integrations & Apps</h1>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {integrations.map((int) => {
                    const lockedByPlan = int.requiresPlan && !['pro', 'enterprise'].includes(userPlan);
                    return (
                        <div key={int.name} className="card" style={{ padding: '20px', opacity: (int.comingSoon || lockedByPlan) ? 0.7 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '1.5rem' }}>{int.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{int.name}</span>
                                        {int.comingSoon && (
                                            <span style={{
                                                fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase',
                                                letterSpacing: '0.5px', padding: '2px 8px', borderRadius: '10px',
                                                background: 'var(--primary)', color: '#fff',
                                            }}>Coming Soon</span>
                                        )}
                                        {lockedByPlan && (
                                            <span style={{
                                                fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase',
                                                letterSpacing: '0.5px', padding: '2px 8px', borderRadius: '10px',
                                                background: '#f59e0b', color: '#fff',
                                            }}>Pro</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{int.desc}</div>
                                </div>
                            </div>
                            {int.comingSoon ? (
                                <button className="btn btn-secondary btn-sm w-full" disabled style={{ cursor: 'not-allowed' }}>
                                    Coming Soon
                                </button>
                            ) : lockedByPlan ? (
                                <a href="/subscription" className="btn btn-sm w-full" style={{
                                    display: 'block', textAlign: 'center', textDecoration: 'none',
                                    background: '#f59e0b', color: '#fff', borderRadius: '8px', padding: '8px',
                                    fontWeight: 600, fontSize: '0.8125rem',
                                }}>
                                    Upgrade to Pro
                                </a>
                            ) : (
                                <IntegrationButton
                                    provider={int.id}
                                    connected={int.connected}
                                    connectUrl={int.connectUrl}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
