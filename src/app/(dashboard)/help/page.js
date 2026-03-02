'use client';

import React from 'react';

export default function HelpPage() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Help Center
                </h1>
                <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Welcome to the Scheduler Help Center. We're here to help you get the most out of our scheduling platform.
                </p>
            </div>

            <div style={{ display: 'grid', gap: '24px' }}>
                {/* Application Overview */}
                <section style={{ background: 'var(--bg-white)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--primary)' }}>🚀</span> Getting Started
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        Scheduler is designed to simplify your scheduling workflow. Create event types, set your availability, and share your booking links with anyone.
                    </p>
                    <ul style={{ paddingLeft: '20px', listStyleType: 'disc', color: 'var(--text-secondary)' }}>
                        <li style={{ marginBottom: '8px' }}><strong>Create Event Types:</strong> Define different types of meetings (e.g., 30-min discovery, 1-hour consultation).</li>
                        <li style={{ marginBottom: '8px' }}><strong>Set Availability:</strong> Configure your working hours and blocked dates to prevent double-bookings.</li>
                        <li style={{ marginBottom: '8px' }}><strong>Integrations:</strong> Connect with Zoom, Microsoft Teams, and Google Meet for automatic meeting link generation.</li>
                    </ul>
                </section>

                {/* New Feature: Single-Use Links */}
                <section style={{ background: 'var(--bg-white)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--primary)' }}>🔗</span> Single-Use Links
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        One of our most powerful features! Single-use links allow you to generate a unique booking link that expires as soon as it's used.
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Perfect for sensitive meetings or when you want to give someone exclusive access to a specific time slot without them being able to re-book in the future.
                    </p>
                </section>

                {/* Contact Information */}
                <section style={{ background: 'var(--primary-bg)', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--primary-light)', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '16px' }}>
                        Still Need Help?
                    </h2>
                    <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        If you have any questions or encounter any issues, please don't hesitate to reach out to our support team.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '32px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Call or WhatsApp</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>+91 8532871802</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Us</div>
                            <a href="mailto:himanshupundir506@gmail.com" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                                himanshupundir506@gmail.com
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </div >
    );
}
