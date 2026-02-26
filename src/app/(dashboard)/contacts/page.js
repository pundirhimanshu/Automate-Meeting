'use client';

import { useState, useEffect } from 'react';

const FIELD_TYPES = [
    { value: 'invitee', label: 'Invitee question (from event types)', icon: '📝' },
    { value: 'text', label: 'Text', icon: '📄' },
    { value: 'number', label: 'Number', icon: '#️⃣' },
    { value: 'currency', label: 'Currency', icon: '💰' },
    { value: 'tags', label: 'Tags', icon: '🏷️' },
    { value: 'date', label: 'Date', icon: '📅' },
    { value: 'select', label: 'Select', icon: '💜' },
];

const DEFAULT_COLUMNS = [
    { id: 'name', label: 'Name', visible: true, fixed: true },
    { id: 'email', label: 'Email', visible: true, fixed: true },
    { id: 'phone', label: 'Phone number', visible: true },
    { id: 'lastMeetingDate', label: 'Last meeting date', visible: true },
    { id: 'nextMeetingDate', label: 'Next meeting date', visible: true },
    { id: 'company', label: 'Company', visible: true },
];

export default function ContactsPage() {
    const [contacts, setContacts] = useState([]);
    const [customFields, setCustomFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [columns, setColumns] = useState(DEFAULT_COLUMNS);
    const [showColumnsMenu, setShowColumnsMenu] = useState(false);
    const [contactFilter, setContactFilter] = useState('all'); // 'all' | 'with-meetings' | 'no-meetings'
    const [showContactFilter, setShowContactFilter] = useState(false);
    const [companyFilter, setCompanyFilter] = useState('');
    const [showCompanyFilter, setShowCompanyFilter] = useState(false);

    // Add contact drawer
    const [addDrawer, setAddDrawer] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', company: '' });
    const [addFieldValues, setAddFieldValues] = useState({});
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState('');

    // Custom field drawer
    const [fieldDrawer, setFieldDrawer] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState('');
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);

    // Edit contact state
    const [editingCell, setEditingCell] = useState(null); // { contactId, column }
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        fetchContacts();
        fetchFields();
    }, []);

    const fetchContacts = async () => {
        try {
            const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
            const res = await fetch(`/api/contacts${searchParam}`);
            if (res.ok) {
                const data = await res.json();
                setContacts(data.contacts || []);
            }
        } catch (e) { } finally {
            setLoading(false);
        }
    };

    const fetchFields = async () => {
        try {
            const res = await fetch('/api/contacts/fields');
            if (res.ok) {
                const data = await res.json();
                setCustomFields(data.fields || []);
            }
        } catch (e) { }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(true);
            fetchContacts();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Add contact
    const handleAddContact = async (e) => {
        e.preventDefault();
        if (!addForm.name.trim() || !addForm.email.trim()) return;
        setAddLoading(true);
        setAddError('');

        try {
            const fv = Object.entries(addFieldValues)
                .filter(([_, v]) => v.trim())
                .map(([fieldId, value]) => ({ fieldId, value }));

            const res = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...addForm, fieldValues: fv }),
            });

            if (res.ok) {
                setAddDrawer(false);
                setAddForm({ name: '', email: '', phone: '', company: '' });
                setAddFieldValues({});
                fetchContacts();
            } else {
                const err = await res.json();
                setAddError(err.error || 'Failed to add contact');
            }
        } catch (e) {
            setAddError('Something went wrong');
        } finally {
            setAddLoading(false);
        }
    };

    // Delete contact
    const deleteContact = async (id) => {
        if (!confirm('Are you sure you want to delete this contact?')) return;
        try {
            await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
            setContacts((prev) => prev.filter((c) => c.id !== id));
        } catch (e) { }
    };

    // Inline edit
    const startEdit = (contactId, column, currentValue) => {
        setEditingCell({ contactId, column });
        setEditValue(currentValue || '');
    };

    const saveEdit = async () => {
        if (!editingCell) return;
        const { contactId, column } = editingCell;

        try {
            // Check if it's a custom field
            const isCustom = customFields.some((f) => f.id === column);

            if (isCustom) {
                await fetch(`/api/contacts/${contactId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fieldValues: [{ fieldId: column, value: editValue }] }),
                });
            } else {
                await fetch(`/api/contacts/${contactId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [column]: editValue }),
                });
            }

            fetchContacts();
        } catch (e) { }
        setEditingCell(null);
    };

    // Create custom field
    const createField = async () => {
        if (!newFieldName.trim() || !newFieldType) return;
        try {
            const res = await fetch('/api/contacts/fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFieldName, type: newFieldType }),
            });
            if (res.ok) {
                setNewFieldName('');
                setNewFieldType('');
                fetchFields();
                setFieldDrawer(false);
            }
        } catch (e) { }
    };

    // Delete custom field
    const deleteField = async (id) => {
        if (!confirm('Delete this custom field? Values for all contacts will be lost.')) return;
        try {
            await fetch(`/api/contacts/fields?id=${id}`, { method: 'DELETE' });
            fetchFields();
            fetchContacts();
        } catch (e) { }
    };

    const toggleColumn = (id) => {
        setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en', { month: 'numeric', day: 'numeric', year: 'numeric' });
    };

    const getFieldValue = (contact, fieldId) => {
        const fv = contact.fieldValues?.find((v) => v.fieldId === fieldId);
        return fv?.value || '';
    };

    const allColumns = [
        ...columns,
        ...customFields.map((f) => ({ id: f.id, label: f.name, visible: true, custom: true, type: f.type })),
    ];

    const visibleCols = allColumns.filter((c) => c.visible);

    // Apply client-side filters
    const uniqueCompanies = [...new Set(contacts.filter(c => c.company).map(c => c.company))];
    const filteredContacts = contacts.filter(c => {
        if (contactFilter === 'with-meetings' && !c.nextMeetingDate && !c.lastMeetingDate) return false;
        if (contactFilter === 'no-meetings' && (c.nextMeetingDate || c.lastMeetingDate)) return false;
        if (companyFilter && c.company !== companyFilter) return false;
        return true;
    });

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">Contacts</h1>
                <button className="btn btn-primary" onClick={() => setAddDrawer(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add contact
                </button>
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div className="dropdown" style={{ position: 'relative' }}>
                    <div className="filter-select" onClick={() => setShowContactFilter(!showContactFilter)} style={{ cursor: 'pointer' }}>
                        {contactFilter === 'all' ? 'All contacts' : contactFilter === 'with-meetings' ? 'With meetings' : 'No meetings'}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                    {showContactFilter && (
                        <div className="dropdown-menu" style={{ minWidth: '180px' }}>
                            {[{ v: 'all', l: 'All contacts' }, { v: 'with-meetings', l: 'With meetings' }, { v: 'no-meetings', l: 'No meetings' }].map(o => (
                                <button key={o.v} className={`dropdown-item ${contactFilter === o.v ? 'active' : ''}`} onClick={() => { setContactFilter(o.v); setShowContactFilter(false); }}
                                    style={contactFilter === o.v ? { background: 'var(--primary-light)', color: 'var(--primary)' } : {}}>
                                    {o.l}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="search-input" style={{ flex: 1, maxWidth: '240px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input type="text" placeholder="Search by name and email" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                <div className="dropdown" style={{ position: 'relative' }}>
                    <button className={`btn btn-secondary btn-sm ${companyFilter ? 'active' : ''}`} style={{ gap: '4px', ...(companyFilter ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--primary-light)' } : {}) }} onClick={() => setShowCompanyFilter(!showCompanyFilter)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                        {companyFilter || 'Filter'}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                    {showCompanyFilter && (
                        <div className="dropdown-menu" style={{ minWidth: '200px', maxHeight: '300px', overflow: 'auto' }}>
                            <button className={`dropdown-item ${!companyFilter ? 'active' : ''}`} onClick={() => { setCompanyFilter(''); setShowCompanyFilter(false); }}
                                style={!companyFilter ? { background: 'var(--primary-light)', color: 'var(--primary)' } : {}}>All companies</button>
                            {uniqueCompanies.length > 0 && <div className="dropdown-divider" />}
                            {uniqueCompanies.map(c => (
                                <button key={c} className={`dropdown-item ${companyFilter === c ? 'active' : ''}`} onClick={() => { setCompanyFilter(c); setShowCompanyFilter(false); }}
                                    style={companyFilter === c ? { background: 'var(--primary-light)', color: 'var(--primary)' } : {}}>
                                    {c}
                                </button>
                            ))}
                            {uniqueCompanies.length === 0 && (
                                <div style={{ padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>No companies found</div>
                            )}
                        </div>
                    )}
                </div>

                {(contactFilter !== 'all' || companyFilter) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => { setContactFilter('all'); setCompanyFilter(''); }} style={{ gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        Clear
                    </button>
                )}

                <div className="dropdown" style={{ position: 'relative' }}>
                    <button className="btn btn-secondary btn-sm" style={{ gap: '4px' }} onClick={() => setShowColumnsMenu(!showColumnsMenu)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                        Columns
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>

                    {showColumnsMenu && (
                        <div className="dropdown-menu" style={{ minWidth: '200px', padding: '8px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', padding: '4px 8px', marginBottom: '4px', textTransform: 'uppercase' }}>Toggle Columns</div>
                            {allColumns.map((col) => (
                                <label key={col.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
                                    fontSize: '0.8125rem', cursor: col.fixed ? 'not-allowed' : 'pointer',
                                    opacity: col.fixed ? 0.5 : 1, borderRadius: 'var(--radius-sm)',
                                }}>
                                    <input type="checkbox" checked={col.visible} disabled={col.fixed} onChange={() => toggleColumn(col.id)} />
                                    {col.label}
                                </label>
                            ))}
                            <div className="dropdown-divider" />
                            <button className="dropdown-item" onClick={() => { setFieldDrawer(true); setShowColumnsMenu(false); }} style={{ color: 'var(--primary)', fontWeight: 500 }}>
                                + Add custom field
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'auto', background: 'var(--bg-white)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${visibleCols.length * 160}px` }}>
                    <thead>
                        <tr>
                            {visibleCols.map((col) => (
                                <th
                                    key={col.id}
                                    style={{
                                        padding: '10px 16px', textAlign: 'left', fontSize: '0.8125rem',
                                        fontWeight: 600, color: 'var(--text-secondary)',
                                        borderBottom: '1px solid var(--border-color)',
                                        background: 'var(--bg-page)', whiteSpace: 'nowrap',
                                        position: 'relative',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        {col.label}
                                        {col.custom && (
                                            <button
                                                onClick={() => deleteField(col.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex' }}
                                                title="Remove field"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-page)', width: '40px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && filteredContacts.length === 0 ? (
                            <tr>
                                <td colSpan={visibleCols.length + 1} style={{ padding: '40px', textAlign: 'center' }}>
                                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                                </td>
                            </tr>
                        ) : filteredContacts.length === 0 ? (
                            <tr>
                                <td colSpan={visibleCols.length + 1} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                    {contacts.length === 0 ? 'No contacts found. Add your first contact to get started.' : 'No contacts match the current filters.'}
                                </td>
                            </tr>
                        ) : (
                            filteredContacts.map((contact) => (
                                <tr key={contact.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    {visibleCols.map((col) => {
                                        let value;
                                        if (col.custom) {
                                            value = getFieldValue(contact, col.id);
                                        } else if (col.id === 'name') {
                                            value = contact.name;
                                        } else if (col.id === 'email') {
                                            value = contact.email;
                                        } else if (col.id === 'phone') {
                                            value = contact.phone || '';
                                        } else if (col.id === 'company') {
                                            value = contact.company || '';
                                        } else if (col.id === 'lastMeetingDate') {
                                            value = formatDate(contact.lastMeetingDate);
                                        } else if (col.id === 'nextMeetingDate') {
                                            value = formatDate(contact.nextMeetingDate);
                                        }

                                        const isEditing = editingCell?.contactId === contact.id && editingCell?.column === col.id;
                                        const isEditable = !['lastMeetingDate', 'nextMeetingDate'].includes(col.id);

                                        return (
                                            <td
                                                key={col.id}
                                                style={{
                                                    padding: '10px 16px', fontSize: '0.8125rem',
                                                    color: col.id === 'email' ? 'var(--primary)' : 'var(--text-primary)',
                                                    cursor: isEditable ? 'pointer' : 'default',
                                                    maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}
                                                onClick={() => isEditable && !isEditing && startEdit(contact.id, col.id, value)}
                                            >
                                                {isEditing ? (
                                                    <input
                                                        autoFocus
                                                        className="input"
                                                        style={{ padding: '4px 8px', fontSize: '0.8125rem', width: '100%' }}
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={saveEdit}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                                    />
                                                ) : (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                        {col.id === 'name' && (
                                                            <span style={{
                                                                width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-light)',
                                                                color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '0.625rem', fontWeight: 700, flexShrink: 0,
                                                            }}>
                                                                {contact.name?.charAt(0)?.toUpperCase()}
                                                            </span>
                                                        )}
                                                        {value || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => deleteContact(contact.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}
                                            title="Delete contact"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '12px', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
                {filteredContacts.length !== contacts.length && <span> (of {contacts.length} total)</span>}
            </div>

            {/* ===== ADD CONTACT DRAWER ===== */}
            {addDrawer && (
                <>
                    <div className="drawer-overlay" onClick={() => setAddDrawer(false)} />
                    <div className="drawer">
                        <div className="drawer-header">
                            <h2>Add Contact</h2>
                            <button className="drawer-close" onClick={() => setAddDrawer(false)}>✕</button>
                        </div>
                        <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <div className="drawer-body">
                                {addError && (
                                    <div style={{ padding: '10px 14px', background: '#fce4ec', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.8125rem', marginBottom: '16px' }}>
                                        {addError}
                                    </div>
                                )}

                                <div className="drawer-section">
                                    <div className="drawer-section-title">Contact Information</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div className="input-group">
                                            <label>Name *</label>
                                            <input className="input" placeholder="Full name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
                                        </div>
                                        <div className="input-group">
                                            <label>Email *</label>
                                            <input className="input" type="email" placeholder="email@example.com" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
                                        </div>
                                        <div className="input-group">
                                            <label>Phone</label>
                                            <input className="input" placeholder="+1 (555) 000-0000" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
                                        </div>
                                        <div className="input-group">
                                            <label>Company</label>
                                            <input className="input" placeholder="Company name" value={addForm.company} onChange={(e) => setAddForm({ ...addForm, company: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                {customFields.length > 0 && (
                                    <div className="drawer-section">
                                        <div className="drawer-section-title">Custom Fields</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            {customFields.map((f) => (
                                                <div key={f.id} className="input-group">
                                                    <label>{f.name}</label>
                                                    <input
                                                        className="input"
                                                        type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                                                        placeholder={f.name}
                                                        value={addFieldValues[f.id] || ''}
                                                        onChange={(e) => setAddFieldValues({ ...addFieldValues, [f.id]: e.target.value })}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="drawer-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setAddDrawer(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                                    {addLoading ? 'Adding...' : 'Add Contact'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* ===== CREATE CUSTOM FIELD DRAWER ===== */}
            {fieldDrawer && (
                <>
                    <div className="drawer-overlay" onClick={() => setFieldDrawer(false)} />
                    <div className="drawer">
                        <div className="drawer-header">
                            <h2>Create a custom field</h2>
                            <button className="drawer-close" onClick={() => setFieldDrawer(false)}>✕</button>
                        </div>
                        <div className="drawer-body">
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: '20px' }}>
                                Custom fields will be applied to all contact records.
                            </p>

                            <div className="input-group" style={{ marginBottom: '16px' }}>
                                <label>Field name</label>
                                <input
                                    className="input"
                                    placeholder="e.g., Department, Lead Source..."
                                    value={newFieldName}
                                    onChange={(e) => setNewFieldName(e.target.value)}
                                />
                            </div>

                            <div className="input-group">
                                <label>Field type</label>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        type="button"
                                        className="input w-full"
                                        onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            cursor: 'pointer', textAlign: 'left',
                                            color: newFieldType ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                            borderColor: showTypeDropdown ? 'var(--primary)' : 'var(--border-color)',
                                            boxShadow: showTypeDropdown ? '0 0 0 3px rgba(0, 105, 255, 0.12)' : 'none',
                                        }}
                                    >
                                        {newFieldType ? FIELD_TYPES.find((t) => t.value === newFieldType)?.label || 'Select an option' : 'Select an option'}
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showTypeDropdown ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>

                                    {showTypeDropdown && (
                                        <div style={{
                                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                                            background: 'var(--bg-white)', border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                                            zIndex: 10, overflow: 'hidden',
                                        }}>
                                            {FIELD_TYPES.map((type) => (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => { setNewFieldType(type.value); setShowTypeDropdown(false); }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        padding: '10px 14px', width: '100%', background: newFieldType === type.value ? 'var(--primary-light)' : 'transparent',
                                                        border: 'none', cursor: 'pointer', fontSize: '0.875rem',
                                                        color: 'var(--text-primary)', textAlign: 'left',
                                                        borderBottom: '1px solid var(--border-light)',
                                                        transition: 'background 0.1s',
                                                    }}
                                                    onMouseEnter={(e) => { if (newFieldType !== type.value) e.target.style.background = 'var(--bg-hover)'; }}
                                                    onMouseLeave={(e) => { if (newFieldType !== type.value) e.target.style.background = 'transparent'; }}
                                                >
                                                    <span style={{ fontSize: '1rem' }}>{type.icon}</span>
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Existing custom fields */}
                            {customFields.length > 0 && (
                                <div style={{ marginTop: '24px' }}>
                                    <div className="drawer-section-title">Existing Custom Fields</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                        {customFields.map((f, i) => (
                                            <div key={f.id} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '10px 0', borderBottom: i < customFields.length - 1 ? '1px solid var(--border-light)' : 'none',
                                            }}>
                                                <div>
                                                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{f.name}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: '8px' }}>
                                                        ({FIELD_TYPES.find((t) => t.value === f.type)?.label || f.type})
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => deleteField(f.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="drawer-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setFieldDrawer(false)}>Cancel</button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={createField}
                                disabled={!newFieldName.trim() || !newFieldType}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
