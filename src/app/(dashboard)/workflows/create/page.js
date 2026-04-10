'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const TRIGGERS = [
    { label: 'Before event starts', value: 'BEFORE_EVENT', hasTime: true },
    { label: 'After event ends', value: 'AFTER_EVENT', hasTime: true },
    { label: 'New event booked', value: 'EVENT_BOOKED', hasTime: false },
    { label: 'Event canceled', value: 'EVENT_CANCELED', hasTime: false },
];

const ACTIONS = [
    { label: 'Send email to host', value: 'SEND_EMAIL_HOST' },
    { label: 'Send email to invitee', value: 'SEND_EMAIL_INVITEE' },
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

    // Action
    const [action, setAction] = useState('');
    const [sender, setSender] = useState('system');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    // Connectors
    const [gmailConnected, setGmailConnected] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    // Pre-fill from template
    useEffect(() => {
        const templateId = searchParams.get('template');
        if (templateId) {
            if (templateId === 'remind_host') {
                setName('Email reminder to host');
                setTrigger('BEFORE_EVENT');
                setAction('SEND_EMAIL_HOST');
                setSubject('Reminder: {{Event Name}} with {{Invitee Full Name}} at {{Event Time}} on {{Event Date}}');
                setBody('Hi {{Host Full Name}},\n\nThis is a friendly reminder that your {{Event Name}} with {{Invitee Full Name}} is at {{Event Time}} on {{Event Date}}.\n\n{{Location}}\n{{Event Description}}\n{{Questions And Answers}}');
            } else if (templateId === 'remind_invitee') {
                setName('Email reminder to invitee');
                setTrigger('BEFORE_EVENT');
                setAction('SEND_EMAIL_INVITEE');
                setSubject('Reminder: Your upcoming meeting with {{Host Full Name}}');
                setBody('Hi {{Invitee Full Name}},\n\nThis is a reminder for your upcoming {{Event Name}} with {{Host Full Name}} at {{Event Time}} on {{Event Date}}.\n\n{{Location}}');
            } else if (templateId === 'thank_you') {
                setName('Send thank you email');
                setTrigger('AFTER_EVENT');
                setAction('SEND_EMAIL_INVITEE');
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
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    const insertVariable = (field, variable) => {
        const val = `{{${variable}}}`;
        if (field === 'subject') setSubject(s => s + val);
        if (field === 'body') setBody(b => b + val);
    };

    const handleSave = async () => {
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
                    action: 'SEND_EMAIL',
                    sendTo: action === 'SEND_EMAIL_HOST' ? 'HOST' : 'INVITEE',
                    senderEmail: sender,
                    subject,
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
                    <div className="input-group" ref={dropdownRef} style={{ position: 'relative', zIndex: isDropdownOpen ? 1000 : 1 }}>
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
                                animation: 'fadeInScale 0.2s ease'
                            }}>
                                <style>{`
                                    @keyframes fadeInScale {
                                        from { opacity: 0; transform: scale(0.95); }
                                        to { opacity: 1; transform: scale(1); }
                                    }
                                `}</style>
                                <div style={{ position: 'relative', marginBottom: '12px' }}>
                                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    </span>
                                    <input
                                        className="input"
                                        placeholder="Search event types..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        style={{ paddingLeft: '32px', height: '36px', fontSize: '0.875rem' }}
                                    />
                                </div>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '8px 10px',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        background: selectedEventTypes.includes('ALL') ? 'var(--primary-light)' : 'transparent',
                                        marginBottom: '4px',
                                        transition: 'background 0.2s'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedEventTypes.includes('ALL')}
                                            onChange={() => {
                                                if (selectedEventTypes.includes('ALL')) {
                                                    setSelectedEventTypes([]);
                                                } else {
                                                    setSelectedEventTypes(['ALL']);
                                                }
                                            }}
                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                        />
                                        <span style={{ fontSize: '0.875rem', fontWeight: selectedEventTypes.includes('ALL') ? 600 : 400 }}>All Current and Future Event Types</span>
                                    </label>

                                    <div style={{ padding: '4px 0', borderTop: '1px solid var(--border-light)', marginTop: '4px', paddingTop: '8px' }}>
                                        {eventTypes
                                            .filter(et => et.title.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map(et => (
                                                <label key={et.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 10px',
                                                    cursor: 'pointer',
                                                    borderRadius: '6px',
                                                    background: selectedEventTypes.includes(et.id) ? 'var(--primary-light)' : 'transparent',
                                                    transition: 'background 0.2s'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEventTypes.includes(et.id)}
                                                        onChange={() => {
                                                            const isAllSelected = selectedEventTypes.includes('ALL');
                                                            const newSelected = isAllSelected ? [] : [...selectedEventTypes];
                                                            if (newSelected.includes(et.id)) {
                                                                setSelectedEventTypes(newSelected.filter(id => id !== et.id));
                                                            } else {
                                                                setSelectedEventTypes([...newSelected, et.id]);
                                                            }
                                                        }}
                                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                    />
                                                    <span style={{ fontSize: '0.875rem', fontWeight: selectedEventTypes.includes(et.id) ? 600 : 400 }}>{et.title}</span>
                                                </label>
                                            ))
                                        }
                                        {eventTypes.filter(et => et.title.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                                                No events found
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        style={{ height: '32px', borderRadius: '6px' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        Apply Selection
                                    </button>
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
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Do this</h2>
                <select className="input" style={{ marginBottom: '24px' }} value={action} onChange={e => setAction(e.target.value)}>
                    <option value="" disabled>Select action...</option>
                    {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>

                {action && (
                    <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                        <div className="input-group" style={{ marginBottom: '20px' }}>
                            <label>Send from</label>
                            <select className="input" value={sender} onChange={e => setSender(e.target.value)}>
                                <option value="system">System Default (Automate Meetings)</option>
                                {gmailConnected && <option value="gmail">Your Gmail ({userEmail})</option>}
                            </select>
                            {!gmailConnected && (
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                                    Want to send emails from your own address? <a href="/integrations" style={{ color: 'var(--primary)' }}>Connect Gmail in Integrations</a>.
                                </p>
                            )}
                        </div>

                        <div className="input-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                Subject
                                <div className="dropdown" style={{ display: 'inline-block', position: 'relative' }}>
                                    <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto' }}>+ Variables</button>
                                    <div className="dropdown-menu" style={{ right: 0, minWidth: '200px', display: 'none' /* handled via CSS hover usually, using basic buttons here */ }}>
                                        {VARIABLES.map(v => <button key={v} type="button" onClick={() => insertVariable('subject', v)} className="dropdown-item">{v}</button>)}
                                    </div>
                                </div>
                            </label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Quick insert:</span>
                                {VARIABLES.slice(0, 4).map(v => (
                                    <button key={v} type="button" onClick={() => insertVariable('subject', v)} style={{ border: 'none', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>{v}</button>
                                ))}
                            </div>
                            <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" />
                        </div>

                        <div className="input-group">
                            <label>Body</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Quick insert:</span>
                                {VARIABLES.map(v => (
                                    <button key={v} type="button" onClick={() => insertVariable('body', v)} style={{ border: 'none', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>{v}</button>
                                ))}
                            </div>
                            <textarea className="input" rows={10} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your email body here..." style={{ fontFamily: 'monospace' }} />
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', position: 'fixed', bottom: 0, left: '240px', right: 0, background: 'var(--bg-white)', padding: '16px 32px', borderTop: '1px solid var(--border-color)', zIndex: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => router.push('/workflows')}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={loading || !name || !trigger || !action || !subject || !body}>
                    {loading ? 'Saving...' : 'Save Workflow'}
                </button>
            </div>
        </div>
    );
}

export default function CreateWorkflowPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                <div className="spinner" style={{ width: '40px', height: '40px' }} />
            </div>
        }>
            <CreateWorkflowContent />
        </Suspense>
    );
}
