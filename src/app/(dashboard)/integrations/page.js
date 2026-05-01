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
        if (provider === 'twilio') return !!user?.twilioAccountSid;
        if (provider === 'hubspot') return !!user?.hubspotRefreshToken;
        return userIntegrations.some(i => i.provider === provider);
    };

    const integrations = [
        { 
            id: 'google_calendar', 
            name: 'Google Calendar', 
            desc: 'Two-way calendar sync', 
            icon: <img src="https://s2.googleusercontent.com/s2/favicons?domain=calendar.google.com&sz=128" style={{ width: '24px', height: '24px', objectFit: 'contain' }} alt="Google Calendar" />,
            connected: isConnected('google_calendar'), 
            connectUrl: '/api/integrations/google/connect' 
        },
        { 
            id: 'google_meet', 
            name: 'Google Meet', 
            desc: 'Google Meet connection', 
            icon: <img src="https://s2.googleusercontent.com/s2/favicons?domain=meet.google.com&sz=128" style={{ width: '24px', height: '24px', objectFit: 'contain' }} alt="Google Meet" />,
            connected: isConnected('google_calendar'), 
            connectUrl: isConnected('google_calendar') ? null : '/api/integrations/google/connect' 
        },
        {
            id: 'gmail',
            name: 'Gmail',
            desc: isConnected('gmail')
                ? `Connected: ${userIntegrations.find(i => i.provider === 'gmail')?.email || 'Connected'}`
                : 'Send workflow emails',
            icon: <img src="https://www.vectorlogo.zone/logos/gmail/gmail-icon.svg" style={{ width: '28px', height: '28px', objectFit: 'contain' }} alt="Gmail" />,
            connected: isConnected('gmail'),
            connectUrl: '/api/integrations/gmail/connect'
        },
        { 
            id: 'zoom', 
            name: 'Zoom', 
            desc: 'Auto-create Zoom meetings', 
            icon: <img src="https://www.vectorlogo.zone/logos/zoomus/zoomus-icon.svg" style={{ width: '28px', height: '28px', objectFit: 'contain' }} alt="Zoom" />,
            connected: isConnected('zoom'), 
            connectUrl: '/api/integrations/zoom/connect', 
            requiresPlan: 'pro' 
        },
        { 
            id: 'dodo', 
            name: 'Dodo Payments', 
            desc: 'Accept payments directly', 
            icon: <img src="https://s2.googleusercontent.com/s2/favicons?domain=dodopayments.com&sz=128" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px' }} alt="Dodo Payments" />,
            connected: isConnected('dodo'), 
            connectUrl: '/integrations/dodo' 
        },
        { 
            id: 'razorpay', 
            name: 'Razorpay', 
            desc: 'Accept payments via UPI, Card', 
            icon: <img src="https://s2.googleusercontent.com/s2/favicons?domain=razorpay.com&sz=128" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px' }} alt="Razorpay" />,
            connected: isConnected('razorpay'), 
            connectUrl: '/integrations/razorpay' 
        },
        { 
            id: 'stripe', 
            name: 'Stripe', 
            desc: 'Accept payments globally', 
            icon: <img src="https://www.vectorlogo.zone/logos/stripe/stripe-icon.svg" style={{ width: '28px', height: '28px', objectFit: 'contain' }} alt="Stripe" />,
            connected: isConnected('stripe'), 
            connectUrl: '/integrations/stripe' 
        },
        { 
            id: 'slack', 
            name: 'Slack', 
            desc: 'Booking notifications', 
            icon: <img src="https://www.vectorlogo.zone/logos/slack/slack-icon.svg" style={{ width: '28px', height: '28px', objectFit: 'contain' }} alt="Slack" />,
            connected: isConnected('slack'), 
            connectUrl: '/api/integrations/slack/connect' 
        },
        { 
            id: 'webhooks', 
            name: 'Pabbly / Webhooks', 
            desc: 'Automate with 1000+ apps', 
            icon: <img src="https://s2.googleusercontent.com/s2/favicons?domain=pabbly.com&sz=128" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px' }} alt="Pabbly" />,
            connected: !!user?.webhookUrl, 
            connectUrl: '/integrations/webhooks' 
        },
        { 
            id: 'twilio', 
            name: 'Twilio SMS', 
            desc: 'SMS booking notifications', 
            icon: <img src="https://www.vectorlogo.zone/logos/twilio/twilio-icon.svg" style={{ width: '28px', height: '28px', objectFit: 'contain' }} alt="Twilio" />,
            connected: isConnected('twilio'), 
            connectUrl: '/integrations/twilio' 
        },
        { 
            id: 'hubspot', 
            name: 'HubSpot', 
            desc: 'Sync contacts & meetings', 
            icon: <img src="https://www.vectorlogo.zone/logos/hubspot/hubspot-icon.svg" style={{ width: '28px', height: '28px', objectFit: 'contain' }} alt="HubSpot" />,
            connected: isConnected('hubspot'), 
            connectUrl: '/api/integrations/hubspot/connect' 
        },
    ];

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '40px' }}>
                <h1 className="page-title" style={{ fontFamily: 'Inria Serif, serif', fontStyle: 'italic', fontWeight: '700', fontSize: '2rem' }}>Integrations & Apps</h1>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {integrations.map((int) => {
                    const lockedByPlan = int.requiresPlan && !['pro', 'enterprise'].includes(userPlan);
                    return (
                        <div key={int.name} className="card" style={{ padding: '20px', opacity: (int.comingSoon || lockedByPlan) ? 0.7 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>
                                    {int.icon}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{int.name}</span>
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
