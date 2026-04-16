'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const TRIGGERS = [
    { label: 'Before event starts', value: 'BEFORE_EVENT', hasTime: true },
    { label: 'After event ends', value: 'AFTER_EVENT', hasTime: true },
    { label: 'New event booked', value: 'EVENT_BOOKED', hasTime: false },
    { label: 'Event canceled', value: 'EVENT_CANCELED', hasTime: false },
    { label: 'Event rescheduled', value: 'EVENT_RESCHEDULED', hasTime: false },
];

const ACTION_TYPES = [
    { label: 'Send Email', value: 'SEND_EMAIL', icon: '✉️' },
    { label: 'Send Slack Message', value: 'SEND_SLACK_MESSAGE', icon: '💬' },
];

const RECIPIENT_TYPES = [
    { label: 'Host', value: 'HOST' },
    { label: 'Invitee', value: 'INVITEE' },
];

const VARIABLES = [
    'Event Name', 'Invitee Full Name', 'Event Time', 'Event Date',
    'Location', 'Event Description', 'Questions And Answers', 'Host Full Name', 'Review Link'
];

function CreateWorkflowContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dropdownRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [eventTypes, setEventTypes] = useState([]);

    // Workflow state
    const [name, setName] = useState('');
    const [selectedEventTypes, setSelectedEventTypes] = useState(['ALL']);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Trigger
    const [trigger, setTrigger] = useState('');
    const [timeValue, setTimeValue] = useState(24);
    const [timeUnit, setTimeUnit] = useState('HOURS');

    // Actions & Recipients
    const [selectedActions, setSelectedActions] = useState(['SEND_EMAIL']);
    const [selectedRecipients, setSelectedRecipients] = useState(['HOST']);
    
    // Content
    const [sender, setSender] = useState('system');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    // Connectors
    const [gmailConnected, setGmailConnected] = useState(false);
    const [slackConnected, setSlackConnected] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    // Pre-fill from template
    useEffect(() => {
        const templateId = searchParams.get('template');
        if (templateId) {
            if (templateId === 'remind_host') {
                setName('Email reminder to host');
                setTrigger('BEFORE_EVENT');
                setSelectedActions(['SEND_EMAIL']);
                setSelectedRecipients(['HOST']);
                setSubject('Reminder: {{Event Name}} with {{Invitee Full Name}} at {{Event Time}} on {{Event Date}}');
                setBody('Hi {{Host Full Name}},\n\nThis is a friendly reminder that your {{Event Name}} with {{Invitee Full Name}} is at {{Event Time}} on {{Event Date}}.\n\n{{Location}}\n{{Event Description}}\n{{Questions And Answers}}');
            } else if (templateId === 'remind_invitee') {
                setName('Email reminder to invitee');
                setTrigger('BEFORE_EVENT');
                setSelectedActions(['SEND_EMAIL']);
                setSelectedRecipients(['INVITEE']);
                setSubject('Reminder: Your upcoming meeting with {{Host Full Name}}');
                setBody('Hi {{Invitee Full Name}},\n\nThis is a reminder for your upcoming {{Event Name}} with {{Host Full Name}} at {{Event Time}} on {{Event Date}}.\n\n{{Location}}');
            } else if (templateId === 'thank_you') {
                setName('Send thank you email');
                setTrigger('AFTER_EVENT');
                setSelectedActions(['SEND_EMAIL']);
                setSelectedRecipients(['INVITEE']);
                setTimeValue(2);
                setTimeUnit('HOURS');
                setSubject('Thank you for meeting with {{Host Full Name}}');
                setBody('Hi {{Invitee Full Name}},\n\nThanks for taking the time to meet today! It was great connecting with you.\n\nBest,\n{{Host Full Name}}');
            }
        }
    }, [searchParams]);

    useEffect(() => {
        fetchEventTypes();
        fetchIntegrations();
    }, []);

    const fetchEventTypes = async () => {
        const res = await fetch('/api/event-types');
        if (res.ok) {
            const data = await res.json();
            setEventTypes(data.eventTypes || []);
        }
    };

    const fetchIntegrations = async () => {
        const res = await fetch('/api/user');
        if (res.ok) {
            const data = await res.json();
            const gmailInt = data.integrations?.find(i => i.provider === 'gmail');
            if (gmailInt) {
                setGmailConnected(true);
                setUserEmail(gmailInt.email || data.user?.email || '');
            } else {
                setGmailConnected(false);
                setUserEmail('');
            }
            setSlackConnected(data.integrations?.some(i => i.provider === 'slack'));
        }
    };

    const toggleAction = (val) => {
        if (selectedActions.includes(val)) {
            setSelectedActions(selectedActions.filter(a => a !== val));
        } else {
            setSelectedActions([...selectedActions, val]);
        }
    };

    const toggleRecipient = (val) => {
        if (selectedRecipients.includes(val)) {
            setSelectedRecipients(selectedRecipients.filter(r => r !== val));
        } else {
            setSelectedRecipients([...selectedRecipients, val]);
        }
    };

    const insertVariable = (field, variable) => {
        const val = `{{${variable}}}`;
        if (field === 'subject') setSubject(s => s + val);
        if (field === 'body') setBody(b => b + val);
    };

    const handleSave = async () => {
        if (selectedActions.length === 0) {
            alert('Please select at least one action.');
            return;
        }
        if (selectedActions.includes('SEND_EMAIL') && selectedRecipients.length === 0) {
            alert('Please select at least one recipient for the email.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    trigger,
                    timeValue: TRIGGERS.find(t => t.value === trigger)?.hasTime ? parseInt(timeValue) : null,
                    timeUnit: TRIGGERS.find(t => t.value === trigger)?.hasTime ? timeUnit : null,
                    action: selectedActions,
                    sendTo: selectedRecipients,
                    senderEmail: sender,
                    subject: subject || 'New Notification',
                    body,
                    eventTypes: selectedEventTypes,
                })
            });

            if (res.ok) {
                router.push('/workflows');
            } else {
                const errorData = await res.json();
                alert(`Failed to save workflow: ${errorData.details || 'Unknown server error'}`);
            }
        } catch (e) {
            console.error(e);
            alert('A network error occurred while saving.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1 className="page-title">Create a workflow</h1>
            </div>

            <div className="card" style={{ padding: '24px', marginBottom: '24px', position: 'relative', zIndex: isDropdownOpen ? 100 : 1, overflow: 'visible' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="input-group">
                        <label>Workflow name</label>
                        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Email reminder to host" />
                    </div>
                    <div className="input-group" ref={dropdownRef} style={{ position: 'relative' }}>
                        <label>Which event types will this apply to?</label>
                        <div
                            className="input"
                            style={{
                                cursor: 'pointer',
                                minHeight: '42px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--bg-white)',
                                padding: '8px 12px',
                                border: isDropdownOpen ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                boxShadow: isDropdownOpen ? '0 0 0 4px var(--primary-light)' : 'none',
                                transition: 'all 0.2s ease',
                                borderRadius: 'var(--radius-md)'
                            }}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {selectedEventTypes.includes('ALL')
                                    ? 'All Current and Future Event Types'
                                    : selectedEventTypes.length === 0
                                        ? 'Select event types...'
                                        : `${selectedEventTypes.length} event types selected`}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </span>
                        </div>

                        {isDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                left: 0,
                                right: 0,
                                background: '#ffffff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                zIndex: 1000,
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                padding: '16px',
                            }}>
                                <div style={{ position: 'relative', marginBottom: '12px' }}>
                                    <input
                                        className="input"
                                        placeholder="Search event types..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        style={{ height: '36px', fontSize: '0.875rem' }}
                                    />
                                </div>
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedEventTypes.includes('ALL')}
                                            onChange={() => setSelectedEventTypes(selectedEventTypes.includes('ALL') ? [] : ['ALL'])}
                                        />
                                        <span style={{ fontSize: '0.875rem' }}>All Event Types</span>
                                    </label>
                                    {eventTypes
                                        .filter(et => et.title.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(et => (
                                            <label key={et.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedEventTypes.includes(et.id)}
                                                    onChange={() => {
                                                        const isAll = selectedEventTypes.includes('ALL');
                                                        const clean = isAll ? [] : [...selectedEventTypes];
                                                        if (clean.includes(et.id)) {
                                                            setSelectedEventTypes(clean.filter(id => id !== et.id));
                                                        } else {
                                                            setSelectedEventTypes([...clean, et.id]);
                                                        }
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.875rem' }}>{et.title}</span>
                                            </label>
                                        ))
                                    }
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => setIsDropdownOpen(false)}>Apply</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>When this happens</h2>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    {TRIGGERS.find(t => t.value === trigger)?.hasTime && (
                        <>
                            <input type="number" className="input" style={{ width: '80px' }} value={timeValue} onChange={e => setTimeValue(e.target.value)} />
                            <select className="input" style={{ width: '120px' }} value={timeUnit} onChange={e => setTimeUnit(e.target.value)}>
                                <option value="MINUTES">Minutes</option>
                                <option value="HOURS">Hours</option>
                                <option value="DAYS">Days</option>
                            </select>
                        </>
                    )}
                    <select className="input" style={{ flex: 1 }} value={trigger} onChange={e => setTrigger(e.target.value)}>
                        <option value="" disabled>Select trigger...</option>
                        {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Do these actions</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    {ACTION_TYPES.map(a => (
                        <div 
                            key={a.value} 
                            onClick={() => toggleAction(a.value)}
                            style={{
                                padding: '16px',
                                borderRadius: '12px',
                                border: selectedActions.includes(a.value) ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                background: selectedActions.includes(a.value) ? 'var(--primary-light)' : 'var(--bg-white)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{a.icon}</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{a.label}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {selectedActions.includes('SEND_EMAIL') && (
                    <div style={{ marginTop: '24px', padding: '20px', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px' }}>Email Settings</h3>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Send to</label>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                {RECIPIENT_TYPES.map(r => (
                                    <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={selectedRecipients.includes(r.value)} onChange={() => toggleRecipient(r.value)} />
                                        <span style={{ fontSize: '0.875rem' }}>{r.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="input-group" style={{ marginBottom: '20px' }}>
                            <label>Send from</label>
                            <select className="input" value={sender} onChange={e => setSender(e.target.value)}>
                                <option value="system">System Default (Automate Meetings)</option>
                                {gmailConnected && <option value="gmail">Your Gmail ({userEmail})</option>}
                            </select>
                        </div>

                        <div className="input-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between' }}>Subject</label>
                            <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" />
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                {VARIABLES.slice(0, 5).map(v => (
                                    <button key={v} type="button" onClick={() => insertVariable('subject', v)} style={{ border: 'none', background: 'var(--bg-white)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', border: '1px solid var(--border-color)' }}>{v}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {selectedActions.includes('SEND_SLACK_MESSAGE') && (
                    <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.25rem' }}>💬</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Slack Notification</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    {slackConnected ? 'Connected to your Slack channel.' : 'Slack is not connected. Please go to Integrations to connect.'}
                                </div>
                            </div>
                         </div>
                    </div>
                )}

                {selectedActions.length > 0 && (
                    <div className="input-group" style={{ marginTop: '24px' }}>
                        <label>Message Body</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {VARIABLES.map(v => (
                                <button key={v} type="button" onClick={() => insertVariable('body', v)} style={{ border: 'none', background: 'white', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', border: '1px solid var(--border-color)' }}>{v}</button>
                            ))}
                        </div>
                        <textarea className="input" rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message here..." style={{ fontFamily: 'monospace' }} />
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', position: 'fixed', bottom: 0, left: '240px', right: 0, background: 'var(--bg-white)', padding: '16px 32px', borderTop: '1px solid var(--border-color)', zIndex: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => router.push('/workflows')}>Cancel</button>
                <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleSave} 
                    disabled={loading || !name || !trigger || selectedActions.length === 0 || !body}
                >
                    {loading ? 'Saving...' : 'Save Workflow'}
                </button>
            </div>
        </div>
    );
}

export default function CreateWorkflowPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateWorkflowContent />
        </Suspense>
    );
}
