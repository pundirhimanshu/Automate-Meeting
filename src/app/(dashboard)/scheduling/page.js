'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const COLORS = ['#ff9500', '#0069ff', '#8b5cf6', '#00a854', '#e11d48', '#0d9488', '#f59e0b', '#6366f1'];

function SchedulingContent() {
    const { data: session } = useSession();
    const [eventTypes, setEventTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('event-types');
    const [search, setSearch] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [menuOpen, setMenuOpen] = useState(null);
    const [typeFilter, setTypeFilter] = useState('');
    const [showTypeFilter, setShowTypeFilter] = useState(false);

    // Availability state
    const [schedules, setSchedules] = useState([]);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [availabilityOpen, setAvailabilityOpen] = useState(false);
    const [availModal, setAvailModal] = useState(false);
    const [modalAvail, setModalAvail] = useState({});
    const [modalOverrides, setModalOverrides] = useState([]);
    const [modalSaving, setModalSaving] = useState(false);
    const [showAddOverride, setShowAddOverride] = useState(false);
    const [newOverride, setNewOverride] = useState({ date: '', mode: 'blocked', startTime: '09:00', endTime: '17:00' });
    const [teamMembers, setTeamMembers] = useState([]);

    // Single-use link drawer state
    const [sulDrawerOpen, setSulDrawerOpen] = useState(false);
    const [sulEventType, setSulEventType] = useState(null);
    const [sulContact, setSulContact] = useState({ name: '', email: '' });
    const [sulCreating, setSulCreating] = useState(false);
    const [sulCopiedLink, setSulCopiedLink] = useState('');

    // Embed modal state
    const [embedModal, setEmbedModal] = useState(null); // holds the event type object or null
    const [embedCopied, setEmbedCopied] = useState(''); // 'link' | 'inline' | 'popup' | ''

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState('create'); // 'create' or 'edit'
    const [drawerStep, setDrawerStep] = useState('type-picker'); // 'type-picker', 'invite', 'form'
    const [drawerLoading, setDrawerLoading] = useState(false);

    // Invite state
    const [inviteEmails, setInviteEmails] = useState([]);
    const [inviteInput, setInviteInput] = useState('');
    const [inviteSending, setInviteSending] = useState(false);
    const [invitesSent, setInvitesSent] = useState(false);

    const [form, setForm] = useState({
        title: '',
        description: '',
        duration: 30,
        type: 'one-on-one',
        color: '#ff9500',
        locationType: 'none',
        location: '',
        phoneCallSource: 'host',
        bufferTimeBefore: 0,
        bufferTimeAfter: 0,
        dateRangeType: 'indefinite',
        dateRangeDays: 60,
        maxBookingsPerDay: '',
        minNotice: 60,
        requiresPayment: false,
        price: '',
        customQuestions: [],
        coHostIds: [],
    });
    const [editId, setEditId] = useState(null);

    const searchParams = useSearchParams();

    useEffect(() => {
        fetchEventTypes();
        fetchSchedules();
        fetchTeamMembers();
    }, []);

    // Auto-open create drawer from sidebar button or query param
    useEffect(() => {
        const handler = () => openCreateDrawer();
        window.addEventListener('open-create-drawer', handler);
        return () => window.removeEventListener('open-create-drawer', handler);
    });

    useEffect(() => {
        if (searchParams.get('create') === 'true') {
            openCreateDrawer();
            // Clean up URL without full reload
            window.history.replaceState({}, '', '/scheduling');
        }
    }, [searchParams]);

    const fetchTeamMembers = async () => {
        try {
            const res = await fetch('/api/team');
            if (res.ok) {
                const data = await res.json();
                // Filter out current user and pending invites if you only want active members
                setTeamMembers(data.members?.filter(m => m.user.id !== session?.user?.id && !m.user.isPending) || []);
            }
        } catch (e) { console.error(e); }
    };

    const openSingleUseDrawer = (et) => {
        setSulEventType(et);
        setSulContact({ name: '', email: '' });
        setSulCopiedLink('');
        setSulDrawerOpen(true);
        setMenuOpen(null);
    };

    const closeSingleUseDrawer = () => {
        setSulDrawerOpen(false);
        setSulEventType(null);
        setSulContact({ name: '', email: '' });
        setSulCopiedLink('');
    };

    const convertToSingleUse = async (et) => {
        try {
            await fetch(`/api/event-types/${et.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isSingleUse: true }),
            });
            setEventTypes(prev => prev.map(e => e.id === et.id ? { ...e, isSingleUse: true } : e));
            setActiveTab('single-use');
            openSingleUseDrawer({ ...et, isSingleUse: true });
        } catch (e) { console.error(e); }
        setMenuOpen(null);
    };

    const convertToRegular = async (id) => {
        try {
            await fetch(`/api/event-types/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isSingleUse: false }),
            });
            setEventTypes(prev => prev.map(e => e.id === id ? { ...e, isSingleUse: false } : e));
            setActiveTab('event-types');
        } catch (e) { console.error(e); }
        setMenuOpen(null);
    };

    const createSingleUseLink = async () => {
        if (!sulEventType) return;
        setSulCreating(true);
        try {
            const res = await fetch('/api/single-use-links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventTypeId: sulEventType.id,
                    contactName: sulContact.name || null,
                    contactEmail: sulContact.email || null,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const link = `${window.location.origin}/book/s/${data.link.token}`;
                await navigator.clipboard.writeText(link);
                setSulCopiedLink(link);
            }
        } catch (e) { console.error(e); }
        finally { setSulCreating(false); }
    };

    const fetchEventTypes = async () => {
        try {
            const res = await fetch('/api/event-types');
            if (res.ok) {
                const data = await res.json();
                setEventTypes(data.eventTypes || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSchedules = async () => {
        try {
            const res = await fetch('/api/availability');
            if (res.ok) {
                const data = await res.json();
                const scheds = data.schedules || [];
                setSchedules(scheds);
                const defaultSched = scheds.find((s) => s.isDefault) || scheds[0];
                if (defaultSched) setSelectedSchedule(defaultSched);
            }
        } catch (e) { }
    };

    const openCreateDrawer = () => {
        setDrawerMode('create');
        setDrawerStep('type-picker');
        setEditId(null);
        setInviteEmails([]);
        setInviteInput('');
        setInvitesSent(false);
        setForm({
            title: '', description: '', duration: 30, type: 'one-on-one', color: '#ff9500',
            locationType: 'none', location: '', phoneCallSource: 'host', bufferTimeBefore: 0, bufferTimeAfter: 0, dateRangeType: 'indefinite',
            dateRangeDays: 60, maxBookingsPerDay: '', minNotice: 60, requiresPayment: false,
            price: '', customQuestions: [], coHostIds: [],
        });
        setDrawerOpen(true);
    };

    const selectEventType = (type) => {
        setForm((prev) => ({ ...prev, type }));
        if (type === 'one-on-one') {
            setDrawerStep('form');
        } else {
            setDrawerStep('invite');
        }
    };

    const addInviteEmail = () => {
        const email = inviteInput.trim().toLowerCase();
        if (!email) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
        if (inviteEmails.includes(email)) return;
        setInviteEmails((prev) => [...prev, email]);
        setInviteInput('');
    };

    const removeInviteEmail = (email) => {
        setInviteEmails((prev) => prev.filter((e) => e !== email));
    };

    const sendInvitations = async () => {
        if (inviteEmails.length === 0) return;
        setInviteSending(true);
        try {
            const res = await fetch('/api/event-types/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emails: inviteEmails, type: form.type }),
            });
            if (res.ok) {
                setInvitesSent(true);
            }
        } catch (e) { } finally {
            setInviteSending(false);
        }
    };

    const openEditDrawer = async (id) => {
        setDrawerMode('edit');
        setDrawerStep('form');
        setEditId(id);
        setDrawerOpen(true);
        setDrawerLoading(true);
        try {
            const res = await fetch(`/api/event-types/${id}`);
            if (res.ok) {
                const data = await res.json();
                setForm({
                    ...data.eventType,
                    locationType: data.eventType.locationType || 'none',
                    phoneCallSource: data.eventType.phoneCallSource || 'host',
                    maxBookingsPerDay: data.eventType.maxBookingsPerDay || '',
                    price: data.eventType.price || '',
                    customQuestions: data.eventType.customQuestions || [],
                    coHostIds: data.eventType.coHosts?.map(h => h.id) || [],
                });
            }
        } catch (e) { } finally {
            setDrawerLoading(false);
        }
        setMenuOpen(null);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
        setEditId(null);
    };

    const handleChange = (e) => {
        const { name, value, type: inputType, checked } = e.target;
        setForm((prev) => {
            const newState = {
                ...prev,
                [name]: inputType === 'checkbox' ? checked : value,
            };

            // Clear location if type changes to a non-text type
            if (name === 'locationType' && ['none', 'google_meet', 'zoom', 'teams'].includes(value)) {
                newState.location = '';
            }

            // Reset phone source if switching to phone
            if (name === 'locationType' && value === 'phone') {
                newState.phoneCallSource = 'host';
            }

            return newState;
        });
    };

    const addQuestion = () => {
        setForm((prev) => ({
            ...prev,
            customQuestions: [...prev.customQuestions, { question: '', type: 'text', required: false }],
        }));
    };

    const updateQuestion = (index, field, value) => {
        setForm((prev) => ({
            ...prev,
            customQuestions: prev.customQuestions.map((q, i) =>
                i === index ? { ...q, [field]: value } : q
            ),
        }));
    };

    const removeQuestion = (index) => {
        setForm((prev) => ({
            ...prev,
            customQuestions: prev.customQuestions.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        setDrawerLoading(true);

        const payload = {
            title: form.title,
            description: form.description,
            duration: parseInt(form.duration),
            type: form.type,
            color: form.color,
            locationType: form.locationType,
            location: form.location,
            phoneCallSource: form.phoneCallSource,
            bufferTimeBefore: parseInt(form.bufferTimeBefore),
            bufferTimeAfter: parseInt(form.bufferTimeAfter),
            dateRangeType: form.dateRangeType,
            dateRangeDays: form.dateRangeDays ? parseInt(form.dateRangeDays) : null,
            maxBookingsPerDay: form.maxBookingsPerDay ? parseInt(form.maxBookingsPerDay) : null,
            minNotice: parseInt(form.minNotice),
            requiresPayment: form.requiresPayment,
            price: form.price ? parseFloat(form.price) : null,
            customQuestions: (form.customQuestions || []).filter((q) => q.question.trim()),
            coHostIds: form.coHostIds,
        };

        try {
            if (drawerMode === 'create') {
                const res = await fetch('/api/event-types', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) {
                    fetchEventTypes();
                    closeDrawer();
                }
            } else {
                const res = await fetch(`/api/event-types/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) {
                    fetchEventTypes();
                    closeDrawer();
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDrawerLoading(false);
        }
    };

    const copyLink = (eventType) => {
        const username = session?.user?.username || 'user';
        const link = `${window.location.origin}/book/${username}/${eventType.slug}`;
        navigator.clipboard.writeText(link);
        setCopiedId(eventType.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleActive = async (id, currentState) => {
        try {
            await fetch(`/api/event-types/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentState }),
            });
            setEventTypes((prev) =>
                prev.map((et) => (et.id === id ? { ...et, isActive: !currentState } : et))
            );
        } catch (e) { }
        setMenuOpen(null);
    };

    const deleteEventType = async (id) => {
        if (!confirm('Are you sure you want to delete this event type?')) return;
        try {
            await fetch(`/api/event-types/${id}`, { method: 'DELETE' });
            setEventTypes((prev) => prev.filter((et) => et.id !== id));
        } catch (e) { }
        setMenuOpen(null);
    };

    const filtered = eventTypes.filter((et) => {
        const matchesSearch = et.title.toLowerCase().includes(search.toLowerCase());
        const matchesType = !typeFilter || et.type === typeFilter;
        if (activeTab === 'single-use') return matchesSearch && matchesType && et.isSingleUse;
        return matchesSearch && matchesType && !et.isSingleUse;
    });

    const typeLabel = (type) => {
        const labels = {
            'one-on-one': 'One-on-One',
            group: 'Group',
            collective: 'Collective',
            'round-robin': 'Round Robin',
        };
        return labels[type] || type;
    };

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">
                    Scheduling
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" style={{ cursor: 'help' }}>
                        <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </h1>
                <button className="btn btn-primary" onClick={openCreateDrawer}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create
                </button>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'event-types' ? 'active' : ''}`} onClick={() => setActiveTab('event-types')}>Event types</button>
                <button className={`tab ${activeTab === 'single-use' ? 'active' : ''}`} onClick={() => setActiveTab('single-use')}>Single-use links</button>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                <div className="filter-select">
                    My Calendly
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                <div className="search-input" style={{ flex: 1, maxWidth: '240px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input type="text" placeholder="Search event types" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="dropdown" style={{ position: 'relative' }}>
                    <button className={`filter-btn ${typeFilter ? 'active' : ''}`} onClick={() => setShowTypeFilter(!showTypeFilter)} style={typeFilter ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--primary-light)' } : {}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                        {typeFilter ? { 'one-on-one': 'One-on-One', 'group': 'Group', 'collective': 'Collective', 'round-robin': 'Round Robin' }[typeFilter] : 'Filter'}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                    {showTypeFilter && (
                        <div className="dropdown-menu" style={{ minWidth: '180px' }}>
                            <button className={`dropdown-item ${!typeFilter ? 'active' : ''}`} onClick={() => { setTypeFilter(''); setShowTypeFilter(false); }} style={!typeFilter ? { background: 'var(--primary-light)', color: 'var(--primary)' } : {}}>All types</button>
                            <div className="dropdown-divider" />
                            {[{ value: 'one-on-one', label: 'One-on-One' }, { value: 'group', label: 'Group' }, { value: 'collective', label: 'Collective' }, { value: 'round-robin', label: 'Round Robin' }].map(t => (
                                <button key={t.value} className={`dropdown-item ${typeFilter === t.value ? 'active' : ''}`} onClick={() => { setTypeFilter(t.value); setShowTypeFilter(false); }}
                                    style={typeFilter === t.value ? { background: 'var(--primary-light)', color: 'var(--primary)' } : {}}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {(search || typeFilter) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setTypeFilter(''); }} style={{ gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        Clear
                    </button>
                )}
            </div>

            {/* User Section */}
            <div className="user-section">
                <div className="user-section-left">
                    <div className="avatar" style={{ background: 'var(--primary)', fontSize: '0.75rem', width: '28px', height: '28px' }}>
                        {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="user-name">{session?.user?.name || 'User'}</span>
                </div>
                <a href={`/book/${session?.user?.username || 'user'}`} target="_blank" className="view-landing-link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                    View landing page
                </a>
            </div>

            {/* Event Types List */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📅</div>
                    <h3>No event types yet</h3>
                    <p>Create your first event type to start accepting bookings</p>
                    <button className="btn btn-primary" onClick={openCreateDrawer}>Create Event Type</button>
                </div>
            ) : (
                <div>
                    {filtered.map((et) => (
                        <div key={et.id} className="event-type-card" style={{ borderLeftColor: et.color, opacity: et.isActive ? 1 : 0.5 }}>
                            <input type="checkbox" className="checkbox event-checkbox" />
                            <div className="event-info">
                                <div className="event-title">
                                    <span style={{ cursor: 'pointer' }} onClick={() => openEditDrawer(et.id)}>{et.title}</span>
                                </div>
                                <div className="event-meta">
                                    <span className="dot" style={{ background: et.color }}></span>
                                    <span>{et.duration} min</span>
                                    <span>•</span>
                                    {et.location && <><span>{et.location}</span><span>•</span></>}
                                    <span>{typeLabel(et.type)}</span>
                                    <span>•</span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{et._count?.bookings || 0} bookings</span>
                                </div>
                                <div className="event-schedule">Weekdays, 9 am - 5 pm</div>
                            </div>
                            <div className="event-actions">
                                <button className="copy-link-btn" onClick={() => copyLink(et)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                    {copiedId === et.id ? 'Copied!' : 'Copy link'}
                                </button>
                                <div className="dropdown">
                                    <button className="kebab-btn" onClick={() => setMenuOpen(menuOpen === et.id ? null : et.id)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                                    </button>
                                    {menuOpen === et.id && (
                                        <div className="dropdown-menu" style={{ minWidth: '160px' }}>
                                            <button className="dropdown-item" onClick={() => openEditDrawer(et.id)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                Edit
                                            </button>
                                            {!et.isSingleUse && (
                                                <button className="dropdown-item" onClick={() => convertToSingleUse(et)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                                    Single-use link
                                                </button>
                                            )}
                                            {et.isSingleUse && (
                                                <>
                                                    <button className="dropdown-item" onClick={() => openSingleUseDrawer(et)}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                                        Create link
                                                    </button>
                                                    <button className="dropdown-item" onClick={() => convertToRegular(et.id)}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                                                        Move to Event Types
                                                    </button>
                                                </>
                                            )}
                                            <button className="dropdown-item" onClick={() => toggleActive(et.id, et.isActive)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    {et.isActive ? (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>) : (<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>)}
                                                </svg>
                                                {et.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <div className="dropdown-divider" />
                                            <button className="dropdown-item" onClick={() => { setEmbedModal(et); setEmbedCopied(''); setMenuOpen(null); }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                                                Add to website
                                            </button>
                                            <div className="dropdown-divider" />
                                            <button className="dropdown-item" onClick={() => deleteEventType(et.id)} style={{ color: 'var(--danger)' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}


                </div>
            )}

            {/* ===== CREATE / EDIT DRAWER ===== */}
            {drawerOpen && (
                <>
                    <div className="drawer-overlay" onClick={closeDrawer} />
                    <div className="drawer">
                        <div className="drawer-header">
                            <h2>{drawerMode === 'create' ? 'New Event Type' : 'Edit Event Type'}</h2>
                            <button className="drawer-close" onClick={closeDrawer}>✕</button>
                        </div>

                        {drawerLoading && drawerMode === 'edit' ? (
                            <div className="drawer-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="spinner" style={{ width: 28, height: 28 }}></div>
                            </div>

                        ) : drawerStep === 'type-picker' && drawerMode === 'create' ? (
                            /* ===== STEP 1: EVENT TYPE PICKER ===== */
                            <div className="drawer-body">
                                <div className="drawer-section">
                                    <div className="drawer-section-title">Event type</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                        {[
                                            { value: 'one-on-one', label: 'One-on-one', hosts: '1 host', arrow: '→', invitees: '1 invitee', desc: 'Good for coffee chats, 1:1 interviews, etc.' },
                                            { value: 'group', label: 'Group', hosts: '1 host', arrow: '→', invitees: 'Multiple invitees', desc: 'Webinars, online classes, etc.' },
                                            { value: 'round-robin', label: 'Round robin', hosts: 'Rotating hosts', arrow: '→', invitees: '1 invitee', desc: 'Distribute meetings between team members' },
                                            { value: 'collective', label: 'Collective', hosts: 'Multiple hosts', arrow: '→', invitees: '1 invitee', desc: 'Panel interviews, group sales calls, etc.' },
                                        ].map((t, i) => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => selectEventType(t.value)}
                                                style={{
                                                    display: 'flex', flexDirection: 'column', gap: '4px',
                                                    padding: '16px 0',
                                                    borderBottom: i < 3 ? '1px solid var(--border-light)' : 'none',
                                                    background: 'none', border: 'none', borderBottomStyle: i < 3 ? 'solid' : 'none',
                                                    cursor: 'pointer', textAlign: 'left', width: '100%',
                                                    transition: 'background 0.1s',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary)' }}>{t.label}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                                    {t.hosts} <span style={{ color: 'var(--text-tertiary)' }}>{t.arrow}</span> {t.invitees}
                                                </div>
                                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{t.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        ) : drawerStep === 'invite' && drawerMode === 'create' ? (
                            /* ===== STEP 2: INVITE USERS ===== */
                            <>
                                <div className="drawer-body">
                                    <div className="drawer-section">
                                        <div className="drawer-section-title">
                                            Invite team members
                                        </div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                            Add email addresses of people you'd like to join this <strong>{form.type.replace('-', ' ')}</strong> event type.
                                        </p>

                                        {/* Email Input */}
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                            <input
                                                className="input"
                                                type="email"
                                                placeholder="Enter email address"
                                                value={inviteInput}
                                                onChange={(e) => setInviteInput(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInviteEmail(); } }}
                                                style={{ flex: 1 }}
                                            />
                                            <button type="button" className="btn btn-secondary" onClick={addInviteEmail}>
                                                Add
                                            </button>
                                        </div>

                                        {/* Email Tags */}
                                        {inviteEmails.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                                {inviteEmails.map((email) => (
                                                    <div key={email} style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '6px 10px', background: 'var(--primary-light)',
                                                        borderRadius: '20px', fontSize: '0.8125rem',
                                                        color: 'var(--primary)', fontWeight: 500,
                                                    }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                        {email}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeInviteEmail(email)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, display: 'flex', fontSize: '0.875rem' }}
                                                        >✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Invite Sent Success */}
                                        {invitesSent && (
                                            <div style={{
                                                padding: '12px 16px', background: '#e8f5e9', borderRadius: 'var(--radius-md)',
                                                color: '#2e7d32', fontSize: '0.875rem', marginBottom: '16px',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                            }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                Invitations sent to {inviteEmails.length} team member{inviteEmails.length > 1 ? 's' : ''}!
                                            </div>
                                        )}

                                        {/* Role info */}
                                        <div style={{ padding: '14px', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px' }}>About {form.type.replace('-', ' ')} events</div>
                                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                                {form.type === 'group' && 'Multiple invitees can book the same time slot. Great for webinars, workshops, or classes.'}
                                                {form.type === 'round-robin' && 'Meetings are automatically distributed among team members. Each host takes turns.'}
                                                {form.type === 'collective' && 'All hosts must be available for a time slot to show. Perfect for panel interviews.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="drawer-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setDrawerStep('type-picker')}>Back</button>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {!invitesSent && inviteEmails.length > 0 && (
                                            <button type="button" className="btn btn-secondary" onClick={sendInvitations} disabled={inviteSending}>
                                                {inviteSending ? 'Sending...' : 'Send Invitations'}
                                            </button>
                                        )}
                                        <button type="button" className="btn btn-primary" onClick={() => setDrawerStep('form')}>
                                            {invitesSent ? 'Continue to Event Setup' : 'Skip & Continue'}
                                        </button>
                                    </div>
                                </div>
                            </>

                        ) : (
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                <div className="drawer-body">
                                    {/* Basic Info Section */}
                                    <div className="drawer-section">
                                        <div className="drawer-section-title">Basic Information</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            <div className="input-group">
                                                <label>Event Name *</label>
                                                <input name="title" className="input" placeholder="e.g., Quick Chat, Discovery Call" value={form.title} onChange={handleChange} required />
                                            </div>
                                            <div className="input-group">
                                                <label>Description</label>
                                                <textarea name="description" className="input" placeholder="Describe what this meeting is about..." value={form.description || ''} onChange={handleChange} rows={2} style={{ resize: 'vertical' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div className="input-group">
                                                    <label>Duration</label>
                                                    <select name="duration" className="input" value={form.duration} onChange={handleChange}>
                                                        {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
                                                    </select>
                                                </div>
                                                <div className="input-group">
                                                    <label>Type</label>
                                                    <select name="type" className="input" value={form.type} onChange={handleChange}>
                                                        <option value="one-on-one">One-on-One</option>
                                                        <option value="group">Group</option>
                                                        <option value="collective">Collective</option>
                                                        <option value="round-robin">Round Robin</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="input-group">
                                                <label>Location</label>
                                                <select name="locationType" className="input" value={form.locationType} onChange={handleChange}>
                                                    <option value="none">No location set</option>
                                                    <option value="google_meet">Google Meet</option>
                                                    <option value="zoom">Zoom</option>
                                                    <option value="teams">Microsoft Teams</option>
                                                    <option value="phone">Phone Call</option>
                                                    <option value="in_person">In Person</option>
                                                </select>
                                            </div>

                                            {form.locationType === 'phone' && (
                                                <div className="input-group" style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                                                    <label style={{ fontWeight: 600, marginBottom: '12px', display: 'block' }}>How will you get in touch?</label>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9375rem' }}>
                                                            <input
                                                                type="radio"
                                                                name="phoneCallSource"
                                                                value="invitee"
                                                                checked={form.phoneCallSource === 'invitee'}
                                                                onChange={handleChange}
                                                                style={{ width: '18px', height: '18px' }}
                                                            />
                                                            Require invitee's phone number.
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9375rem' }}>
                                                            <input
                                                                type="radio"
                                                                name="phoneCallSource"
                                                                value="host"
                                                                checked={form.phoneCallSource === 'host'}
                                                                onChange={handleChange}
                                                                style={{ width: '18px', height: '18px' }}
                                                            />
                                                            Provide a phone number to invitees after they book.
                                                        </label>
                                                    </div>

                                                    {form.phoneCallSource === 'host' && (
                                                        <div style={{ marginTop: '16px' }}>
                                                            <div style={{ position: 'relative' }}>
                                                                <input
                                                                    name="location"
                                                                    className="input"
                                                                    placeholder="Enter your phone number"
                                                                    value={form.location || ''}
                                                                    onChange={handleChange}
                                                                    required
                                                                    style={{ paddingLeft: '40px' }}
                                                                />
                                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>🇺🇸</span>
                                                            </div>
                                                            <p style={{ fontSize: '0.75rem', color: '#d93025', marginTop: '4px' }}>
                                                                A valid phone number is required.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {form.locationType === 'in_person' && (
                                                <div className="input-group">
                                                    <label style={{ fontWeight: 600 }}>Location name/address</label>
                                                    <textarea
                                                        name="location"
                                                        className="input"
                                                        placeholder="(e.g. Hollywood Bowl, 2301 Highland Ave, Los Angeles, CA 90068)"
                                                        value={form.location || ''}
                                                        onChange={handleChange}
                                                        required
                                                        rows={3}
                                                        style={{ resize: 'vertical' }}
                                                    />
                                                    <p style={{ fontSize: '0.75rem', color: '#d93025', marginTop: '4px' }}>
                                                        Physical location is required.
                                                    </p>
                                                </div>
                                            )}
                                            <div className="input-group">
                                                <label>Color</label>
                                                <div className="color-picker-row">
                                                    {COLORS.map((c) => (
                                                        <button key={c} type="button" className={`color-swatch ${form.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setForm((p) => ({ ...p, color: c }))} />
                                                    ))}
                                                </div>
                                            </div>

                                            {teamMembers.length > 0 && (
                                                <div className="input-group">
                                                    <label>Co-hosts</label>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                                                        Select team members to host this event with you.
                                                    </p>
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '8px',
                                                        padding: '12px',
                                                        background: 'var(--bg-page)',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-color)',
                                                        maxHeight: '150px',
                                                        overflowY: 'auto'
                                                    }}>
                                                        {teamMembers.map(member => (
                                                            <label key={member.user.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={form.coHostIds.includes(member.user.id)}
                                                                    onChange={(e) => {
                                                                        const ids = e.target.checked
                                                                            ? [...form.coHostIds, member.user.id]
                                                                            : form.coHostIds.filter(id => id !== member.user.id);
                                                                        setForm(prev => ({ ...prev, coHostIds: ids }));
                                                                    }}
                                                                />
                                                                <span style={{ fontWeight: 500 }}>{member.user.name}</span>
                                                                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>({member.user.email})</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Scheduling Section */}
                                    <div className="drawer-section">
                                        <div className="drawer-section-title">Scheduling Settings</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div className="input-group">
                                                    <label>Buffer before</label>
                                                    <select name="bufferTimeBefore" className="input" value={form.bufferTimeBefore} onChange={handleChange}>
                                                        {[0, 5, 10, 15, 30].map((v) => <option key={v} value={v}>{v === 0 ? 'None' : `${v} min`}</option>)}
                                                    </select>
                                                </div>
                                                <div className="input-group">
                                                    <label>Buffer after</label>
                                                    <select name="bufferTimeAfter" className="input" value={form.bufferTimeAfter} onChange={handleChange}>
                                                        {[0, 5, 10, 15, 30].map((v) => <option key={v} value={v}>{v === 0 ? 'None' : `${v} min`}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div className="input-group">
                                                    <label>Max bookings/day</label>
                                                    <input name="maxBookingsPerDay" type="number" className="input" placeholder="No limit" value={form.maxBookingsPerDay} onChange={handleChange} min={1} />
                                                </div>
                                                <div className="input-group">
                                                    <label>Min notice</label>
                                                    <select name="minNotice" className="input" value={form.minNotice} onChange={handleChange}>
                                                        {[0, 15, 30, 60, 120, 240, 1440].map((v) => <option key={v} value={v}>{v === 0 ? 'None' : v < 60 ? `${v} min` : `${v / 60}h`}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Availability Section */}
                                    <div className="drawer-section">
                                        <button
                                            type="button"
                                            onClick={() => setAvailabilityOpen(!availabilityOpen)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                                                padding: 0, marginBottom: availabilityOpen ? '16px' : 0,
                                            }}
                                        >
                                            <span className="drawer-section-title" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>Availability</span>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" style={{ transform: availabilityOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </button>

                                        {availabilityOpen && selectedSchedule && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                {/* Date Range */}
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '8px' }}>Date-range</div>
                                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                                        Invitees can schedule{' '}
                                                        <select name="dateRangeDays" className="input" value={form.dateRangeDays} onChange={handleChange}
                                                            style={{ width: 'auto', display: 'inline', padding: '2px 6px', fontSize: '0.8125rem', fontWeight: 600 }}
                                                        >
                                                            {[7, 14, 30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
                                                        </select>
                                                        {' '}into the future with at least{' '}
                                                        <select name="minNotice" className="input" value={form.minNotice} onChange={handleChange}
                                                            style={{ width: 'auto', display: 'inline', padding: '2px 6px', fontSize: '0.8125rem', fontWeight: 600 }}
                                                        >
                                                            <option value={0}>No</option>
                                                            <option value={60}>1 hour</option>
                                                            <option value={120}>2 hours</option>
                                                            <option value={240}>4 hours</option>
                                                            <option value={480}>8 hours</option>
                                                            <option value={1440}>24 hours</option>
                                                            <option value={2880}>48 hours</option>
                                                        </select>
                                                        {' '}notice
                                                    </div>
                                                </div>

                                                {/* Schedule Selector */}
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px' }}>
                                                        Schedule:
                                                        <select
                                                            className="input"
                                                            value={selectedSchedule?.id || ''}
                                                            onChange={(e) => {
                                                                const s = schedules.find((sc) => sc.id === e.target.value);
                                                                if (s) setSelectedSchedule(s);
                                                            }}
                                                            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}
                                                        >
                                                            {schedules.map((s) => (
                                                                <option key={s.id} value={s.id}>{s.name}{s.isDefault ? ' (default)' : ''}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Info box — click to open modal */}
                                                    <div
                                                        onClick={() => {
                                                            // Init modal state from selectedSchedule
                                                            const avail = {};
                                                            for (let i = 0; i < 7; i++) {
                                                                const dayAvails = selectedSchedule.availabilities?.filter((a) => a.dayOfWeek === i) || [];
                                                                avail[i] = dayAvails.length > 0
                                                                    ? { enabled: true, startTime: dayAvails[0].startTime, endTime: dayAvails[0].endTime }
                                                                    : { enabled: false, startTime: '09:00', endTime: '17:00' };
                                                            }
                                                            setModalAvail(avail);
                                                            setModalOverrides(selectedSchedule.dateOverrides || []);
                                                            setAvailModal(true);
                                                        }}
                                                        style={{
                                                            padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px',
                                                            cursor: 'pointer', transition: 'border-color 0.15s',
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                                    >
                                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                                            This event type uses the weekly and custom hours saved on the schedule
                                                        </span>
                                                        <span style={{ color: 'var(--text-tertiary)', display: 'flex' }} title="Edit schedule">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Weekly Hours */}
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '12px' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                                                        Weekly hours
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, i) => {
                                                            const dayAvail = selectedSchedule.availabilities?.filter((a) => a.dayOfWeek === i);
                                                            const isAvailable = dayAvail && dayAvail.length > 0;
                                                            return (
                                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div style={{
                                                                        width: '28px', height: '28px', borderRadius: '50%',
                                                                        background: isAvailable ? 'var(--primary)' : 'var(--bg-hover)',
                                                                        color: isAvailable ? '#fff' : 'var(--text-tertiary)',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                                                                    }}>
                                                                        {dayLabel}
                                                                    </div>
                                                                    <span style={{ fontSize: '0.8125rem', color: isAvailable ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                                                        {isAvailable
                                                                            ? dayAvail.map((a) => {
                                                                                const fmt = (t) => { const [h, m] = t.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true }); };
                                                                                return `${fmt(a.startTime)}  -  ${fmt(a.endTime)}`;
                                                                            }).join(', ')
                                                                            : 'Unavailable'
                                                                        }
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Timezone */}
                                                <div style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 500 }}>
                                                    {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}
                                                </div>

                                                {/* Date-specific hours */}
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                                                        Date-specific hours
                                                    </div>
                                                    {selectedSchedule.dateOverrides && selectedSchedule.dateOverrides.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {selectedSchedule.dateOverrides.map((ov, i) => {
                                                                const dateStr = typeof ov.date === 'string' && ov.date.includes('T') ? ov.date.split('T')[0] : ov.date;
                                                                const fmt = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true }); };
                                                                return (
                                                                    <div key={i} style={{ fontSize: '0.8125rem', color: ov.isBlocked ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                                                        {new Date(dateStr + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                                                        {ov.isBlocked ? ' — Blocked' : ` — ${fmt(ov.startTime)} - ${fmt(ov.endTime)}`}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>None</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Custom Questions Section */}
                                    <div className="drawer-section">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <div className="drawer-section-title" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>Custom Questions</div>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={addQuestion}>+ Add</button>
                                        </div>
                                        {form.customQuestions.length === 0 ? (
                                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>No custom questions. Invitees will only be asked for name and email.</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {form.customQuestions.map((q, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                        <input className="input" value={q.question} onChange={(e) => updateQuestion(i, 'question', e.target.value)} style={{ flex: 1 }} placeholder="Question..." />
                                                        <select className="input" value={q.type} onChange={(e) => updateQuestion(i, 'type', e.target.value)} style={{ width: '80px' }}>
                                                            <option value="text">Text</option>
                                                            <option value="textarea">Long</option>
                                                            <option value="select">Select</option>
                                                        </select>
                                                        <button type="button" className="drawer-close" onClick={() => removeQuestion(i)} style={{ color: 'var(--danger)', width: 24, height: 24, fontSize: '0.8rem' }}>✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Section */}
                                    <div className="drawer-section">
                                        <div className="drawer-section-title">Payment</div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem' }}>
                                            <input type="checkbox" name="requiresPayment" checked={form.requiresPayment} onChange={handleChange} />
                                            Require payment before booking
                                        </label>
                                        {form.requiresPayment && (
                                            <div className="input-group" style={{ marginTop: '10px' }}>
                                                <label>Price (USD)</label>
                                                <input name="price" type="number" className="input" placeholder="0.00" value={form.price} onChange={handleChange} min={0} step="0.01" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="drawer-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeDrawer}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={drawerLoading}>
                                        {drawerLoading ? 'Saving...' : drawerMode === 'create' ? 'Create Event Type' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </>
            )}

            {/* ===== AVAILABILITY EDITOR MODAL ===== */}
            {availModal && (
                <div className="modal-overlay" style={{ zIndex: 300 }} onClick={() => setAvailModal(false)}>
                    <div
                        className="modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '620px', width: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                    >
                        <div className="modal-header" style={{ flexShrink: 0 }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Availability</h2>
                            <button className="btn-icon btn-ghost" onClick={() => setAvailModal(false)}>✕</button>
                        </div>

                        <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                            {/* Working Hours Card */}
                            <div className="card" style={{ marginBottom: '20px' }}>
                                <div className="card-header">
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Working Hours</h3>
                                </div>
                                <div className="card-body">
                                    <div className="availability-grid">
                                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                                            <div key={i} className="availability-row">
                                                <div className="availability-day">
                                                    <button
                                                        type="button"
                                                        className={`availability-toggle ${modalAvail[i]?.enabled ? 'active' : ''}`}
                                                        onClick={() => setModalAvail((prev) => ({ ...prev, [i]: { ...prev[i], enabled: !prev[i].enabled } }))}
                                                    />
                                                    <span style={{ fontWeight: 500, color: modalAvail[i]?.enabled ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                                        {day}
                                                    </span>
                                                </div>
                                                {modalAvail[i]?.enabled ? (
                                                    <div className="availability-times">
                                                        <select className="time-input" value={modalAvail[i].startTime}
                                                            onChange={(e) => setModalAvail((prev) => ({ ...prev, [i]: { ...prev[i], startTime: e.target.value } }))}>
                                                            {(() => { const opts = []; for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30) { const t = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; const l = new Date(2000, 0, 1, h, m).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true }); opts.push(<option key={t} value={t}>{l}</option>); } return opts; })()}
                                                        </select>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                                                        <select className="time-input" value={modalAvail[i].endTime}
                                                            onChange={(e) => setModalAvail((prev) => ({ ...prev, [i]: { ...prev[i], endTime: e.target.value } }))}>
                                                            {(() => { const opts = []; for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30) { const t = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; const l = new Date(2000, 0, 1, h, m).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true }); opts.push(<option key={t} value={t}>{l}</option>); } return opts; })()}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>Unavailable</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Date Overrides Card */}
                            <div className="card">
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Date Overrides</h3>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddOverride(true)}>
                                        + Add Override
                                    </button>
                                </div>
                                <div className="card-body">
                                    {showAddOverride && (
                                        <div style={{ padding: '14px', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', marginBottom: modalOverrides.length > 0 ? '12px' : 0, border: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div className="input-group">
                                                    <label>Date</label>
                                                    <input type="date" className="input" value={newOverride.date} onChange={(e) => setNewOverride({ ...newOverride, date: e.target.value })} min={new Date().toISOString().split('T')[0]} />
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button type="button" className={`btn btn-sm ${newOverride.mode === 'blocked' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setNewOverride({ ...newOverride, mode: 'blocked' })} style={{ flex: 1 }}>🚫 Block Day</button>
                                                    <button type="button" className={`btn btn-sm ${newOverride.mode === 'custom' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setNewOverride({ ...newOverride, mode: 'custom' })} style={{ flex: 1 }}>🕐 Custom</button>
                                                </div>
                                                {newOverride.mode === 'custom' && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'end' }}>
                                                        <div className="input-group">
                                                            <label>From</label>
                                                            <select className="input" value={newOverride.startTime} onChange={(e) => setNewOverride({ ...newOverride, startTime: e.target.value })}>
                                                                {(() => { const opts = []; for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30) { const t = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; const l = new Date(2000, 0, 1, h, m).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true }); opts.push(<option key={t} value={t}>{l}</option>); } return opts; })()}
                                                            </select>
                                                        </div>
                                                        <span style={{ padding: '10px 0', color: 'var(--text-tertiary)' }}>—</span>
                                                        <div className="input-group">
                                                            <label>To</label>
                                                            <select className="input" value={newOverride.endTime} onChange={(e) => setNewOverride({ ...newOverride, endTime: e.target.value })}>
                                                                {(() => { const opts = []; for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30) { const t = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; const l = new Date(2000, 0, 1, h, m).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true }); opts.push(<option key={t} value={t}>{l}</option>); } return opts; })()}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddOverride(false)}>Cancel</button>
                                                    <button type="button" className="btn btn-primary btn-sm" disabled={!newOverride.date} onClick={() => {
                                                        const ov = { id: `temp-${Date.now()}`, date: newOverride.date, isBlocked: newOverride.mode === 'blocked', startTime: newOverride.mode === 'custom' ? newOverride.startTime : null, endTime: newOverride.mode === 'custom' ? newOverride.endTime : null };
                                                        setModalOverrides((prev) => [...prev, ov].sort((a, b) => new Date(a.date) - new Date(b.date)));
                                                        setNewOverride({ date: '', mode: 'blocked', startTime: '09:00', endTime: '17:00' });
                                                        setShowAddOverride(false);
                                                    }}>Add</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {modalOverrides.length === 0 && !showAddOverride ? (
                                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No date overrides set. Use these to block vacation days or set special hours for specific dates.</p>
                                    ) : (
                                        <div>
                                            {modalOverrides.map((ov, i) => {
                                                const dateStr = typeof ov.date === 'string' && ov.date.includes('T') ? ov.date.split('T')[0] : ov.date;
                                                const fmt = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true }); };
                                                return (
                                                    <div key={ov.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < modalOverrides.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                                                        <span style={{ fontSize: '0.8125rem' }}>
                                                            {new Date(dateStr + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                            <span style={{ color: ov.isBlocked ? 'var(--danger)' : 'var(--primary)', marginLeft: '8px', fontWeight: 500 }}>
                                                                {ov.isBlocked ? '🚫 Blocked' : `🕐 ${fmt(ov.startTime)} - ${fmt(ov.endTime)}`}
                                                            </span>
                                                        </span>
                                                        <button type="button" onClick={() => setModalOverrides((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ flexShrink: 0 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setAvailModal(false)}>Cancel</button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={modalSaving}
                                onClick={async () => {
                                    setModalSaving(true);
                                    try {
                                        const availabilities = [];
                                        Object.entries(modalAvail).forEach(([day, cfg]) => {
                                            if (cfg.enabled) availabilities.push({ dayOfWeek: parseInt(day), startTime: cfg.startTime, endTime: cfg.endTime });
                                        });
                                        const overrides = modalOverrides.map((d) => ({ date: d.date, isBlocked: d.isBlocked, startTime: d.isBlocked ? null : d.startTime, endTime: d.isBlocked ? null : d.endTime }));
                                        const res = await fetch('/api/availability', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ scheduleId: selectedSchedule.id, availabilities, dateOverrides: overrides }),
                                        });
                                        if (res.ok) {
                                            await fetchSchedules();
                                            setAvailModal(false);
                                        }
                                    } catch (e) { } finally {
                                        setModalSaving(false);
                                    }
                                }}
                            >
                                {modalSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== SINGLE-USE LINK DRAWER ===== */}
            {sulDrawerOpen && sulEventType && (
                <>
                    <div className="drawer-overlay" onClick={closeSingleUseDrawer} />
                    <div className="drawer">
                        <div className="drawer-header">
                            <h2>New Meeting</h2>
                            <button className="drawer-close" onClick={closeSingleUseDrawer}>✕</button>
                        </div>

                        <div className="drawer-body">
                            {/* Event type info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: sulEventType.color || '#ff9500' }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{sulEventType.title}</div>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                        {sulEventType.type === 'one-on-one' ? 'One-on-One' : sulEventType.type === 'group' ? 'Group' : sulEventType.type === 'collective' ? 'Collective' : 'Round Robin'}
                                    </div>
                                </div>
                            </div>

                            {/* Notice */}
                            <div style={{ padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                Changes here will not affect the event type
                            </div>

                            {/* Add a contact */}
                            <div className="drawer-section">
                                <div className="drawer-section-title">Add a contact <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span></div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
                                    Pre-fill your booking page with a contact's information
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <input
                                        className="input"
                                        placeholder="Contact name"
                                        value={sulContact.name}
                                        onChange={(e) => setSulContact(p => ({ ...p, name: e.target.value }))}
                                    />
                                    <input
                                        className="input"
                                        type="email"
                                        placeholder="Contact email"
                                        value={sulContact.email}
                                        onChange={(e) => setSulContact(p => ({ ...p, email: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Meeting Details */}
                            <div className="drawer-section">
                                <div className="drawer-section-title">Meeting details</div>
                                <div style={{ background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                    {/* Duration */}
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Duration</div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                            {sulEventType.duration} min
                                        </div>
                                    </div>
                                    {/* Location */}
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Location</div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                            {sulEventType.location || 'No location'}
                                        </div>
                                    </div>
                                    {/* Availability */}
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Availability</div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                            Weekdays, 9 am - 5 pm
                                        </div>
                                    </div>
                                    {/* Host */}
                                    <div style={{ padding: '14px 16px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Host</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                            <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '0.6875rem' }}>
                                                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                                {session?.user?.name || 'You'} <span style={{ color: 'var(--text-tertiary)' }}>(you)</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Success message */}
                            {sulCopiedLink && (
                                <div style={{ padding: '12px 14px', background: '#dcfce7', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--success)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                    Link copied to clipboard!
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="drawer-footer" style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                                disabled={sulCreating}
                                onClick={createSingleUseLink}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                {sulCreating ? 'Creating...' : sulCopiedLink ? 'Create another' : 'Create & copy link'}
                            </button>
                            <button
                                className="btn btn-primary"
                                disabled={!sulCopiedLink}
                                onClick={() => {
                                    if (sulCopiedLink) {
                                        const subject = encodeURIComponent(`Book a meeting: ${sulEventType.title}`);
                                        const body = encodeURIComponent(`Hi${sulContact.name ? ' ' + sulContact.name : ''},\n\nPlease use this link to book a meeting:\n${sulCopiedLink}\n\nNote: This is a single-use link and can only be used once.\n\nBest,\n${session?.user?.name || 'Automate Meetings'}`);
                                        window.open(`mailto:${sulContact.email || ''}?subject=${subject}&body=${body}`);
                                    }
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                Share
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ===== EMBED / ADD TO WEBSITE MODAL ===== */}
            {embedModal && (
                <div className="modal-overlay" onClick={() => setEmbedModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
                        <div className="modal-header">
                            <h2>Add to website</h2>
                            <button className="drawer-close" onClick={() => setEmbedModal(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Event info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: embedModal.color || '#ff9500' }} />
                                <span style={{ fontWeight: 600 }}>{embedModal.title}</span>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>• {embedModal.duration} min</span>
                            </div>

                            {/* Direct Link */}
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                    Direct Link
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input className="input" readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/book/${session?.user?.username || 'user'}/${embedModal.slug}`}
                                        style={{ flex: 1, fontSize: '0.8125rem', background: 'var(--bg-page)' }}
                                        onClick={(e) => e.target.select()} />
                                    <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/book/${session?.user?.username || 'user'}/${embedModal.slug}`);
                                        setEmbedCopied('link'); setTimeout(() => setEmbedCopied(''), 2000);
                                    }}>{embedCopied === 'link' ? '✓ Copied!' : 'Copy'}</button>
                                </div>
                            </div>

                            {/* Inline Embed */}
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                                    Inline Embed
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Embed the booking page directly into your website</p>
                                <div style={{ position: 'relative' }}>
                                    <pre style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
                                        {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/book/${session?.user?.username || 'user'}/${embedModal.slug}" width="100%" height="700" frameborder="0" style="border:none; border-radius:8px;"></iframe>`}
                                    </pre>
                                    <button className="btn btn-secondary btn-sm" style={{ position: 'absolute', top: '8px', right: '8px' }} onClick={() => {
                                        navigator.clipboard.writeText(`<iframe src="${window.location.origin}/book/${session?.user?.username}/${embedModal.slug}" width="100%" height="700" frameborder="0" style="border:none; border-radius:8px;"></iframe>`);
                                        setEmbedCopied('inline'); setTimeout(() => setEmbedCopied(''), 2000);
                                    }}>{embedCopied === 'inline' ? '✓ Copied!' : 'Copy'}</button>
                                </div>
                            </div>

                            {/* Popup Widget */}
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></svg>
                                    Popup Widget
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Add a button that opens the booking page in a popup</p>
                                <div style={{ position: 'relative' }}>
                                    <pre style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
                                        {`<a href="${typeof window !== 'undefined' ? window.location.origin : ''}/book/${session?.user?.username || 'user'}/${embedModal.slug}" target="_blank" style="display:inline-block; padding:12px 24px; background:#0069ff; color:#fff; border-radius:8px; font-weight:600; text-decoration:none; font-family:sans-serif;">Book a Meeting</a>`}
                                    </pre>
                                    <button className="btn btn-secondary btn-sm" style={{ position: 'absolute', top: '8px', right: '8px' }} onClick={() => {
                                        navigator.clipboard.writeText(`<a href="${window.location.origin}/book/${session?.user?.username}/${embedModal.slug}" target="_blank" style="display:inline-block; padding:12px 24px; background:#0069ff; color:#fff; border-radius:8px; font-weight:600; text-decoration:none; font-family:sans-serif;">Book a Meeting</a>`);
                                        setEmbedCopied('popup'); setTimeout(() => setEmbedCopied(''), 2000);
                                    }}>{embedCopied === 'popup' ? '✓ Copied!' : 'Copy'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SchedulingPage() {
    return (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>}>
            <SchedulingContent />
        </Suspense>
    );
}
