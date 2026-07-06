import React, { useState, useEffect } from 'react';
import PageHeatMap from '../components/PageHeatMap';
import axios from 'axios';

interface Metric {
    page: string;
    visits: number;
    uniqueUsers: number;
}

interface Summary {
    totalVisits: number;
    uniquePages: number;
    dateRange: string;
}

const Analytics: React.FC = () => {
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState(30);

    useEffect(() => {
        fetchMetrics();
    }, [days]);

    const fetchMetrics = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5000/api/analytics/page-visits?days=${days}&limit=20`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                setMetrics(response.data.data.metrics);
                setSummary(response.data.data.summary);
            }
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to load analytics');
            console.error('Analytics error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="analytics-loading">
                <div className="spinner" />
                <p>Loading analytics...</p>
                <style>{`
                    .analytics-loading {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 300px;
                    }
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f4f6;
                        border-top: 4px solid #3b82f6;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-error">
                <p>❌ {error}</p>
                <button onClick={fetchMetrics}>Retry</button>
                <style>{`
                    .analytics-error {
                        text-align: center;
                        padding: 2rem;
                    }
                    .analytics-error button {
                        margin-top: 1rem;
                        padding: 0.5rem 1.5rem;
                        background: #3b82f6;
                        color: #fff;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="analytics-page">
            <div className="analytics-header">
                <h1>📊 Page Visit Analytics</h1>
                <div className="analytics-controls">
                    <label>Show last:
                        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                            <option value={60}>60 days</option>
                            <option value={90}>90 days</option>
                        </select>
                    </label>
                    <button onClick={fetchMetrics}>🔄 Refresh</button>
                </div>
            </div>

            {summary && (
                <div className="analytics-summary">
                    <div className="summary-card">
                        <span className="summary-value">{summary.totalVisits}</span>
                        <span className="summary-label">Total Visits</span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-value">{summary.uniquePages}</span>
                        <span className="summary-label">Unique Pages</span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-value">{summary.dateRange}</span>
                        <span className="summary-label">Date Range</span>
                    </div>
                </div>
            )}

            {metrics.length > 0 ? (
                <PageHeatMap data={metrics} />
            ) : (
                <p className="no-data">No visits recorded yet.</p>
            )}

            <style>{`
                .analytics-page {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .analytics-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    margin-bottom: 1.5rem;
                }
                .analytics-header h1 {
                    margin: 0;
                    font-size: 1.8rem;
                }
                .analytics-controls {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .analytics-controls select {
                    padding: 0.4rem 0.8rem;
                    border-radius: 6px;
                    border: 1px solid #d1d5db;
                    margin-left: 0.5rem;
                }
                .analytics-controls button {
                    padding: 0.4rem 1.2rem;
                    background: #3b82f6;
                    color: #fff;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .analytics-controls button:hover {
                    background: #2563eb;
                }
                .analytics-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                .summary-card {
                    background: #f9fafb;
                    padding: 1rem;
                    border-radius: 8px;
                    text-align: center;
                }
                .summary-value {
                    display: block;
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #1f2937;
                }
                .summary-label {
                    font-size: 0.85rem;
                    color: #6b7280;
                }
                .no-data {
                    text-align: center;
                    color: #6b7280;
                    padding: 2rem;
                }
            `}</style>
        </div>
    );
};

export default Analytics;