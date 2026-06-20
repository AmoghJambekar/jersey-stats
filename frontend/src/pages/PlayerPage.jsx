import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { fetchPlayerJerseyStats } from '../api';
import StatsTable from '../components/StatsTable';

const columns = [
  { key: 'edition_name', label: 'Edition' },
  { key: 'color_tags', label: 'Colors' },
  { key: 'games_played', label: 'GP' },
  { key: 'ppg', label: 'PPG', format: (v) => v?.toFixed(1) },
  { key: 'rpg', label: 'RPG', format: (v) => v?.toFixed(1) },
  { key: 'apg', label: 'APG', format: (v) => v?.toFixed(1) },
  { key: 'fg3_mpg', label: '3PM', format: (v) => v?.toFixed(1) },
  { key: 'fg_pct', label: 'FG%', format: (v) => v?.toFixed(1) },
  { key: 'ft_pct', label: 'FT%', format: (v) => v?.toFixed(1) },
  { key: 'plus_minus', label: '+/-', format: (v) => (v > 0 ? '+' : '') + v?.toFixed(1) },
];

export default function PlayerPage() {
  const { playerId } = useParams();
  const location = useLocation();
  const playerName = location.state?.playerName;
  const teamId = location.state?.teamId;

  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPlayerJerseyStats(playerId)
      .then((data) => { if (!cancelled) setStats(data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [playerId]);

  if (loading) return <p className="text-gray-500">Loading player...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div>
      <Link to="/" className="text-sm text-blue-600 hover:underline">&larr; Home</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-2">
        {playerName || `Player ${playerId}`}
      </h1>
      {teamId && <p className="text-gray-500 mb-6">{teamId}</p>}
      <h2 className="text-lg text-gray-600 mb-6">Jersey Stats &mdash; 2025-26</h2>
      <StatsTable columns={columns} rows={stats} />
    </div>
  );
}
