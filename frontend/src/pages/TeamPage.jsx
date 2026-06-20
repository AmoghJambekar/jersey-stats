import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchTeam, fetchTeamJerseyStats } from '../api';
import StatsTable from '../components/StatsTable';

const columns = [
  { key: 'edition_name', label: 'Edition' },
  { key: 'color_tags', label: 'Colors' },
  { key: 'games_played', label: 'GP' },
  { key: 'wins', label: 'W' },
  { key: 'losses', label: 'L' },
  { key: 'ppg', label: 'PPG', format: (v) => v?.toFixed(1) },
  { key: 'opp_ppg', label: 'Opp PPG', format: (v) => v?.toFixed(1) },
];

export default function TeamPage() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTeam(teamId), fetchTeamJerseyStats(teamId)])
      .then(([teamData, statsData]) => {
        if (!cancelled) {
          setTeam(teamData);
          setStats(statsData);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teamId]);

  if (loading) return <p className="text-gray-500">Loading team...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div>
      <Link to="/" className="text-sm text-blue-600 hover:underline">&larr; All Teams</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-2">
        {team?.city} {team?.name}
      </h1>
      <h2 className="text-lg text-gray-600 mb-6">Jersey Stats &mdash; 2025-26</h2>
      <StatsTable columns={columns} rows={stats} />
    </div>
  );
}
