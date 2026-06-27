import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchTeam, fetchTeamJerseyStats, fetchTeamRoster, fetchTeamGameLog } from '../api';
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

const fmtLeader = (l) => l ? `${l.name} (${l.value})` : '';

const gameLogColumns = [
  { key: 'game_date', label: 'Date' },
  { key: 'away_team', label: 'Away' },
  { key: 'home_team', label: 'Home' },
  { key: 'away_jersey', label: 'Away Jersey' },
  { key: 'home_jersey', label: 'Home Jersey' },
  { key: 'score', label: 'Score', format: (_, row) => `${row.away_score} - ${row.home_score}` },
  { key: 'away_pts_leader', label: 'Away PTS', format: (v) => fmtLeader(v) },
  { key: 'away_reb_leader', label: 'Away REB', format: (v) => fmtLeader(v) },
  { key: 'away_ast_leader', label: 'Away AST', format: (v) => fmtLeader(v) },
  { key: 'home_pts_leader', label: 'Home PTS', format: (v) => fmtLeader(v) },
  { key: 'home_reb_leader', label: 'Home REB', format: (v) => fmtLeader(v) },
  { key: 'home_ast_leader', label: 'Home AST', format: (v) => fmtLeader(v) },
];

export default function TeamPage() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [stats, setStats] = useState([]);
  const [roster, setRoster] = useState([]);
  const [gameLog, setGameLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTeam(teamId), fetchTeamJerseyStats(teamId), fetchTeamRoster(teamId), fetchTeamGameLog(teamId)])
      .then(([teamData, statsData, rosterData, gameLogData]) => {
        if (!cancelled) {
          setTeam(teamData);
          setStats(statsData);
          setRoster(rosterData);
          setGameLog(gameLogData);
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
        {team?.name}
      </h1>
      <h2 className="text-lg text-gray-600 mb-6">Jersey Stats &mdash; 2025-26</h2>
      <StatsTable columns={columns} rows={stats} />

      {roster.length > 0 && (
        <>
          <h2 className="text-lg text-gray-600 mt-8 mb-4">Roster</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {roster.map((p) => (
              <li key={p.player_id}>
                <Link
                  to={`/players/${p.player_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {p.player_name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {gameLog.length > 0 && (
        <>
          <h2 className="text-lg text-gray-600 mt-8 mb-4">Game Log</h2>
          <StatsTable columns={gameLogColumns} rows={gameLog} />
        </>
      )}
    </div>
  );
}
