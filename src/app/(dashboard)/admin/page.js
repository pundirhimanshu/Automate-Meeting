'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function AdminContent() {
    const { data: session, update } = useSession();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({});
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [invitations, setInvitations] = useState([]);
    const [invitesLoading, setInvitesLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [teamLoading, setTeamLoading] = useState(false);
    const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        if (activeTab === 'users') fetchInvitations();
        if (activeTab === 'team') fetchTeamMembers();
    }, [activeTab]);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/user');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setForm({ name: data.user.name, timezone: data.user.timezone, brandColor: data.user.brandColor });
            }
        } catch (e) { } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/user', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (e) { } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/user', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                }),
            });
            if (res.ok) {
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update password');
            }
        } catch (e) { } finally {
            setSaving(false);
        }
    };

    const fetchInvitations = async () => {
        setInvitesLoading(true);
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setInvitations((data.notifications || []).filter((n) => n.type === 'team_invite'));
            }
        } catch (e) { } finally {
            setInvitesLoading(false);
        }
    };

    const fetchTeamMembers = async () => {
        setTeamLoading(true);
        try {
            const res = await fetch('/api/team');
            if (res.ok) {
                const data = await res.json();
                setTeamMembers(data.members || []);
            }
        } catch (e) { } finally {
            setTeamLoading(false);
        }
    };

    const handleInviteMember = async (e) => {
        e.preventDefault();
        if (!inviteForm.email) return;
        setInviting(true);
        try {
            const res = await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inviteForm),
            });
            if (res.ok) {
                setInviteForm({ email: '', role: 'member' });
                fetchTeamMembers();
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to invite member');
            }
        } catch (e) { } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!confirm('Are you sure you want to remove this member?')) return;
        try {
            const res = await fetch(`/api/team/${userId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchTeamMembers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to remove member');
            }
        } catch (e) { }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>;
    }

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1 className="page-title">Admin Center</h1>
                {saved && <span className="badge badge-success">✓ Saved</span>}
            </div>

            <div className="tabs" style={{ marginBottom: '24px' }}>
                {[
                    { id: 'profile', label: 'Profile' },
                    { id: 'branding', label: 'Branding' },
                    { id: 'users', label: 'Users' },
                    { id: 'security', label: 'Security' },
                    { id: 'billing', label: 'Billing & Plans' },
                    { id: 'team', label: 'Team' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'profile' && (
                <div className="settings-section">
                    <h3>Profile Settings</h3>
                    <div className="settings-row">
                        <div className="settings-label">
                            <h4>Avatar</h4>
                            <p>Your profile picture</p>
                        </div>
                        <div className="settings-value">
                            <div className="avatar avatar-xl">{user?.name?.charAt(0)?.toUpperCase()}</div>
                        </div>
                    </div>
                    <div className="settings-row">
                        <div className="settings-label"><h4>Full Name</h4></div>
                        <div className="settings-value">
                            <input className="input w-full" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                    </div>
                    <div className="settings-row">
                        <div className="settings-label"><h4>Email</h4><p>Cannot be changed</p></div>
                        <div className="settings-value">
                            <input className="input w-full" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
                        </div>
                    </div>
                    <div className="settings-row">
                        <div className="settings-label"><h4>Username</h4><p>Your booking URL</p></div>
                        <div className="settings-value">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)' }}>{typeof window !== 'undefined' ? window.location.origin : ''}/book/</span>
                                <strong>{user?.username}</strong>
                            </div>
                        </div>
                    </div>
                    <div className="settings-row">
                        <div className="settings-label"><h4>Time Zone</h4></div>
                        <div className="settings-value">
                            <select className="input w-full" value={form.timezone || ''} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                                <option value="America/New_York">Eastern Time (US)</option>
                                <option value="America/Chicago">Central Time (US)</option>
                                <option value="America/Los_Angeles">Pacific Time (US)</option>
                                <option value="Europe/London">London (GMT)</option>
                                <option value="Europe/Paris">Paris (CET)</option>
                                <option value="Asia/Kolkata">India (IST)</option>
                                <option value="Asia/Tokyo">Tokyo (JST)</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'branding' && (
                <div className="settings-section">
                    <h3>Branding & Customization</h3>

                    {/* Logo Upload */}
                    <div className="settings-row">
                        <div className="settings-label">
                            <h4>Logo</h4>
                            <p>Displayed on your booking pages. PNG, JPEG, SVG, or WebP. Max 2MB.</p>
                        </div>
                        <div className="settings-value">
                            {user?.logo ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)', overflow: 'hidden',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'var(--bg-page)',
                                    }}>
                                        <img src={user.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => document.getElementById('logo-input').click()}>
                                            Change Logo
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch('/api/user/logo', { method: 'DELETE' });
                                                    if (res.ok) setUser({ ...user, logo: null });
                                                } catch (e) { }
                                            }}
                                        >
                                            Remove Logo
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => document.getElementById('logo-input').click()}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }}
                                    onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-page)'; }}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        e.currentTarget.style.borderColor = 'var(--border-color)';
                                        e.currentTarget.style.background = 'var(--bg-page)';
                                        const file = e.dataTransfer.files[0];
                                        if (file) {
                                            const fd = new FormData();
                                            fd.append('logo', file);
                                            try {
                                                const res = await fetch('/api/user/logo', { method: 'POST', body: fd });
                                                if (res.ok) {
                                                    const data = await res.json();
                                                    setUser({ ...user, logo: data.logo });
                                                    window.dispatchEvent(new CustomEvent('logo-updated'));
                                                }
                                                else { const err = await res.json(); alert(err.error); }
                                            } catch (e) { alert('Upload failed'); }
                                        }
                                    }}
                                    style={{
                                        width: '200px', height: '120px', border: '2px dashed var(--border-color)',
                                        borderRadius: 'var(--radius-md)', background: 'var(--bg-page)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        justifyContent: 'center', cursor: 'pointer', gap: '8px',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                                        Drag & drop or <span style={{ color: 'var(--primary)', fontWeight: 500 }}>click to upload</span>
                                    </span>
                                </div>
                            )}
                            <input
                                type="file"
                                id="logo-input"
                                accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp"
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    const fd = new FormData();
                                    fd.append('logo', file);
                                    try {
                                        const res = await fetch('/api/user/logo', { method: 'POST', body: fd });
                                        if (res.ok) {
                                            const data = await res.json();
                                            setUser({ ...user, logo: data.logo });
                                            window.dispatchEvent(new CustomEvent('logo-updated'));
                                        }
                                        else { const err = await res.json(); alert(err.error); }
                                    } catch (e) { alert('Upload failed'); }
                                    e.target.value = '';
                                }}
                            />
                        </div>
                    </div>

                    {/* Brand Color */}
                    <div className="settings-row">
                        <div className="settings-label"><h4>Brand Color</h4><p>Used on your booking pages</p></div>
                        <div className="settings-value">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input type="color" value={form.brandColor || '#0069ff'} onChange={(e) => setForm({ ...form, brandColor: e.target.value })} style={{ width: '48px', height: '48px', border: 'none', cursor: 'pointer', borderRadius: '8px' }} />
                                <input className="input" value={form.brandColor || '#0069ff'} onChange={(e) => setForm({ ...form, brandColor: e.target.value })} style={{ width: '120px' }} />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>Save Changes</button>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="settings-section">
                    <h3>Change Password</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                        <div className="input-group">
                            <label>Current Password</label>
                            <input type="password" className="input" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>New Password</label>
                            <input type="password" className="input" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Confirm New Password</label>
                            <input type="password" className="input" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
                        </div>
                        <button className="btn btn-primary" onClick={handlePasswordChange} disabled={saving} style={{ alignSelf: 'flex-start' }}>
                            Update Password
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'billing' && (
                <div className="settings-section">
                    <h3>Billing & Plans</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                        <div
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                padding: '32px',
                                border: '2px solid var(--primary)',
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--primary-light)',
                                textAlign: 'center'
                            }}
                        >
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Best Plan</h4>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '24px' }}>
                                INR 2000 <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ Year</span>
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', marginBottom: '32px' }}>
                                {[
                                    'Unlimited event types',
                                    'Custom branding & logos',
                                    'Team scheduling (Group, Round Robin, Collective)',
                                    'Full Zoom & Google Meet integration',
                                    'Advanced phone booking with country codes',
                                    'Email & SMS notifications',
                                    'Priority support'
                                ].map((f) => (
                                    <li key={f} style={{ padding: '8px 0', fontSize: '0.9375rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '18px', height: '18px', borderRadius: '50%', background: 'var(--success)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                        </div>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button className="btn btn-primary w-full" style={{ padding: '12px', fontSize: '1rem' }} disabled>
                                Current Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'team' && (
                <div className="settings-section">
                    <h3>Team Management</h3>
                    <p style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }}>Manage your team members and their roles.</p>

                    {teamLoading ? (
                        <div style={{ padding: '20px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {teamMembers.length === 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.name} (You)</div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{user?.email}</div>
                                    </div>
                                    <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>Owner</span>
                                </div>
                            ) : (
                                teamMembers.map((member) => (
                                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
                                        <div className="avatar">
                                            {member.user.logo ? (
                                                <img src={member.user.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                member.user.name?.charAt(0)?.toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {member.user.name}
                                                {member.user.id === user?.id ? '(You)' : ''}
                                                {member.user.isPending && (
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        background: 'var(--warning-light)',
                                                        color: 'var(--warning)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: 500
                                                    }}>Pending</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{member.user.email}</div>
                                        </div>
                                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {member.user.isPending && (
                                                <button
                                                    onClick={() => {
                                                        const link = `${window.location.origin}/signup?invite=${member.id}`; // Note: API uses inv.id for token-ish behavior or just ID
                                                        navigator.clipboard.writeText(link);
                                                        alert('Invite link copied to clipboard!');
                                                    }}
                                                    className="btn btn-ghost"
                                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                >
                                                    Copy Link
                                                </button>
                                            )}
                                            <span className={`badge ${member.role === 'owner' ? 'badge-primary' : 'badge-secondary'}`} style={{ textTransform: 'capitalize' }}>
                                                {member.role}
                                            </span>
                                            {member.role !== 'owner' && member.user.id !== user?.id && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.user.id)}
                                                    className="btn btn-ghost"
                                                    style={{ padding: '4px', color: 'var(--error)' }}
                                                    title="Remove member"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6m4-11v6" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <div style={{ marginTop: '24px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                        <h4 style={{ marginBottom: '12px' }}>Invite New Member</h4>
                        <form onSubmit={handleInviteMember} style={{ display: 'flex', gap: '12px' }}>
                            <input
                                type="email"
                                className="input"
                                placeholder="Email address"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                required
                                style={{ flex: 1 }}
                            />
                            <select
                                className="input"
                                style={{ width: '120px' }}
                                value={inviteForm.role}
                                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                            </select>
                            <button type="submit" className="btn btn-primary" disabled={inviting}>
                                {inviting ? 'Inviting...' : 'Invite'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="settings-section">
                    <h3>Invitations Sent</h3>
                    <p style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }}>All team invitations you've sent for Group, Round Robin, and Collective event types.</p>

                    {invitesLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
                    ) : invitations.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            <p style={{ fontWeight: 500 }}>No invitations sent yet</p>
                            <p style={{ fontSize: '0.8125rem' }}>Invitations will appear here when you create Group, Round Robin, or Collective events and invite team members.</p>
                        </div>
                    ) : (
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-page)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invitee</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-page)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Details</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-page)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Sent</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-page)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invitations.map((inv) => {
                                        // Parse email from message: "Invitation sent to email@... for ..."
                                        const emailMatch = inv.message?.match(/to\s+([^\s]+)\s+for/);
                                        const email = emailMatch ? emailMatch[1] : '—';
                                        const eventMatch = inv.message?.match(/for\s+(.+?)\s*\(/);
                                        const eventName = eventMatch ? eventMatch[1] : '—';
                                        const typeMatch = inv.message?.match(/\((.+?)\s+meeting\)/);
                                        const meetingType = typeMatch ? typeMatch[1] : '—';

                                        return (
                                            <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '50%',
                                                            background: 'var(--primary-light)', color: 'var(--primary)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                                                        }}>
                                                            {email.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{eventName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{meetingType}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                                    {new Date(inv.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                        {new Date(inv.createdAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>Pending</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>}>
            <AdminContent />
        </Suspense>
    );
}
