'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

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

export default function EditWorkflowPage() {
    const router = useRouter();
    const params = useParams();
    const workflowId = params.id;
    const dropdownRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
    const [selectedActions, setSelectedActions] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    
    // Content
    const [sender, setSender] = useState('system');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    // Connectors
    const [gmailConnected, setGmailConnected] = useState(false);
    const [slackConnected, setSlackConnected] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        const init = async () => {
            await Promise.all([
                fetchEventTypes(),
                fetchIntegrations(),
                fetchWorkflow()
            ]);
            setLoading(false);
        };
        init();
    }, [workflowId]);

    const fetchWorkflow = async () => {
        try {
            const res = await fetch(`/api/workflows/${workflowId}`);
            if (res.ok) {
                const data = await res.json();
                const wf = data.workflow;
                setName(wf.name || '');
                setTrigger(wf.trigger || '');
                setTimeValue(wf.timeValue || 24);
                setTimeUnit(wf.timeUnit || 'HOURS');
                
                // Handle Migration: ensure they are arrays
                setSelectedActions(Array.isArray(wf.action) ? wf.action : [wf.action || 'SEND_EMAIL']);
                setSelectedRecipients(Array.isArray(wf.sendTo) ? wf.sendTo : [wf.sendTo || 'HOST']);
                
                setSender(wf.senderEmail || 'system');
                setSubject(wf.subject || '');
                setBody(wf.body || '');

                if (wf.eventTypes && wf.eventTypes.length > 0) {
                    setSelectedEventTypes(wf.eventTypes.map(et => et.id));
                } else {
                    setSelectedEventTypes(['ALL']);
                }
            } else {
                alert('Workflow not found');
                router.push('/workflows');
            }
        } catch (e) {
            console.error('Failed to fetch workflow', e);
        }
    };

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

        setSaving(true);
        try {
            const res = await fetch(`/api/workflows/${workflowId}`, {
                method: 'PUT',
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
                alert(`Failed to update workflow: ${errorData.details || 'Unknown server error'}`);
            }
        } catch (e) {
            console.error(e);
            alert('A network error occurred while saving.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '100px' }}>Loading...</div>;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1 className="page-title">Edit workflow</h1>
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
                                transition: 'all 0.2s ease',
                                borderRadius: 'var(--radius-md)'
                            }}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                {selectedEventTypes.includes('ALL') ? 'All Event Types' : `${selectedEventTypes.length} selected`}
                            </span>
                        </div>
                        {isDropdownOpen && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border-color)', zIndex: 1001, padding: '12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                                    <input type="checkbox" checked={selectedEventTypes.includes('ALL')} onChange={() => setSelectedEventTypes(['ALL'])} /> All Event Types
                                </label>
                                {eventTypes.map(et => (
                                    <label key={et.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedEventTypes.includes(et.id)} 
                                            onChange={() => {
                                                const clean = selectedEventTypes.filter(id => id !== 'ALL');
                                                if (clean.includes(et.id)) setSelectedEventTypes(clean.filter(id => id !== et.id));
                                                else setSelectedEventTypes([...clean, et.id]);
                                            }}
                                        /> {et.title}
                                    </label>
                                ))}
                                <button className="btn btn-primary btn-sm w-full mt-2" onClick={() => setIsDropdownOpen(false)}>Apply</button>
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
                                <option value="system">System Default</option>
                                {gmailConnected && <option value="gmail">Your Gmail ({userEmail})</option>}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Subject</label>
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
                            <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Slack Notification</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{slackConnected ? 'Connected.' : 'Not connected.'}</div>
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
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || !name || !trigger || selectedActions.length === 0 || !body}>
                    {saving ? 'Updating...' : 'Update Workflow'}
                </button>
            </div>
        </div>
    );
}
