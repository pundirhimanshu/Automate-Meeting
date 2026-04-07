'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function StartPageEditor() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('details'); // details, styling, meetings
    const [viewMode, setViewMode] = useState('desktop'); // desktop, mobile

    const [user, setUser] = useState(null);
    const [eventTypes, setEventTypes] = useState([]);

    const [form, setForm] = useState({
        pageAboutMe: '',
        pageHeadline: '',
        pageSocialYouTube: '',
        pageSocialFacebook: '',
        pageSocialWhatsApp: '',
        pageSocialInstagram: '',
        pageSidePanelColor: '#d946ef',
        pageSelectedEventTypes: '', // comma separated string
        pageImage: '',
        pageSchedulerHeader: '',
    });

    useEffect(() => {
        Promise.all([
            fetch('/api/user/page').then(res => res.json()),
            fetch('/api/event-types').then(res => res.json())
        ]).then(([userData, eventsData]) => {
            setUser(userData);
            setEventTypes(eventsData.eventTypes || []);
            setForm({
                pageAboutMe: userData.pageAboutMe || '',
                pageHeadline: userData.pageHeadline || '',
                pageSocialYouTube: userData.pageSocialYouTube || '',
                pageSocialFacebook: userData.pageSocialFacebook || '',
                pageSocialWhatsApp: userData.pageSocialWhatsApp || '',
                pageSocialInstagram: userData.pageSocialInstagram || '',
                pageSidePanelColor: userData.pageSidePanelColor || '#d946ef',
                pageSelectedEventTypes: userData.pageSelectedEventTypes || '',
                pageImage: userData.pageImage || '',
                pageSchedulerHeader: userData.pageSchedulerHeader || '',
            });
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load data', err);
            setLoading(false);
        });
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('File is too large. Maximum size is 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(f => ({ ...f, pageImage: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const toggleEventSelection = (eventId) => {
        const selected = form.pageSelectedEventTypes ? form.pageSelectedEventTypes.split(',') : [];
        if (selected.includes(eventId)) {
            setForm({ ...form, pageSelectedEventTypes: selected.filter(id => id !== eventId).join(',') });
        } else {
            setForm({ ...form, pageSelectedEventTypes: [...selected, eventId].join(',') });
        }
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/user/page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                // update user context if needed
            } else {
                alert('Failed to save changes');
            }
        } catch (e) {
            alert('Error saving changes');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><div className="spinner"></div></div>;

    const selectedEvents = eventTypes.filter(ev =>
        (form.pageSelectedEventTypes || '').split(',').includes(ev.id)
    );

    const presetColors = ['#d946ef', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#14b8a6', '#f43f5e', '#000000'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f9fafb' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                .page-content {
                    max-width: none !important;
                    padding: 0 !important;
                    height: calc(100vh - 56px) !important;
                    display: flex;
                    flex-direction: column;
                }
            `}} />
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#fff', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px' }}>
                    <button
                        className={`btn btn-sm ${viewMode === 'mobile' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('mobile')}
                        style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                        Mobile
                    </button>
                    <button
                        className={`btn btn-sm ${viewMode === 'desktop' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('desktop')}
                        style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                        Desktop
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className={`btn btn-icon ${activeTab === 'details' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActiveTab('details')}
                        title="Details"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </button>
                    <button
                        className={`btn btn-icon ${activeTab === 'styling' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActiveTab('styling')}
                        title="Appearance"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.5 2.5a4.243 4.243 0 0 0-6 0L8.5 8.5C8 9 7.5 10.5 7 12c1.5-.5 3-1 3.5-1.5l6-6a4.243 4.243 0 0 0 0-6Z"/>
                            <path d="M7 12l2 2-3 3c-2 2-4 2-4 2s0-2 2-4l3-3Z"/>
                        </svg>
                    </button>
                    <button
                        className={`btn btn-icon ${activeTab === 'meetings' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActiveTab('meetings')}
                        title="Meetings"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-primary" onClick={saveChanges} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <Link href={`/${user?.username}`} target="_blank" className="btn btn-outline" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        Live page
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                    </Link>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Left Panel: Editor */}
                <div style={{ width: '400px', backgroundColor: '#fff', borderRight: '1px solid var(--border-light)', padding: '24px', overflowY: 'auto' }}>

                    {activeTab === 'details' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Personal Details</h2>

                            <div className="input-group">
                                <label>Headline</label>
                                <input name="pageHeadline" className="input" placeholder="e.g. Product Designer" value={form.pageHeadline} onChange={handleChange} />
                            </div>

                            <div className="input-group">
                                <label>About Me</label>
                                <textarea name="pageAboutMe" className="input" rows="4" placeholder="Tell visitors about yourself..." value={form.pageAboutMe} onChange={handleChange} />
                            </div>

                            <div className="input-group">
                                <label>Custom Profile Image</label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    {form.pageImage && (
                                        <div style={{ position: 'relative' }}>
                                            <img src={form.pageImage} alt="Preview" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                                            <button onClick={() => setForm(f => ({ ...f, pageImage: '' }))} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="input"
                                        style={{ padding: '8px', cursor: 'pointer' }}
                                    />
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>Max size 2MB. If empty, your default avatar will be used.</span>
                            </div>

                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '10px' }}>Social Links</h3>

                            <div className="input-group">
                                <label>YouTube</label>
                                <input name="pageSocialYouTube" className="input" placeholder="https://youtube.com/..." value={form.pageSocialYouTube} onChange={handleChange} />
                            </div>
                            <div className="input-group">
                                <label>Facebook</label>
                                <input name="pageSocialFacebook" className="input" placeholder="https://facebook.com/..." value={form.pageSocialFacebook} onChange={handleChange} />
                            </div>
                            <div className="input-group">
                                <label>WhatsApp</label>
                                <input name="pageSocialWhatsApp" className="input" placeholder="https://wa.me/..." value={form.pageSocialWhatsApp} onChange={handleChange} />
                            </div>
                            <div className="input-group">
                                <label>Instagram</label>
                                <input name="pageSocialInstagram" className="input" placeholder="https://instagram.com/..." value={form.pageSocialInstagram} onChange={handleChange} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'styling' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Appearance</h2>

                            <div className="input-group">
                                <label>Side Panel Color</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                                    {presetColors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setForm(f => ({ ...f, pageSidePanelColor: color }))}
                                            style={{
                                                width: '40px', height: '40px', borderRadius: '8px',
                                                backgroundColor: color, border: 'none', cursor: 'pointer',
                                                boxShadow: form.pageSidePanelColor === color ? '0 0 0 2px white, 0 0 0 4px var(--primary)' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        />
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px' }}>
                                    <input
                                        type="color"
                                        name="pageSidePanelColor"
                                        value={form.pageSidePanelColor}
                                        onChange={handleChange}
                                        style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{form.pageSidePanelColor}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'meetings' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Scheduler Settings</h2>

                            <div className="input-group">
                                <label>Scheduler Header Text</label>
                                <input name="pageSchedulerHeader" className="input" placeholder="e.g. Book a meeting with me" value={form.pageSchedulerHeader} onChange={handleChange} />
                            </div>

                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '10px' }}>Visible Event Types</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {eventTypes.filter(e => e.isActive).map(event => {
                                    const isSelected = (form.pageSelectedEventTypes || '').split(',').includes(event.id);
                                    return (
                                        <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', backgroundColor: isSelected ? 'var(--bg-secondary)' : '#fff' }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleEventSelection(event.id)}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{event.title}</div>
                                                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>{event.duration} min</div>
                                            </div>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: event.color }} />
                                        </div>
                                    )
                                })}
                                {eventTypes.length === 0 && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>You don't have any event types yet.</p>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Panel: Preview */}
                <div style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
                    <div style={{
                        width: viewMode === 'mobile' ? '375px' : '900px',
                        height: viewMode === 'mobile' ? '812px' : 'auto',
                        minHeight: viewMode === 'desktop' ? '600px' : '812px',
                        backgroundColor: '#fff',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        borderRadius: viewMode === 'mobile' ? '40px' : '16px',
                        border: viewMode === 'mobile' ? '8px solid #111' : '1px solid var(--border-light)',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: viewMode === 'mobile' ? 'column' : 'row'
                    }}>

                        {/* Preview: Left / Top Panel */}
                        <div style={{
                            flex: viewMode === 'mobile' ? 'none' : '0 0 350px',
                            padding: '40px 30px',
                            backgroundColor: form.pageSidePanelColor,
                            color: '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center'
                        }}>
                            <img
                                src={form.pageImage || user?.avatar || user?.logo || '/uploads/avatars/default.png'}
                                alt={user?.name}
                                style={{ width: '120px', height: '120px', borderRadius: '24px', objectFit: 'cover', marginBottom: '24px', border: '4px solid rgba(255,255,255,0.2)' }}
                                onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E"; e.target.style.background = "rgba(255,255,255,0.2)"; e.target.style.padding = "20px"; }}
                            />
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>{user?.name || 'Your Name'}</h1>
                            <p style={{ fontSize: '1rem', opacity: 0.9, margin: 0, fontWeight: 500 }}>{form.pageHeadline || 'Your Headline'}</p>

                            <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
                                <button style={{ width: '100%', padding: '14px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
                                    Start your Page
                                </button>
                                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '12px', fontWeight: 500 }}>
                                    Powered by SCHEDULER
                                </div>
                            </div>
                        </div>

                        {/* Preview: Right / Bottom Panel */}
                        <div style={{ flex: 1, padding: '40px 30px', overflowY: 'auto' }}>
                            <div style={{ marginBottom: '32px' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 16px 0', color: '#111' }}>About me</h2>
                                <p style={{ color: '#4b5563', lineHeight: '1.6', fontSize: '0.9375rem', whiteSpace: 'pre-wrap' }}>
                                    {form.pageAboutMe || 'Your about me text will appear here...'}
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
                                {form.pageSocialYouTube && (
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>
                                    </div>
                                )}
                                {form.pageSocialFacebook && (
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#3b5998', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                                    </div>
                                )}
                                {form.pageSocialWhatsApp && (
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                    </div>
                                )}
                                {form.pageSocialInstagram && (
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e1306c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 16px 0', color: '#111' }}>
                                    {form.pageSchedulerHeader || 'Meet with me'}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {selectedEvents.map((event) => (
                                        <div key={event.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#111', marginBottom: '4px' }}>{event.title}</div>
                                                <div style={{ color: '#6b7280', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                    {event.duration} min
                                                </div>
                                            </div>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedEvents.length === 0 && (
                                        <p style={{ color: '#6b7280', fontSize: '0.9375rem', textAlign: 'center', padding: '24px 0' }}>No events selected yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
