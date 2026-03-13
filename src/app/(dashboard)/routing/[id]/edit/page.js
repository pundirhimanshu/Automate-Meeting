'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function RoutingEditorPage({ params }) {
    const { id } = params;
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'questions';
    
    const [form, setForm] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab); // 'questions', 'logic', 'responses', 'settings'
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [eventTypes, setEventTypes] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [fetchingSubmissions, setFetchingSubmissions] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'responses') {
            fetchSubmissions();
        }
    }, [activeTab]);

    const fetchData = async () => {
        try {
            const [formRes, eventTypesRes] = await Promise.all([
                fetch(`/api/routing/${id}`, { cache: 'no-store' }),
                fetch('/api/event-types', { cache: 'no-store' })
            ]);
            const formData = await formRes.json();
            const etData = await eventTypesRes.json();

            if (formData.form) {
                const processedQuestions = formData.form.questions.map(q => ({
                    ...q,
                    options: q.options ? JSON.parse(q.options) : []
                }));
                setForm({ ...formData.form, questions: processedQuestions });
            }
            if (etData.eventTypes) setEventTypes(etData.eventTypes);
        } catch (error) {
            console.error('Error fetching editor data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubmissions = async () => {
        setFetchingSubmissions(true);
        try {
            const res = await fetch(`/api/routing/${id}/submissions`);
            const data = await res.json();
            if (data.submissions) setSubmissions(data.submissions);
        } catch (error) {
            console.error('Error fetching submissions:', error);
        } finally {
            setFetchingSubmissions(false);
        }
    };

    const handleSaveQuestions = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/routing/${id}/questions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: form.questions }),
            });
            const data = await res.json();
            
            if (data.questions) {
                const processedQuestions = data.questions.map(q => ({
                    ...q,
                    options: q.options ? JSON.parse(q.options) : []
                }));
                setForm(prev => ({ ...prev, questions: processedQuestions }));
                alert('Form structure saved and synchronized!');
            }
        } catch (error) {
            console.error('Error saving questions:', error);
            alert('Failed to save questions. Check console for details.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRules = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/routing/${id}/rules`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rules: form.rules }),
            });
            const data = await res.json();
            
            if (data.rules) {
                setForm(prev => ({ ...prev, rules: data.rules }));
                alert('Routing logic updated and synchronized!');
            }
        } catch (error) {
            console.error('Error saving rules:', error);
            alert('Failed to save logic rules.');
        } finally {
            setSaving(false);
        }
    };

    const addQuestion = () => {
        const newQ = {
            id: `temp-${Date.now()}`,
            label: 'New Question',
            type: 'text',
            required: false,
            order: form.questions.length,
            options: []
        };
        setForm({ ...form, questions: [...form.questions, newQ] });
    };

    const addRule = () => {
        const newRule = {
            id: `temp-${Date.now()}`,
            questionId: form.questions[0]?.id || null,
            operator: 'is',
            value: '',
            destination: '',
            isFallback: false,
            order: form.rules.length
        };
        setForm({ ...form, rules: [...form.rules, newRule] });
    };

    if (loading) return (
        <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading editor environment...</p>
        </div>
    );
    
    if (!form) return <div className="error-state">Routing form not found.</div>;

    return (
        <div className="editor-layout">
            <header className="editor-header-bar">
                <div className="header-content">
                    <div className="header-left">
                        <Link href="/routing" className="back-btn">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </Link>
                        <div className="title-area">
                            <span className="breadcrumb">Routing / </span>
                            <h1 className="form-title">{form.name}</h1>
                        </div>
                    </div>
                    <nav className="tabs editor-nav-tabs">
                        <button className={`tab ${activeTab === 'questions' ? 'active' : ''}`} onClick={() => setActiveTab('questions')}>
                            Build Form
                        </button>
                        <button className={`tab ${activeTab === 'logic' ? 'active' : ''}`} onClick={() => setActiveTab('logic')}>
                            Logic Rules
                        </button>
                        <button className={`tab ${activeTab === 'responses' ? 'active' : ''}`} onClick={() => setActiveTab('responses')}>
                            Responses
                        </button>
                        <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                            Settings
                        </button>
                    </nav>
                    <div className="header-right">
                        <span className="status-indicator">
                            <span className="dot"></span> Saved
                        </span>
                    </div>
                </div>
            </header>

            <main className="editor-canvas">
                <div className="canvas-content">
                    {activeTab === 'questions' && (
                        <div className="builder-interface">
                            <div className="builder-header">
                                <div>
                                    <h2 className="section-title">Form Structure</h2>
                                    <p className="section-desc">Add questions to qualify your visitors.</p>
                                </div>
                                <button className="btn btn-primary" onClick={addQuestion}>
                                    + Add Question
                                </button>
                            </div>

                            <div className="questions-stack">
                                {form.questions.map((q, idx) => (
                                    <div key={q.id} className="card question-card">
                                        <div className="q-drag-handle">⠿</div>
                                        <div className="q-content">
                                            <div className="q-row">
                                                <input
                                                    className="q-input-label"
                                                    placeholder="Enter question label..."
                                                    value={q.label}
                                                    onChange={(e) => {
                                                        const newQs = [...form.questions];
                                                        newQs[idx].label = e.target.value;
                                                        setForm({ ...form, questions: newQs });
                                                    }}
                                                />
                                                <select
                                                    className="q-select-type"
                                                    value={q.type}
                                                    onChange={(e) => {
                                                        const newQs = [...form.questions];
                                                        newQs[idx].type = e.target.value;
                                                        setForm({ ...form, questions: newQs });
                                                    }}
                                                >
                                                    <option value="text">Text Input</option>
                                                    <option value="dropdown">Dropdown Select</option>
                                                    <option value="radio">Radio Options</option>
                                                </select>
                                            </div>
                                            
                                            {(q.type === 'dropdown' || q.type === 'radio') && (
                                                <div className="q-options-area">
                                                    <label className="field-label">Options (separate by comma)</label>
                                                    <input
                                                        className="input q-options-input"
                                                        value={q.options?.join(', ') || ''}
                                                        onChange={(e) => {
                                                            const newQs = [...form.questions];
                                                            newQs[idx].options = e.target.value.split(',').map(s => s.trim());
                                                            setForm({ ...form, questions: newQs });
                                                        }}
                                                        placeholder="Sales, Support, Billing..."
                                                    />
                                                </div>
                                            )}
                                            
                                            <div className="q-footer">
                                                <div className="q-settings">
                                                    <label className="checkbox-toggle">
                                                        <input
                                                            type="checkbox"
                                                            checked={q.required}
                                                            onChange={(e) => {
                                                                const newQs = [...form.questions];
                                                                newQs[idx].required = e.target.checked;
                                                                setForm({ ...form, questions: newQs });
                                                            }}
                                                        />
                                                        <span className="toggle-label">Required field</span>
                                                    </label>
                                                </div>
                                                <button className="btn-icon-danger" onClick={() => {
                                                    const deletedQId = form.questions[idx].id;
                                                    const newQs = form.questions.filter((_, i) => i !== idx);
                                                    const newRules = form.rules.filter(r => r.questionId !== deletedQId);
                                                    setForm({ ...form, questions: newQs, rules: newRules });
                                                }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="builder-save-bar">
                                <button className="btn btn-primary btn-lg" onClick={handleSaveQuestions} disabled={saving}>
                                    {saving ? 'Syncing...' : 'Save Structure'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'logic' && (
                        <div className="logic-interface">
                            <div className="builder-header">
                                <div>
                                    <h2 className="section-title">Routing Rules</h2>
                                    <p className="section-desc">Direct users based on their specific needs.</p>
                                </div>
                                <button className="btn btn-primary" onClick={addRule}>
                                    + Add New Rule
                                </button>
                            </div>

                            <div className="rules-stack">
                                {form.rules.map((rule, idx) => (
                                    <div key={rule.id} className="card rule-card">
                                        <div className="rule-top">
                                            <div className="rule-badge">Rule #{idx + 1}</div>
                                            <button className="btn-icon-danger-sm" onClick={() => {
                                                const newRules = form.rules.filter((_, i) => i !== idx);
                                                setForm({ ...form, rules: newRules });
                                            }}>×</button>
                                        </div>
                                        <div className="rule-body">
                                            <div className="logic-row">
                                                <span className="logic-keyword">IF</span>
                                                <select
                                                    className="select-logic"
                                                    value={rule.questionId || ''}
                                                    onChange={(e) => {
                                                        const newRules = [...form.rules];
                                                        newRules[idx].questionId = e.target.value;
                                                        setForm({ ...form, rules: newRules });
                                                    }}
                                                >
                                                    <option value="">Choose Question</option>
                                                    {form.questions.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
                                                </select>
                                                <select
                                                    className="select-operator"
                                                    value={rule.operator}
                                                    onChange={(e) => {
                                                        const newRules = [...form.rules];
                                                        newRules[idx].operator = e.target.value;
                                                        setForm({ ...form, rules: newRules });
                                                    }}
                                                >
                                                    <option value="is">is</option>
                                                    <option value="is_not">is not</option>
                                                    <option value="contains">contains</option>
                                                </select>
                                                <input
                                                    className="input-logic-val"
                                                    placeholder="Value"
                                                    value={rule.value}
                                                    onChange={(e) => {
                                                        const newRules = [...form.rules];
                                                        newRules[idx].value = e.target.value;
                                                        setForm({ ...form, rules: newRules });
                                                    }}
                                                />
                                            </div>
                                            <div className="logic-arrow">↓</div>
                                            <div className="logic-row">
                                                <span className="logic-keyword-then">THEN ROUTE TO</span>
                                                <select
                                                    className="select-dest"
                                                    value={rule.destination?.startsWith('event-type:') ? rule.destination : (rule.destination ? 'custom' : '')}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const newRules = [...form.rules];
                                                        newRules[idx].destination = val === 'custom' ? 'https://' : val;
                                                        setForm({ ...form, rules: newRules });
                                                    }}
                                                >
                                                    <option value="">Select Target</option>
                                                    <optgroup label="Core Event Types">
                                                        {eventTypes.map(et => (
                                                            <option key={et.id} value={`event-type:${et.id}`}>{et.title}</option>
                                                        ))}
                                                    </optgroup>
                                                    <option value="custom">External Webpage</option>
                                                </select>
                                            </div>
                                            
                                            {(!rule.destination?.startsWith('event-type:') && rule.destination !== '') && (
                                                <div className="logic-row custom-url-row" style={{ marginTop: '12px' }}>
                                                    <span className="logic-keyword">URL</span>
                                                    <input 
                                                        className="input"
                                                        placeholder="https://example.com"
                                                        value={rule.destination}
                                                        onChange={(e) => {
                                                            const newRules = [...form.rules];
                                                            newRules[idx].destination = e.target.value;
                                                            setForm({ ...form, rules: newRules });
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="builder-save-bar">
                                <button className="btn btn-primary btn-lg" onClick={handleSaveRules} disabled={saving}>
                                    {saving ? 'Syncing...' : 'Save Logic Rules'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'responses' && (
                        <div className="responses-interface">
                            <div className="builder-header">
                                <div>
                                    <h2 className="section-title">Form Submissions</h2>
                                    <p className="section-desc">Review and analyze responses from your visitors.</p>
                                </div>
                                <button className="btn btn-secondary btn-sm" onClick={fetchSubmissions} disabled={fetchingSubmissions}>
                                    {fetchingSubmissions ? 'Refreshing...' : 'Refresh'}
                                </button>
                            </div>

                            <div className="responses-table-wrapper card">
                                {submissions.length === 0 ? (
                                    <div className="empty-responses">
                                        <div className="empty-icon small">📭</div>
                                        <p>No responses yet. Share your form with visitors to start collecting data.</p>
                                    </div>
                                ) : (
                                    <div className="table-scroll">
                                        <table className="responses-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Invitee</th>
                                                    {form.questions.map(q => (
                                                        <th key={q.id}>{q.label}</th>
                                                    ))}
                                                    <th>Routed To</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {submissions.map(sub => (
                                                    <tr key={sub.id}>
                                                        <td className="date-cell">
                                                            {new Date(sub.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="invitee-cell">
                                                            <div className="invitee-name">{sub.inviteeName}</div>
                                                            <div className="invitee-email text-tertiary">{sub.inviteeEmail}</div>
                                                        </td>
                                                        {form.questions.map(q => (
                                                            <td key={q.id}>{sub.answers[q.id] || sub.answers[q.label] || '-'}</td>
                                                        ))}
                                                        <td>
                                                            <span className="destination-tag">
                                                                {sub.destination?.startsWith('event-type:') 
                                                                    ? eventTypes.find(et => et.id === sub.destination.split(':')[1])?.title || 'Event Type'
                                                                    : sub.destination || '-'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="settings-interface">
                            <h2 className="section-title">Form Settings</h2>
                            <div className="card settings-card">
                                <div className="setting-group">
                                    <label className="field-label">Form URL Slug</label>
                                    <div className="slug-preview">
                                        <span className="domain-prefix">router.cal/</span>
                                        <input className="input-slug" value={form.slug} readOnly />
                                    </div>
                                    <p className="help-text">This is the unique part of your public link.</p>
                                </div>
                                <div className="divider"></div>
                                <div className="setting-group">
                                    <label className="field-label">Public Link</label>
                                    <div className="link-copy-box">
                                        <input className="input-link" readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/router/${form.slug}`} />
                                        <button className="btn btn-secondary btn-sm" onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/router/${form.slug}`);
                                            alert('Link copied!');
                                        }}>Copy</button>
                                    </div>
                                </div>
                                <div className="divider"></div>
                                <div className="setting-group">
                                    <label className="checkbox-toggle">
                                        <input type="checkbox" checked={form.isActive} readOnly />
                                        <span className="toggle-label">Accept submissions for this form</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <style jsx>{`
                .editor-layout {
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background: #fdfdfd;
                }
                .editor-header-bar {
                    background: white;
                    border-bottom: 1px solid var(--border-color);
                    z-index: 100;
                }
                .header-content {
                    max-width: 1400px;
                    margin: 0 auto;
                    height: 64px;
                    padding: 0 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .back-btn {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    color: var(--text-tertiary);
                    transition: all 0.2s;
                }
                .back-btn:hover {
                    background: var(--bg-hover);
                    color: var(--text-primary);
                }
                .breadcrumb {
                    font-size: 13px;
                    color: var(--text-tertiary);
                }
                .form-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .editor-nav-tabs {
                    border: none;
                    gap: 32px;
                }
                .editor-nav-tabs .tab {
                    padding: 20px 0;
                    bottom: 0;
                }
                .status-indicator {
                    font-size: 12px;
                    color: var(--text-tertiary);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .dot {
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                }
                .editor-canvas {
                    flex: 1;
                    overflow-y: auto;
                    background: #f9fafb;
                    padding: 40px 24px;
                }
                .canvas-content {
                    max-width: 900px;
                    margin: 0 auto;
                }
                .builder-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 32px;
                }
                .section-title {
                    font-size: 20px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                .section-desc {
                    font-size: 14px;
                    color: var(--text-secondary);
                }
                .questions-stack, .rules-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 15rem;
                }
                .question-card {
                    display: flex;
                    padding: 0;
                    overflow: visible;
                }
                .q-drag-handle {
                    width: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #d1d5db;
                    font-size: 20px;
                    cursor: grab;
                    background: #f8fafc;
                    border-right: 1px solid var(--border-light);
                }
                .q-content {
                    padding: 24px;
                    flex: 1;
                }
                .q-row {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                .q-input-label {
                    flex: 1;
                    font-size: 18px;
                    font-weight: 600;
                    border: 1px solid transparent;
                    padding: 4px 0;
                    color: var(--text-primary);
                }
                .q-input-label:focus {
                    outline: none;
                    border-bottom: 2px solid var(--primary);
                }
                .q-select-type {
                    padding: 8px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: white;
                    font-size: 14px;
                    font-weight: 500;
                }
                .q-footer {
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .checkbox-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }
                .toggle-label {
                    font-size: 13px;
                    font-weight: 500;
                    color: #64748b;
                }
                .btn-icon-danger {
                    color: #94a3b8;
                    background: none;
                    transition: all 0.2s;
                }
                .btn-icon-danger:hover {
                    color: var(--danger);
                }
                .rule-card {
                    padding: 0;
                }
                .rule-top {
                    padding: 12px 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid var(--border-light);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .rule-badge {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #64748b;
                    letter-spacing: 0.05em;
                }
                .rule-body {
                    padding: 24px;
                }
                .logic-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .logic-keyword {
                    font-size: 13px;
                    font-weight: 800;
                    color: #94a3b8;
                    min-width: 24px;
                }
                .logic-keyword-then {
                    font-size: 12px;
                    font-weight: 800;
                    color: var(--primary);
                    margin-right: 8px;
                }
                .logic-arrow {
                    margin: 12px 28px;
                    color: #cbd5e1;
                    font-size: 18px;
                }
                .select-logic, .select-operator, .select-dest, .input-logic-val {
                    padding: 10px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    font-size: 14px;
                }
                .select-logic { flex: 2; }
                .select-operator { flex: 1; }
                .input-logic-val { flex: 2; }
                .select-dest { flex: 1; }
                .builder-save-bar {
                    position: fixed;
                    bottom: 32px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    padding: 12px 32px;
                    border-radius: 999px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    border: 1px solid var(--border-color);
                    z-index: 1000;
                    display: flex;
                    gap: 16px;
                }
                
                /* Responses UI Styles */
                .responses-table-wrapper {
                    padding: 0;
                    background: white;
                    overflow: hidden;
                    border-radius: 12px;
                }
                .empty-responses {
                    padding: 60px;
                    text-align: center;
                    color: var(--text-secondary);
                }
                .empty-icon.small { font-size: 40px; margin-bottom: 12px; }
                .table-scroll {
                    overflow-x: auto;
                    max-width: 100%;
                }
                .responses-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                }
                .responses-table th {
                    background: #f8fafc;
                    padding: 14px 20px;
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #64748b;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid var(--border-light);
                    white-space: nowrap;
                }
                .responses-table td {
                    padding: 16px 20px;
                    font-size: 14px;
                    color: var(--text-primary);
                    border-bottom: 1px solid var(--border-light);
                }
                .date-cell {
                    white-space: nowrap;
                    color: #64748b !important;
                    font-size: 13px !important;
                }
                .invitee-name {
                    font-weight: 600;
                }
                .invitee-email {
                    font-size: 12px;
                }
                .destination-tag {
                    display: inline-block;
                    padding: 4px 10px;
                    background: #f1f5f9;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    color: #475569;
                }
                
                .settings-card {
                    margin-top: 24px;
                    padding: 0;
                }
                .setting-group {
                    padding: 32px;
                }
                .divider {
                    height: 1px;
                    background: #f1f5f9;
                }
                .field-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 12px;
                    color: var(--text-primary);
                }
                .slug-preview {
                    display: flex;
                    align-items: center;
                    background: #f1f5f9;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    padding: 2px 14px;
                }
                .domain-prefix {
                    color: #94a3b8;
                    font-size: 14px;
                    font-weight: 500;
                }
                .input-slug {
                    background: transparent;
                    border: none;
                    padding: 10px 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    outline: none;
                }
                .link-copy-box {
                    display: flex;
                    gap: 12px;
                }
                .input-link {
                    flex: 1;
                    padding: 10px 14px;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    background: #fcfcfc;
                    color: #64748b;
                    font-size: 14px;
                }
                .loading-state {
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: white;
                }
                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid #f3f4f6;
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 16px;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
