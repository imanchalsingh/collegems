import React from 'react';

interface PageVisit {
    page: string;
    visits: number;
    uniqueUsers: number;
}

interface PageHeatMapProps {
    data: PageVisit[];
    maxVisits?: number;
}

const PageHeatMap: React.FC<PageHeatMapProps> = ({ data, maxVisits }) => {
    const max = maxVisits || Math.max(...data.map(d => d.visits), 1);

    const getColor = (visits: number) => {
        const ratio = visits / max;
        if (ratio >= 0.8) return '#ef4444'; // Red - Hot
        if (ratio >= 0.6) return '#f97316'; // Orange
        if (ratio >= 0.4) return '#eab308'; // Yellow
        if (ratio >= 0.2) return '#3b82f6'; // Blue
        return '#9ca3af'; // Gray - Cold
    };

    const getLabel = (visits: number) => {
        const ratio = visits / max;
        if (ratio >= 0.8) return '🔥 Hot';
        if (ratio >= 0.6) return '🔥 Warm';
        if (ratio >= 0.4) return '📊 Medium';
        if (ratio >= 0.2) return '❄️ Cool';
        return '❄️ Cold';
    };

    return (
        <div className="page-heat-map">
            <div className="heat-map-header">
                <h3>📊 Page Visit Heat Map</h3>
                <span className="heat-map-subtitle">
                    Most visited pages shown in order
                </span>
            </div>

            <div className="heat-map-list">
                {data.map((item, index) => (
                    <div key={item.page} className="heat-map-item">
                        <div className="heat-map-row">
                            <span className="heat-map-index">#{index + 1}</span>
                            <span className="heat-map-page">{item.page}</span>
                            <span className="heat-map-visits">{item.visits} visits</span>
                            <span className="heat-map-users">{item.uniqueUsers} users</span>
                            <span className="heat-map-label">{getLabel(item.visits)}</span>
                        </div>
                        <div className="heat-map-bar-wrapper">
                            <div
                                className="heat-map-bar"
                                style={{
                                    width: `${(item.visits / max) * 100}%`,
                                    backgroundColor: getColor(item.visits)
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="heat-map-legend">
                <span>🔥 Hot</span>
                <span>📊 Medium</span>
                <span>❄️ Cold</span>
                <div className="heat-map-legend-bar">
                    <div style={{ background: '#ef4444', width: '25%' }} />
                    <div style={{ background: '#f97316', width: '25%' }} />
                    <div style={{ background: '#eab308', width: '25%' }} />
                    <div style={{ background: '#3b82f6', width: '25%' }} />
                </div>
            </div>

            <style>{`
                .page-heat-map {
                    background: #fff;
                    border-radius: 12px;
                    padding: 1.5rem;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
                .heat-map-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                .heat-map-header h3 {
                    margin: 0;
                    font-size: 1.2rem;
                }
                .heat-map-subtitle {
                    font-size: 0.85rem;
                    color: #6b7280;
                }
                .heat-map-item {
                    margin-bottom: 0.5rem;
                }
                .heat-map-row {
                    display: flex;
                    gap: 1rem;
                    font-size: 0.9rem;
                    padding: 0.4rem 0;
                    align-items: center;
                }
                .heat-map-index {
                    font-weight: bold;
                    color: #6b7280;
                    min-width: 35px;
                }
                .heat-map-page {
                    flex: 1;
                    font-weight: 500;
                }
                .heat-map-visits {
                    color: #374151;
                    font-weight: 600;
                    min-width: 80px;
                }
                .heat-map-users {
                    color: #6b7280;
                    font-size: 0.8rem;
                    min-width: 70px;
                }
                .heat-map-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 2px 8px;
                    border-radius: 12px;
                    background: #f3f4f6;
                    min-width: 60px;
                    text-align: center;
                }
                .heat-map-bar-wrapper {
                    width: 100%;
                    height: 6px;
                    background: #f3f4f6;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .heat-map-bar {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.5s ease;
                }
                .heat-map-legend {
                    margin-top: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 0.8rem;
                    color: #6b7280;
                }
                .heat-map-legend-bar {
                    display: flex;
                    flex: 1;
                    height: 8px;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .heat-map-legend-bar div {
                    height: 100%;
                }
            `}</style>
        </div>
    );
};

export default PageHeatMap;