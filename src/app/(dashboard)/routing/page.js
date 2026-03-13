'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RoutingPage() {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newForm, setNewForm] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        try {
            const res = await fetch('/api/routing');
            const data = await res.json();
            if (data.forms) setForms(data.forms);
        } catch (error) {
            console.error('Error fetching forms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/routing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newForm),
            });
            const data = await res.json();
            if (data.form) {
                setForms([data.form, ...forms]);
                setIsCreateModalOpen(false);
                setNewForm({ name: '', description: '' });
                window.location.href = `/routing/${data.form.id}/edit`;
            }
        } catch (error) {
            console.error('Error creating form:', error);
        }
    };

    return (
        <div className="routing-container">
            <header className="page-header">
                <div>
                    <h1 className="page-title text-primary">Routing</h1>
                    <p className="text-secondary">Qualify and route meetings with dynamic forms.</p>
                </div>
                <button
                    className="btn btn-primary btn-lg"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <span className="icon">+</span> Create Routing Form
                </button>
            </header>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your forms...</p>
                </div>
            ) : forms.length === 0 ? (
                <div className="empty-card">
                    <div className="empty-icon-wrapper">
                        <span className="empty-icon">🔀</span>
                    </div>
                    <h2>No routing forms yet</h2>
                    <p>Build your first automated qualifier to start routing leads efficiently.</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        Create your first form
                    </button>
                </div>
            ) : (
                <div className="routing-grid">
                    {forms.map((form) => (
                        <div key={form.id} className="card routing-card">
                            <div className="routing-card-body">
                                <div className="routing-card-header">
                                    <div className="routing-info">
                                        <h3 className="routing-name">{form.name}</h3>
                                        <p className="routing-desc text-tertiary">
                                            {form.description || 'No description provided.'}
                                        </p>
                                    </div>
                                    <span className={`badge ${form.isActive ? 'badge-success' : 'badge-danger'}`}>
                                        {form.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                                
                                <div className="routing-card-stats">
                                    <Link href={`/routing/${form.id}/edit?tab=responses`} className="stat-item clickable-stat">
                                        <span className="stat-value">{form._count?.submissions || 0}</span>
                                        <span className="stat-label">Submissions</span>
                                    </Link>
                                    <div className="stat-item">
                                        <span className="stat-value">{form.questions?.length || 0}</span>
                                        <span className="stat-label">Questions</span>
                                    </div>
                                </div>
                            </div>

                            <div className="routing-card-footer">
                                <Link href={`/routing/${form.id}/edit`} className="btn btn-secondary btn-sm flex-1">
                                    Edit Form
                                </Link>
                                <Link 
                                    href={`/router/${form.slug}`} 
                                    target="_blank" 
                                    className="btn btn-ghost btn-sm"
                                    title="View Public Form"
                                >
                                    ↗
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isCreateModalOpen && (
                <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Routing Form</h2>
                            <button className="btn-close" onClick={() => setIsCreateModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label>Form Name</label>
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="e.g. Enterprise Sales Qualification"
                                        value={newForm.name}
                                        onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                    <small className="help-text">Give your form a recognizable name.</small>
                                </div>
                                <div className="input-group" style={{ marginTop: '20px' }}>
                                    <label>Description (Optional)</label>
                                    <textarea
                                        className="input"
                                        placeholder="Describe the purpose of this form..."
                                        value={newForm.description}
                                        onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Form</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .routing-container {
                    padding: 40px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 40px;
                }
                .page-title {
                    font-size: 32px;
                    font-weight: 800;
                    margin-bottom: 8px;
                    letter-spacing: -0.025em;
                }
                .routing-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 24px;
                }
                .routing-card {
                    display: flex;
                    flex-direction: column;
                    transition: all 0.2s ease;
                }
                .routing-card:hover {
                    box-shadow: var(--shadow-lg);
                    transform: translateY(-2px);
                }
                .routing-card-body {
                    padding: 24px;
                    flex: 1;
                }
                .routing-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 20px;
                    gap: 12px;
                }
                .routing-name {
                    font-size: 18px;
                    font-weight: 700;
                    margin-bottom: 4px;
                    color: var(--text-primary);
                }
                .routing-desc {
                    font-size: 13px;
                    line-height: 1.5;
                }
                .routing-card-stats {
                    display: flex;
                    gap: 24px;
                    margin-top: auto;
                }
                .stat-item {
                    display: flex;
                    flex-direction: column;
                }
                .clickable-stat {
                    cursor: pointer;
                    text-decoration: none;
                }
                .clickable-stat:hover .stat-value {
                    color: var(--primary);
                }
                .stat-value {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text-primary);
                    transition: color 0.1s;
                }
                .stat-label {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-tertiary);
                }
                .routing-card-footer {
                    padding: 16px 24px;
                    background: #fdfdfd;
                    border-top: 1px solid var(--border-light);
                    display: flex;
                    gap: 12px;
                }
                .empty-card {
                    background: white;
                    border: 2px dashed var(--border-color);
                    border-radius: var(--radius-xl);
                    padding: 60px 40px;
                    text-align: center;
                    max-width: 600px;
                    margin: 40px auto;
                }
                .empty-icon-wrapper {
                    font-size: 48px;
                    margin-bottom: 24px;
                }
                .empty-card h2 {
                    font-size: 20px;
                    font-weight: 700;
                    margin-bottom: 12px;
                }
                .empty-card p {
                    color: var(--text-secondary);
                    margin-bottom: 24px;
                    max-width: 400px;
                    margin-left: auto;
                    margin-right: auto;
                }
                .loading-state {
                    text-align: center;
                    padding: 100px 0;
                }
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--primary-light);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .btn-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: var(--text-tertiary);
                    cursor: pointer;
                }
                .flex-1 { flex: 1; }
                .help-text {
                    font-size: 12px;
                    color: var(--text-tertiary);
                    margin-top: 4px;
                }
            `}</style>
        </div>
    );
}
