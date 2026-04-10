import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }) {
    const { username } = params;

    const user = await prisma.user.findUnique({
        where: { username },
        include: {
            eventTypes: {
                where: { isActive: true }
            },
            reviewsReceived: {
                where: { isPublic: true },
                orderBy: { createdAt: 'desc' },
                include: { booking: { select: { inviteeName: true } } }
            }
        }
    });

    if (!user) {
        notFound();
    }

    const selectedIds = user.pageSelectedEventTypes ? user.pageSelectedEventTypes.split(',') : [];

    // Only show events that the user explicitly selected. If none selected, we can show none.
    const visibleEvents = user.eventTypes.filter(ev => selectedIds.includes(ev.id));

    // Prepare styles and details
    const panelColor = user.pageSidePanelColor || '#d946ef';
    const profileImage = user.pageImage || user.avatar || user.logo || '/uploads/avatars/default.png';

    return (
        <div className="live-page-wrapper">
            <div className="live-page-container">

                {/* Left / Top Panel */}
                <div className="live-page-sidebar" style={{ backgroundColor: panelColor }}>
                    <img
                        src={profileImage}
                        alt={user.name}
                        className="live-page-avatar"
                    />
                    <h1 className="live-page-name">{user.name}</h1>
                    <p className="live-page-headline">{user.pageHeadline}</p>
                    
                    {user.reviewsReceived && user.reviewsReceived.length > 0 && (
                        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            <span style={{ fontWeight: '600' }}>
                                {(user.reviewsReceived.reduce((acc, curr) => acc + curr.rating, 0) / user.reviewsReceived.length).toFixed(1)} 
                            </span>
                            <span style={{ opacity: 0.8, fontSize: '0.9rem' }}>({user.reviewsReceived.length} reviews)</span>
                        </div>
                    )}

                    <div className="live-page-footer">
                        <Link href="/login" className="live-page-btn">
                            Start your Page
                        </Link>
                        <div className="live-page-branding">
                            Powered by SCHEDULER
                        </div>
                    </div>
                </div>

                {/* Right / Bottom Panel */}
                <div className="live-page-content">

                    {/* About section */}
                    {(user.pageAboutMe || user.pageSocialYouTube || user.pageSocialFacebook || user.pageSocialWhatsApp || user.pageSocialInstagram) && (
                        <div style={{ marginBottom: '48px' }}>
                            {user.pageAboutMe && (
                                <>
                                    <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 24px 0', color: '#111' }}>About me</h2>
                                    <p style={{ color: '#4b5563', lineHeight: '1.7', fontSize: '1.125rem', whiteSpace: 'pre-wrap' }}>
                                        {user.pageAboutMe}
                                    </p>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '20px', marginTop: '32px', flexWrap: 'wrap' }}>
                                {user.pageSocialYouTube && (
                                    <a href={user.pageSocialYouTube} target="_blank" rel="noopener noreferrer" style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'transform 0.2s', padding: '12px' }} className="social-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>
                                    </a>
                                )}
                                {user.pageSocialFacebook && (
                                    <a href={user.pageSocialFacebook} target="_blank" rel="noopener noreferrer" style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#3b5998', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'transform 0.2s', padding: '12px' }} className="social-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                                    </a>
                                )}
                                {user.pageSocialWhatsApp && (
                                    <a href={user.pageSocialWhatsApp} target="_blank" rel="noopener noreferrer" style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'transform 0.2s', padding: '12px' }} className="social-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                    </a>
                                )}
                                {user.pageSocialInstagram && (
                                    <a href={user.pageSocialInstagram} target="_blank" rel="noopener noreferrer" style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e1306c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'transform 0.2s', padding: '12px' }} className="social-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Testimonials */}
                    {user.reviewsReceived && user.reviewsReceived.length > 0 && (
                        <div style={{ marginBottom: '40px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                What people say
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                {user.reviewsReceived.map(review => (
                                    <div key={review.id} style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                                            {[1,2,3,4,5].map(star => (
                                                <svg key={star} width="16" height="16" viewBox="0 0 24 24" fill={review.rating >= star ? '#facc15' : 'transparent'} stroke={review.rating >= star ? '#facc15' : '#e5e7eb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                            ))}
                                        </div>
                                        <p style={{ color: '#374151', fontStyle: 'italic', fontSize: '1.05rem', lineHeight: '1.5', marginBottom: '16px' }}>"{review.comment}"</p>
                                        <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>– {review.booking?.inviteeName}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Events section */}
                    <div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 24px 0', color: '#111' }}>
                            {user.pageSchedulerHeader || 'Meet with me'}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {visibleEvents.map((event) => (
                                <Link href={`/book/${user.username}/${event.slug}`} key={event.id} className="hover-card">
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '1.25rem', color: '#111', marginBottom: '8px' }}>{event.title}</div>
                                        <div style={{ color: '#6b7280', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                            {event.duration} min
                                        </div>
                                    </div>
                                    <div className="hover-card-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                                    </div>
                                </Link>
                            ))}
                            {visibleEvents.length === 0 && (
                                <p style={{ color: '#6b7280', fontSize: '1.125rem', padding: '24px 0' }}>No events available currently.</p>
                            )}
                        </div>

                        {/* Inline styles for responsive layout */}
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            .live-page-wrapper {
                                min-height: 100vh;
                                background-color: #f3f4f6;
                            }
                            .live-page-container {
                                width: 100%;
                                display: flex;
                                flex-direction: row;
                                min-height: 100vh;
                            }
                            .live-page-sidebar {
                                flex: 0 0 450px;
                                padding: 60px 40px;
                                color: #fff;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                text-align: center;
                                position: sticky;
                                top: 0;
                                height: 100vh;
                                overflow-y: auto;
                            }
                            /* Hide scrollbar for sidebar */
                            .live-page-sidebar::-webkit-scrollbar {
                                display: none;
                            }
                            .live-page-sidebar {
                                -ms-overflow-style: none;  /* IE and Edge */
                                scrollbar-width: none;  /* Firefox */
                            }
                            .live-page-avatar {
                                width: 180px; 
                                height: 180px; 
                                border-radius: 32px; 
                                object-fit: cover; 
                                margin-bottom: 32px; 
                                border: 5px solid rgba(255,255,255,0.2);
                                flex-shrink: 0;
                            }
                            .live-page-name {
                                font-size: 2.5rem; 
                                font-weight: 700; 
                                margin: 0 0 12px 0; 
                                letter-spacing: -0.02em; 
                                line-height: 1.2;
                            }
                            .live-page-headline {
                                font-size: 1.25rem; 
                                opacity: 0.9; 
                                margin: 0; 
                                font-weight: 500;
                            }
                            .live-page-footer {
                                margin-top: auto; 
                                padding-top: 60px; 
                                width: 100%;
                            }
                            .live-page-btn {
                                display: block; 
                                width: 100%; 
                                padding: 16px; 
                                background-color: #000; 
                                color: #fff; 
                                border: none; 
                                border-radius: 14px; 
                                font-weight: 600; 
                                font-size: 1.125rem; 
                                text-align: center; 
                                text-decoration: none;
                            }
                            .live-page-branding {
                                font-size: 0.875rem; 
                                opacity: 0.7; 
                                margin-top: 16px; 
                                font-weight: 500;
                            }
                            .live-page-content {
                                flex: 1;
                                padding: 60px 10%;
                                background-color: #fff;
                                overflow-y: auto;
                            }
                            .hover-card {
                                display: flex; 
                                align-items: center; 
                                justify-content: space-between; 
                                padding: 24px; 
                                background: #fff; 
                                border: 1px solid #e5e7eb; 
                                border-radius: 16px; 
                                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); 
                                text-decoration: none; 
                                transition: border-color 0.2s, box-shadow 0.2s;
                            }
                            .hover-card:hover {
                                border-color: #111 !important;
                                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
                            }
                            .hover-card-icon {
                                width: 48px; 
                                height: 48px; 
                                border-radius: 50%; 
                                background: #000; 
                                color: #fff; 
                                display: flex; 
                                align-items: center; 
                                justify-content: center;
                            }
                            .social-icon:hover {
                                transform: scale(1.05);
                            }
                            
                            @media (max-width: 1024px) {
                                .live-page-sidebar {
                                    flex: 0 0 350px;
                                    padding: 40px 24px;
                                }
                                .live-page-content {
                                    padding: 40px;
                                }
                            }
                            
                            @media (max-width: 768px) {
                                .live-page-container {
                                    flex-direction: column;
                                }
                                .live-page-sidebar {
                                    flex: none;
                                    width: 100%;
                                    padding: 40px 24px;
                                    position: relative;
                                    height: auto;
                                    overflow-y: visible;
                                }
                                .live-page-content {
                                    flex: none;
                                    width: 100%;
                                    padding: 40px 24px;
                                }
                                .live-page-avatar {
                                    width: 120px;
                                    height: 120px;
                                    border-width: 4px;
                                    margin-bottom: 24px;
                                }
                                .live-page-name {
                                    font-size: 2rem;
                                }
                                .live-page-footer {
                                    padding-top: 40px;
                                }
                            }
                        `}} />
                    </div>
                </div>
            </div>
        </div>
    );
}
