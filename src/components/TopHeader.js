'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function TopHeader() {
    const { data: session } = useSession();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [isDropping, setIsDropping] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [logo, setLogo] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const notifRef = useRef(null);
    const profileRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        fetchUser();
        fetch('/api/subscription')
            .then(r => r.json())
            .then(d => { if (d.isOwner) setIsOwner(true); })
            .catch(() => { });
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

    useEffect(() => {
        if (showSignOutModal) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
            setIsDropping(false); // Reset drop state when modal closes
        }
        return () => document.body.classList.remove('modal-open');
    }, [showSignOutModal]);

    const handleSignOutAnimation = () => {
        setIsDropping(true);
        // Wait for animation to complete before signing out
        setTimeout(() => {
            signOut({ callbackUrl: '/login' });
        }, 850);
    };

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
            <div className="top-header-greeting" style={{ 
                fontFamily: 'var(--font-serif)', 
                fontStyle: 'italic', 
                fontSize: '1.25rem', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#fff'
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {(() => {
                        const hour = new Date().getHours();
                        if (hour < 12) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
                        if (hour < 17) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
                        return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
                    })()}
                </div>
                <span>
                    {(() => {
                        const hour = new Date().getHours();
                        if (hour < 12) return 'Good Morning';
                        if (hour < 17) return 'Good Afternoon';
                        return 'Good Evening';
                    })()}, {session?.user?.name || 'User'}
                </span>
            </div>
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
                        <div className="notification-dropdown" style={{
                            padding: '8px',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-lg)',
                            border: '1px solid var(--border-color)',
                            minWidth: '340px',
                            background: '#fff',
                            top: 'calc(100% + 12px)'
                        }}>
                            <div className="notification-dropdown-header" style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '16px',
                                borderBottom: '1px solid #f3f4f6',
                                marginBottom: '4px'
                            }}>
                                <span style={{ 
                                    fontFamily: 'Inria Serif', 
                                    fontStyle: 'italic', 
                                    fontWeight: 700, 
                                    fontSize: '1.25rem',
                                    color: '#1a1a1a'
                                }}>Notifications</span>
                                {unreadCount > 0 && (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={markAllRead}
                                        style={{ 
                                            fontSize: '0.75rem', 
                                            fontWeight: 600, 
                                            color: 'var(--primary)',
                                            background: '#f0f6ff',
                                            padding: '4px 10px',
                                            borderRadius: '6px'
                                        }}
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
                                    <div key={notif.id} className={`notification-item ${!notif.read ? 'unread' : ''}`} style={{
                                        padding: '16px',
                                        borderRadius: '10px',
                                        transition: 'all 0.2s',
                                        borderBottom: '1px solid #f9fafb',
                                        position: 'relative',
                                        cursor: 'default',
                                        background: !notif.read ? '#fcfcfc' : 'transparent'
                                    }}>
                                        {!notif.read && (
                                            <div style={{
                                                position: 'absolute',
                                                left: '-2px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: '4px',
                                                height: '24px',
                                                background: '#1a1a1a',
                                                borderRadius: '0 4px 4px 0'
                                            }} />
                                        )}
                                        <div className="notif-title" style={{ 
                                            fontWeight: 700, 
                                            fontSize: '0.9375rem', 
                                            color: '#1a1a1a',
                                            marginBottom: '4px'
                                        }}>{notif.title}</div>
                                        <div className="notif-message" style={{ 
                                            fontSize: '0.8125rem', 
                                            color: '#4b5563',
                                            lineHeight: '1.4'
                                        }}>{notif.message}</div>
                                        <div className="notif-time" style={{ 
                                            fontSize: '0.75rem', 
                                            color: '#9ca3af',
                                            marginTop: '8px',
                                            fontWeight: 500
                                        }}>
                                            {new Date(notif.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                        <div className="dropdown-menu" style={{ 
                            padding: '8px', 
                            borderRadius: 'var(--radius-lg)', 
                            boxShadow: 'var(--shadow-lg)', 
                            border: '1px solid var(--border-color)',
                            minWidth: '240px',
                            background: '#fff'
                        }}>
                            <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6', marginBottom: '8px' }}>
                                <div style={{ 
                                    fontWeight: 700, 
                                    fontSize: '1rem', 
                                    fontFamily: 'Inria Serif', 
                                    fontStyle: 'italic',
                                    color: '#1a1a1a',
                                    marginBottom: '2px'
                                }}>
                                    {session?.user?.name}
                                </div>
                                <div style={{ color: '#4b5563', fontSize: '0.8125rem', fontWeight: 500 }}>{session?.user?.email}</div>
                            </div>
                            <a href="/admin" className="dropdown-item" style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                padding: '10px 12px', 
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                color: '#374151',
                                transition: 'all 0.2s'
                            }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                                Profile Settings
                            </a>

                            {isOwner && (
                                <Link href="/subscription" className="dropdown-item" style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    padding: '10px 12px', 
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    color: '#374151',
                                    transition: 'all 0.2s'
                                }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                                    </svg>
                                    Billing & Plans
                                </Link>
                            )}

                            <div style={{ height: '1px', background: '#f3f4f6', margin: '8px 4px' }} />
                            <button className="dropdown-item" onClick={() => {
                                setShowSignOutModal(true);
                                setShowProfile(false);
                            }} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                padding: '10px 12px', 
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                color: 'var(--danger)',
                                transition: 'all 0.2s',
                                width: '100%',
                                textAlign: 'left',
                                background: 'transparent'
                            }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Sign Out Confirmation Modal (ID Card Style) */}
            {showSignOutModal && (
                <div className="signout-modal-overlay" style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div className="id-card-stack" style={{
                        marginTop: '-40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        animation: 'slideDownModal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        {/* Lanyard/Strap Asset */}
                        <img 
                            src="/uploads/logos/ID.png" 
                            alt="Lanyard" 
                            style={{
                                width: '400px',
                                height: 'auto',
                                marginBottom: '-180px', // Pull the card up into the clip
                                pointerEvents: 'none',
                                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))'
                            }} 
                        />

                        {/* Card Body */}
                        <div className="id-card-body" style={{
                            width: '280px',
                            background: '#fff',
                            borderRadius: '16px',
                            padding: '40px 24px 24px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                            textAlign: 'center',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                            animation: isDropping ? 'dropCard 0.9s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards' : 'none'
                        }}>
                            {/* Card Texture Dots */}
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                left: '0',
                                right: '0',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(10, 1fr)',
                                gap: '12px',
                                padding: '0 12px',
                                opacity: 0.1
                            }}>
                                {[...Array(20)].map((_, i) => (
                                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#000' }} />
                                ))}
                            </div>

                            {/* User Avatar Initial Box */}
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: '#1a1a1a',
                                color: '#fff',
                                margin: '0 auto 20px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem',
                                fontWeight: 300,
                                fontFamily: 'var(--font-serif)',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                            }}>
                                {userInitial}
                            </div>

                            {/* User Details */}
                            <h2 style={{ 
                                fontFamily: 'Inria Serif', 
                                fontStyle: 'italic', 
                                fontWeight: 700, 
                                fontSize: '1.5rem',
                                marginBottom: '4px',
                                color: '#1a1a1a'
                            }}>
                                {session?.user?.name}
                            </h2>
                            <p style={{ 
                                color: '#666', 
                                fontSize: '0.8125rem', 
                                marginBottom: '32px',
                                fontWeight: 500
                            }}>
                                {session?.user?.email}
                            </p>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: isDropping ? 0 : 1, transition: 'opacity 0.2s' }}>
                                <button 
                                    onClick={handleSignOutAnimation}
                                    disabled={isDropping}
                                    style={{
                                        background: '#1a1a1a',
                                        color: '#fff',
                                        padding: '12px',
                                        borderRadius: '30px',
                                        fontWeight: 600,
                                        fontFamily: 'Inria Serif',
                                        fontStyle: 'italic',
                                        fontSize: '1rem',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    Sign out
                                </button>
                                <button 
                                    onClick={() => setShowSignOutModal(false)}
                                    style={{
                                        background: '#fff',
                                        color: '#1a1a1a',
                                        padding: '12px',
                                        borderRadius: '30px',
                                        fontWeight: 600,
                                        fontFamily: 'Inria Serif',
                                        fontStyle: 'italic',
                                        fontSize: '1rem',
                                        border: '1px solid #e5e7eb',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Add keyframe animations via standard CSS if possible, but for immediate wow I'll use inline style animations */}
                    <style jsx>{`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes slideDownModal {
                            from { transform: translateY(-100px); opacity: 0; }
                            to { transform: translateY(0); opacity: 1; }
                        }
                        @keyframes dropCard {
                            0% { transform: translateY(0) rotate(0deg); }
                            15% { transform: translateY(-12px) rotate(2deg); }
                            30% { transform: translateY(0) rotate(-1deg); }
                            100% { transform: translateY(120vh) rotate(25deg); opacity: 0.8; }
                        }
                    `}</style>
                </div>
            )}
        </header>
    );
}
