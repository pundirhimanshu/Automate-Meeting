'use client';

import { useState, useEffect } from 'react';

export default function AnalyticsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/analytics');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) { } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>;
    }

    if (!data) {
        return <div className="empty-state"><h3>Unable to load analytics</h3></div>;
    }

    const maxDayCount = Math.max(...(data.last7Days || []).map((d) => d.count), 1);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Analytics</h1>
            </div>

            {/* Stat Cards */}
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-label">Total Bookings</div>
                    <div className="stat-value">{data.totalBookings}</div>
                    <div className="stat-trend up">This month: {data.monthBookings}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Upcoming</div>
                    <div className="stat-value">{data.upcomingBookings}</div>
                    <div className="stat-trend">Scheduled meetings</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Conversion Rate</div>
                    <div className="stat-value">{data.conversionRate}%</div>
                    <div className="stat-trend up">Confirmed bookings</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Cancellation Rate</div>
                    <div className="stat-value">{data.noShowRate}%</div>
                    <div className="stat-trend down">Cancelled meetings</div>
                </div>
            </div>

            {/* Bookings Over Time */}
            <div className="chart-container" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Bookings — Last 7 Days</h3>
                <div className="chart-bar-group">
                    {(data.last7Days || []).map((day, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                {day.count}
                            </div>
                            <div
                                className="chart-bar"
                                style={{
                                    height: `${Math.max((day.count / maxDayCount) * 160, 8)}px`,
                                    width: '100%',
                                    transition: 'height 0.5s ease',
                                }}
                            />
                            <div className="chart-bar-label">{day.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Event Breakdown */}
            <div className="chart-container">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Event Type Breakdown</h3>
                {(data.eventBreakdown || []).length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)' }}>No event data yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {data.eventBreakdown.map((et, i) => {
                            const maxBookings = Math.max(...data.eventBreakdown.map((e) => e.bookings), 1);
                            return (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span className="color-dot" style={{ background: et.color }}></span>
                                            {et.name}
                                        </span>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>{et.bookings} bookings</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'var(--bg-page)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${(et.bookings / maxBookings) * 100}%`,
                                            background: et.color,
                                            borderRadius: '4px',
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Popular Time Slots */}
            {data.popularSlots && data.popularSlots.length > 0 && (
                <div className="chart-container" style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Popular Time Slots</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {data.popularSlots.slice(0, 8).map((slot, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: '8px 16px',
                                    background: i === 0 ? 'var(--primary)' : 'var(--primary-light)',
                                    color: i === 0 ? 'white' : 'var(--primary)',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                }}
                            >
                                {slot.hour}:00 ({slot.count})
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
