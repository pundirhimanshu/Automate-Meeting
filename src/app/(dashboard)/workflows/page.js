'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WorkflowsPage() {
    const router = useRouter();
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const fetchWorkflows = async () => {
        try {
            const res = await fetch('/api/workflows');
            if (res.ok) {
                const data = await res.json();
                setWorkflows(data.workflows || []);
            }
        } catch (e) {
            console.error('Failed to fetch workflows', e);
        } finally {
            setLoading(false);
        }
    };

    const toggleWorkflow = async (id, isActive) => {
        try {
            const res = await fetch(`/api/workflows/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !isActive }),
            });
            if (res.ok) fetchWorkflows();
        } catch (e) { }
    };

    const deleteWorkflow = async (id) => {
        if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) return;
        
        try {
            const res = await fetch(`/api/workflows/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchWorkflows();
            } else {
                alert('Failed to delete workflow');
            }
        } catch (e) {
            console.error('Delete error', e);
        }
    };

    const templates = [
        { id: 'remind_host', name: 'Email reminder to host', desc: 'Never miss an event — get automated email reminders', icon: '⏰', trigger: 'BEFORE_EVENT', recipient: 'HOST' },
        { id: 'remind_invitee', name: 'Email reminder to invitee', desc: 'Reduce no-shows — send automated email reminders to invitees', icon: '✉️', trigger: 'BEFORE_EVENT', recipient: 'INVITEE' },
        { id: 'thank_you', name: 'Send thank you email', desc: 'Build relationships with a quick thanks', icon: '❤️', trigger: 'AFTER_EVENT', recipient: 'INVITEE' },
        { id: 'resources', name: 'Email additional resources', desc: 'Send links for additional resources to your invitees', icon: '🔗', trigger: 'EVENT_BOOKED', recipient: 'INVITEE' },
    ];

    return (
        <div>
            <div className="page-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '20px', marginBottom: '30px' }}>
                <div>
                    <h1 className="page-title" style={{ margin: 0 }}>Workflows</h1>
                    <p style={{ color: 'var(--text-tertiary)', marginTop: '4px', fontSize: '0.9375rem' }}>Automate communications before and after your events.</p>
                </div>
            </div>

            {/* active workflows */}
            {workflows.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px' }}>Your active workflows</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                        {workflows.map((wf) => (
                            <div key={wf.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{wf.name}</div>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                                        <input type="checkbox" checked={wf.isActive} onChange={() => toggleWorkflow(wf.id, wf.isActive)} style={{ opacity: 0, position: 'absolute' }} />
                                        <div style={{ width: '36px', height: '20px', background: wf.isActive ? 'var(--primary)' : 'var(--border-color)', borderRadius: '20px', transition: '0.2s', position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: '2px', left: wf.isActive ? '18px' : '2px', width: '16px', height: '16px', background: 'white', borderRadius: '50%', transition: '0.2s' }} />
                                        </div>
                                    </label>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    <strong>Trigger:</strong> {wf.trigger?.replace('_', ' ').toLowerCase()}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                    <strong>Actions:</strong> {
                                        (Array.isArray(wf.action) ? wf.action : [wf.action]).map(a => {
                                            if (a === 'SEND_EMAIL') {
                                                const recipients = (Array.isArray(wf.sendTo) ? wf.sendTo : [wf.sendTo])
                                                    .map(r => r?.toLowerCase())
                                                    .filter(Boolean)
                                                    .join(', ');
                                                return `Email (${recipients})`;
                                            }
                                            if (a === 'SEND_SLACK_MESSAGE') return 'Slack Notification';
                                            return a;
                                        }).join(' & ')
                                    }
                                </div>
                                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                                    <button onClick={() => router.push(`/workflows/edit/${wf.id}`)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Edit</button>
                                    <button onClick={() => deleteWorkflow(wf.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--error)', borderColor: 'var(--error-light)' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Choose from a workflow below. If you don't see anything you like, you can create your own.</p>
                <button onClick={() => router.push('/workflows/create')} className="btn btn-secondary" style={{ borderRadius: '20px' }}>
                    Create your own workflow
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {templates.map(tpl => (
                    <div key={tpl.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '16px' }}>{tpl.icon}</div>
                        <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '8px', color: 'var(--text-primary)' }}>{tpl.name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '24px', lineHeight: 1.5 }}>
                            {tpl.desc}
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => router.push(`/workflows/create?template=${tpl.id}`)}
                                className="btn btn-primary"
                                style={{ borderRadius: '20px', padding: '8px 20px' }}
                            >
                                Add workflow
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
