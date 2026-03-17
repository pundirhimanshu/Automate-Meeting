'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableQuestion({ q, idx, form, setForm, updateQuestion, handleUpdateOption, handleRemoveOption, handleAddOption }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: q.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="card question-card">
            <div className="q-drag-handle" {...attributes} {...listeners}>⠿</div>
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
                            if ((e.target.value === 'dropdown' || e.target.value === 'radio') && !Array.isArray(newQs[idx].options)) {
                                newQs[idx].options = [];
                            }
                            setForm({ ...form, questions: newQs });
                        }}
                    >
                        <option value="text">Text Input</option>
                        <option value="dropdown">Dropdown Select</option>
                        <option value="radio">Radio Options</option>
                        <option value="phone">Phone Number</option>
                    </select>
                </div>
                
                {(q.type === 'dropdown' || q.type === 'radio') && (
                    <div className="q-options-area">
                        <label className="field-label">Answers Options</label>
                        <div className="options-editor-list">
                            {(q.options || []).map((opt, optIdx) => (
                                <div key={optIdx} className="option-editor-row">
                                    <input
                                        className="input q-option-input"
                                        value={opt}
                                        onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                                        placeholder={`Option ${optIdx + 1}`}
                                    />
                                    <button className="btn-remove-opt" onClick={() => handleRemoveOption(q.id, optIdx)}>×</button>
                                </div>
                            ))}
                            <button className="btn-add-opt" onClick={() => handleAddOption(q.id)}>
                                + Add Another Option
                            </button>
                        </div>
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
    );
}

export default function RoutingEditorPage({ params }) {
    const slugify = (text) => text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');

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
    const [embedCopied, setEmbedCopied] = useState(''); // 'link' | 'embed' | ''

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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


    const addQuestion = () => {
        const newQuestion = {
            id: `temp-${Date.now()}`,
            label: 'Untitled Question',
            type: 'text',
            placeholder: '',
            required: false,
            options: [],
            order: form.questions.length
        };
        setForm({ ...form, questions: [...form.questions, newQuestion] });
    };

    const addRule = () => {
        const newRule = {
            id: `temp-${Date.now()}`,
            questionId: form.questions[0]?.id || null,
            operator: 'is',
            value: '',
            logicType: 'AND',
            conditions: [
                { questionId: form.questions[0]?.id || null, operator: 'is', value: '' }
            ],
            destination: '',
            isFallback: false,
            order: form.rules.length
        };
        setForm({ ...form, rules: [...form.rules, newRule] });
    };

    const handleAddCondition = (ruleIdx) => {
        const newRules = [...form.rules];
        const newCond = { questionId: form.questions[0]?.id || null, operator: 'is', value: '' };
        newRules[ruleIdx].conditions = [...(newRules[ruleIdx].conditions || []), newCond];
        setForm({ ...form, rules: newRules });
    };

    const handleRemoveCondition = (ruleIdx, condIdx) => {
        const newRules = [...form.rules];
        newRules[ruleIdx].conditions = newRules[ruleIdx].conditions.filter((_, i) => i !== condIdx);
        setForm({ ...form, rules: newRules });
    };

    const handleUpdateCondition = (ruleIdx, condIdx, updates) => {
        const newRules = [...form.rules];
        newRules[ruleIdx].conditions[condIdx] = { ...newRules[ruleIdx].conditions[condIdx], ...updates };
        setForm({ ...form, rules: newRules });
    };

    const handleUpdateOption = (qId, optIdx, newVal) => {
        const newQs = form.questions.map(q => {
            if (q.id === qId) {
                const newOpts = [...(q.options || [])];
                newOpts[optIdx] = newVal;
                return { ...q, options: newOpts };
            }
            return q;
        });
        setForm({ ...form, questions: newQs });
    };

    const handleRemoveOption = (qId, optIdx) => {
        const newQs = form.questions.map(q => {
            if (q.id === qId) {
                const newOpts = (q.options || []).filter((_, i) => i !== optIdx);
                return { ...q, options: newOpts };
            }
            return q;
        });
        setForm({ ...form, questions: newQs });
    };

    const handleAddOption = (qId) => {
        const newQs = form.questions.map(q => {
            if (q.id === qId) {
                const newOpts = [...(q.options || []), ''];
                return { ...q, options: newOpts };
            }
            return q;
        });
        setForm({ ...form, questions: newQs });
    };

    // Autosave logic
    useEffect(() => {
        if (!form || loading) return;
        
        const delayDebounceFn = setTimeout(() => {
            handleSaveQuestions(true);
            handleSaveRules(true);
        }, 2000); // 2 second debounce for autosave

        return () => clearTimeout(delayDebounceFn);
    }, [form?.questions, form?.rules]);

    const handleSaveQuestions = async (isAutosave = false) => {
        if (!form) return;
        setSaving(true);
        const start = Date.now();
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
                // Only update form state if not autosaving to prevent cursor jumps
                if (!isAutosave) setForm(prev => ({ ...prev, questions: processedQuestions }));
            }
        } catch (error) {
            console.error('Error saving questions:', error);
        } finally {
            const elapsed = Date.now() - start;
            setTimeout(() => setSaving(false), Math.max(0, 500 - elapsed));
        }
    };

    const handleSaveRules = async (isAutosave = false) => {
        if (!form) return;
        setSaving(true);
        const start = Date.now();
        try {
            const res = await fetch(`/api/routing/${id}/rules`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rules: form.rules }),
            });
            const data = await res.json();
            
            if (data.rules && !isAutosave) {
                setForm(prev => ({ ...prev, rules: data.rules }));
            }
        } catch (error) {
            console.error('Error saving rules:', error);
        } finally {
            const elapsed = Date.now() - start;
            setTimeout(() => setSaving(false), Math.max(0, 500 - elapsed));
        }
    };

    const handleUpdateSettings = async (updates) => {
        setSaving(true);
        const start = Date.now();
        try {
            const res = await fetch(`/api/routing/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            const data = await res.json();
            if (data.form) {
                setForm(prev => ({ ...prev, ...updates }));
            }
        } catch (error) {
            console.error('Error updating settings:', error);
        } finally {
            const elapsed = Date.now() - start;
            setTimeout(() => setSaving(false), Math.max(0, 500 - elapsed));
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setForm((prev) => {
                const oldIndex = prev.questions.findIndex((q) => q.id === active.id);
                const newIndex = prev.questions.findIndex((q) => q.id === over.id);

                const newQuestions = arrayMove(prev.questions, oldIndex, newIndex);
                // Update order for each question
                const updatedQuestions = newQuestions.map((q, i) => ({ ...q, order: i }));
                return { ...prev, questions: updatedQuestions };
            });
        }
    };
    
    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Preparing your editor...</p>
                <style jsx>{`
                    .loading-state { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; }
                    .spinner { width: 40px; height: 40px; border: 3px solid var(--primary-light); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }
    
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
                        <div className={`status-indicator ${saving ? 'is-saving' : ''}`}>
                            {saving ? (
                                <>
                                    <span className="sync-spinner"></span>
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <span className="dot"></span>
                                    Saved
                                </>
                            )}
                        </div>
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
                            </div>                            <div className="questions-stack">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={form.questions.map(q => q.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {form.questions.map((q, idx) => (
                                            <SortableQuestion
                                                key={q.id}
                                                q={q}
                                                idx={idx}
                                                form={form}
                                                setForm={setForm}
                                                handleUpdateOption={handleUpdateOption}
                                                handleRemoveOption={handleRemoveOption}
                                                handleAddOption={handleAddOption}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            </div>
                            <div className="builder-save-bar">
                                <button className="btn btn-primary btn-lg" onClick={handleSaveQuestions} disabled={saving}>
                                    {saving ? (
                                        <>
                                            <span className="btn-spinner"></span>
                                            Syncing...
                                        </>
                                    ) : 'Save Structure'}
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
                                            <div className="conditions-container">
                                                {(rule.conditions || [{ questionId: rule.questionId, operator: rule.operator, value: rule.value }]).map((cond, condIdx) => (
                                                    <div key={condIdx} className="logic-row condition-row mb-2">
                                                        <span className="logic-keyword">
                                                            {condIdx === 0 ? 'IF' : rule.logicType || 'AND'}
                                                        </span>
                                                        <select
                                                            className="select-logic"
                                                            value={cond.questionId || ''}
                                                            onChange={(e) => handleUpdateCondition(idx, condIdx, { questionId: e.target.value })}
                                                        >
                                                            <option value="">Choose Question</option>
                                                            {form.questions.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
                                                        </select>
                                                        <select
                                                            className="select-operator"
                                                            value={cond.operator}
                                                            onChange={(e) => handleUpdateCondition(idx, condIdx, { operator: e.target.value })}
                                                        >
                                                            <option value="is">is</option>
                                                            <option value="is_not">is not</option>
                                                            <option value="contains">contains</option>
                                                            <option value="in">is in (comma-separated)</option>
                                                        </select>
                                                        {(() => {
                                                            const selectedQ = form.questions.find(q => q.id === cond.questionId);
                                                            if (selectedQ && (selectedQ.type === 'dropdown' || selectedQ.type === 'radio')) {
                                                                return (
                                                                    <select
                                                                        className="input-logic-val"
                                                                        value={cond.value}
                                                                        onChange={(e) => handleUpdateCondition(idx, condIdx, { value: e.target.value })}
                                                                    >
                                                                        <option value="">Select Option</option>
                                                                        {(selectedQ.options || []).map((opt, i) => (
                                                                            <option key={i} value={opt}>{opt}</option>
                                                                        ))}
                                                                    </select>
                                                                );
                                                            }
                                                            return (
                                                                <input
                                                                    className="input-logic-val"
                                                                    placeholder={cond.operator === 'in' ? "e.g. Sales, Support" : "Value"}
                                                                    value={cond.value}
                                                                    onChange={(e) => handleUpdateCondition(idx, condIdx, { value: e.target.value })}
                                                                />
                                                            );
                                                        })()}
                                                        {(rule.conditions?.length > 1) && (
                                                            <button className="btn-remove-cond" onClick={() => handleRemoveCondition(idx, condIdx)}>×</button>
                                                        )}
                                                    </div>
                                                ))}
                                                <div className="condition-actions mt-3">
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleAddCondition(idx)}>+ Add Condition</button>
                                                    {(rule.conditions?.length > 1) && (
                                                        <select 
                                                            className="select-logic-type ml-2"
                                                            value={rule.logicType || 'AND'} 
                                                            onChange={(e) => {
                                                                const newRules = [...form.rules];
                                                                newRules[idx].logicType = e.target.value;
                                                                setForm({ ...form, rules: newRules });
                                                            }}
                                                        >
                                                            <option value="AND">Match all conditions (AND)</option>
                                                            <option value="OR">Match any condition (OR)</option>
                                                        </select>
                                                    )}
                                                </div>
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
                                    {saving ? (
                                        <>
                                            <span className="btn-spinner"></span>
                                            Syncing...
                                        </>
                                    ) : 'Save Logic Rules'}
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
                                    {fetchingSubmissions ? (
                                        <>
                                            <span className="btn-spinner small"></span>
                                            Refreshing...
                                        </>
                                    ) : 'Refresh'}
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
                                    <h3 className="settings-section-title">Form Details</h3>
                                    <p className="settings-section-desc">Change the identity of this routing form.</p>
                                    
                                    <div className="input-group-vertical mt-4">
                                        <div className="field-block">
                                            <label className="field-label">Display Name</label>
                                            <input 
                                                className="input w-full" 
                                                value={form.name} 
                                                onChange={(e) => {
                                                    const newName = e.target.value;
                                                    setForm({ ...form, name: newName, slug: slugify(newName) });
                                                }}
                                                onBlur={(e) => handleUpdateSettings({ name: form.name, slug: form.slug })}
                                                placeholder="e.g. Sales Inquiry"
                                            />
                                        </div>
                                        <div className="field-block mt-4">
                                            <label className="field-label">Description</label>
                                            <textarea 
                                                className="input w-full min-h-[100px]" 
                                                value={form.description || ''} 
                                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                                onBlur={(e) => handleUpdateSettings({ description: e.target.value })}
                                                placeholder="Explain what this form is for..."
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="divider"></div>
                                <div className="setting-group">
                                    <label className="field-label">Form URL Slug</label>
                                    <div className="slug-preview">
                                        <span className="domain-prefix">router.cal/</span>
                                        <input 
                                            className="input-slug" 
                                            value={form.slug} 
                                            readOnly
                                            placeholder="unique-link-text"
                                        />
                                    </div>
                                    <p className="help-text">This is the unique part of your public link. Changing this will break existing links.</p>
                                </div>
                                <div className="divider"></div>
                                <div className="setting-group">
                                    <label className="field-label">Public Link</label>
                                    <div className="link-copy-box">
                                        <input className="input-link" readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/router/${form.slug}`} />
                                        <button className="btn btn-secondary btn-sm" onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/router/${form.slug}`);
                                            setEmbedCopied('link');
                                            setTimeout(() => setEmbedCopied(''), 2000);
                                        }}>{embedCopied === 'link' ? 'Copied!' : 'Copy'}</button>
                                    </div>
                                </div>
                                <div className="divider"></div>
                                <div className="setting-group">
                                    <h3 className="settings-section-title">Embed into Website</h3>
                                    <p className="settings-section-desc">Add this form to your website using an iframe.</p>
                                    <div className="mt-4">
                                        <pre style={{ 
                                            background: '#f8fafc', 
                                            border: '1px solid var(--border-color)', 
                                            borderRadius: '10px', 
                                            padding: '12px 14px', 
                                            fontSize: '12px', 
                                            color: '#64748b', 
                                            overflow: 'auto', 
                                            whiteSpace: 'pre-wrap', 
                                            wordBreak: 'break-all', 
                                            lineHeight: 1.6,
                                            marginBottom: '12px'
                                        }}>
                                            {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/router/${form.slug}" width="100%" height="700" frameborder="0" style="border:none; border-radius:8px;"></iframe>`}
                                        </pre>
                                        <button className="btn btn-secondary btn-sm" onClick={() => {
                                            const code = `<iframe src="${window.location.origin}/router/${form.slug}" width="100%" height="700" frameborder="0" style="border:none; border-radius:8px;"></iframe>`;
                                            navigator.clipboard.writeText(code);
                                            setEmbedCopied('embed');
                                            setTimeout(() => setEmbedCopied(''), 2000);
                                        }}>
                                            {embedCopied === 'embed' ? '✓ Code Copied!' : 'Copy Embed Code'}
                                        </button>
                                    </div>
                                </div>
                                <div className="divider"></div>
                                <div className="setting-group">
                                    <label className="checkbox-toggle">
                                        <input 
                                            type="checkbox" 
                                            checked={form.isActive} 
                                            onChange={(e) => handleUpdateSettings({ isActive: e.target.checked })}
                                        />
                                        <span className="toggle-label">Accept submissions for this form</span>
                                        {saving && <span className="btn-spinner small ml-3" style={{ borderTopColor: 'var(--primary)' }}></span>}
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
                :global(.question-card) {
                    display: flex;
                    padding: 0;
                    overflow: visible;
                    background: white;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                }
                :global(.q-drag-handle) {
                    width: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                    font-size: 20px;
                    cursor: grab;
                    background: #f8fafc;
                    border-right: 1px solid var(--border-light);
                    user-select: none;
                    border-top-left-radius: 12px;
                    border-bottom-left-radius: 12px;
                }
                :global(.q-drag-handle:active) { cursor: grabbing; }
                :global(.q-content) {
                    padding: 24px;
                    flex: 1;
                }
                :global(.q-row) {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                :global(.q-input-label) {
                    flex: 1;
                    font-size: 18px;
                    font-weight: 600;
                    border: 1px solid transparent;
                    padding: 4px 0;
                    color: var(--text-primary);
                    background: transparent;
                }
                :global(.q-input-label:focus) {
                    outline: none;
                    border-bottom: 2px solid var(--primary);
                }
                :global(.q-select-type) {
                    padding: 8px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: white;
                    font-size: 14px;
                    font-weight: 500;
                }
                :global(.q-footer) {
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                :global(.checkbox-toggle) {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }
                :global(.toggle-label) {
                    font-size: 13px;
                    font-weight: 500;
                    color: #64748b;
                }
                :global(.q-options-area) {
                    margin-top: 16px;
                }
                :global(.options-editor-list) {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 8px;
                }
                :global(.option-editor-row) {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                :global(.q-option-input) {
                    flex: 1;
                    padding: 8px 12px;
                    font-size: 14px;
                }
                :global(.btn-remove-opt) {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0 8px;
                }
                :global(.btn-remove-opt:hover) { color: var(--danger); }
                :global(.btn-add-opt) {
                    background: none;
                    border: 1px dashed #cbd5e1;
                    border-radius: 8px;
                    padding: 8px;
                    color: var(--primary);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 4px;
                }
                :global(.btn-add-opt:hover) {
                    background: #f0f7ff;
                    border-color: var(--primary);
                }
                :global(.btn-icon-danger) {
                    color: #94a3b8;
                    background: none;
                    transition: all 0.2s;
                    border: none;
                }
                :global(.btn-icon-danger:hover) {
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
                .conditions-container {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 16px;
                }
                .condition-row {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    background: white;
                    padding: 10px;
                    border-radius: 8px;
                    border: 1px solid #f1f5f9;
                    margin-bottom: 8px;
                }
                .condition-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-top: 12px;
                }
                .btn-remove-cond {
                    background: #fee2e2;
                    color: #ef4444;
                    border: none;
                    border-radius: 6px;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 18px;
                }
                .select-logic-type {
                    font-size: 12px;
                    padding: 4px 10px;
                    border-radius: 6px;
                    border: 1px solid #cbd5e1;
                    color: var(--primary);
                    font-weight: 600;
                    background: #f0f7ff;
                    cursor: pointer;
                }
                .mb-2 { margin-bottom: 8px; }
                .mt-3 { margin-top: 12px; }
                .ml-2 { margin-left: 8px; }
                .btn-ghost {
                    background: none;
                    border: none;
                    color: var(--primary);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                }
                .btn-ghost:hover { background: #f0f7ff; }
                .btn-sm { font-size: 12px; padding: 4px 8px; }
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
                
                .settings-section-title {
                    font-size: 16px;
                    font-weight: 700;
                    margin-bottom: 4px;
                    color: var(--text-primary);
                }
                .settings-section-desc {
                    font-size: 13px;
                    color: var(--text-tertiary);
                    margin-bottom: 24px;
                }
                .w-full { width: 100%; }
                .min-h-\[100px\] { min-height: 100px; }
                .mt-4 { margin-top: 16px; }
                
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
                .btn-spinner {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: btn-spin 0.6s linear infinite;
                    margin-right: 8px;
                    vertical-align: middle;
                }
                .btn-spinner.small {
                    width: 12px;
                    height: 12px;
                    border-width: 1.5px;
                    margin-right: 6px;
                    border-top-color: var(--primary);
                    border-color: var(--primary-light);
                }
                @keyframes btn-spin {
                    to { transform: rotate(360deg); }
                }

                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-tertiary);
                    padding: 6px 12px;
                    background: #f8fafc;
                    border-radius: 20px;
                    transition: all 0.3s ease;
                }
                .status-indicator.is-saving {
                    color: var(--primary);
                    background: var(--primary-light);
                    opacity: 0.8;
                }
                .status-indicator .dot {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                }
                .sync-spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid var(--primary-light);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: btn-spin 0.6s linear infinite;
                }
            `}</style>
        </div>
    );
}
