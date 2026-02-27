'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function TopHeader() {
    const { data: session } = useSession();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [logo, setLogo] = useState(null);
    const notifRef = useRef(null);
    const profileRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        fetchUser();
        window.addEventListener('logo-updated', fetchUser);
        window.addEventListener('profile-updated', fetchUser);
        // Refresh notifications when user navigates back to the tab
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') fetchNotifications();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            window.removeEventListener('logo-updated', fetchUser);
            window.removeEventListener('profile-updated', fetchUser);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/user');
            if (res.ok) {
                const data = await res.json();
                setLogo(data.user?.logo);
            }
        } catch (e) { }
    };

    useEffect(() => {
        const handleClick = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setShowProfile(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (e) { }
    };

    const markAllRead = async () => {
        try {
            await fetch('/api/notifications', { method: 'PUT' });
            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch (e) { }
    };

    const userInitial = session?.user?.name?.charAt(0)?.toUpperCase() || 'U';

    return (
        <header className="top-header">
            <div className="top-header-actions">
                {/* Notification Bell */}
                <div className="notification-bell" ref={notifRef}>
                    <button
                        className="btn-icon btn-ghost"
                        onClick={() => {
                            setShowNotifications(!showNotifications);
                            setShowProfile(false);
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
                    </button>

                    {showNotifications && (
                        <div className="notification-dropdown">
                            <div className="notification-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Notifications</span>
                                {unreadCount > 0 && (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={markAllRead}
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                                    No notifications
                                </div>
                            ) : (
                                notifications.slice(0, 5).map((notif) => (
                                    <div key={notif.id} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                                        <div className="notif-title">{notif.title}</div>
                                        <div className="notif-message">{notif.message}</div>
                                        <div className="notif-time">
                                            {new Date(notif.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* User Profile */}
                <div className="dropdown" ref={profileRef}>
                    <button
                        className="avatar"
                        onClick={() => {
                            setShowProfile(!showProfile);
                            setShowNotifications(false);
                        }}
                        style={{ cursor: 'pointer', overflow: 'hidden' }}
                    >
                        {logo ? (
                            <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            userInitial
                        )}
                    </button>

                    {showProfile && (
                        <div className="dropdown-menu">
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{session?.user?.name}</div>
                                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{session?.user?.email}</div>
                            </div>
                            <a href="/admin" className="dropdown-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                                Profile Settings
                            </a>
                            <a href="/admin?tab=billing" className="dropdown-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                                </svg>
                                Billing & Plans
                            </a>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item" onClick={() => signOut({ callbackUrl: '/login' })} style={{ color: 'var(--danger)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
