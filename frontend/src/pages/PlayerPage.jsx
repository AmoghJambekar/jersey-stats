import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { fetchPlayerTeams, fetchPlayerJerseyStats, fetchPlayerGameLog } from '../api';
import StatsTable from '../components/StatsTable';

const columns = [
  { key: 'team_name', label: 'Team' },
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

const gameLogColumns = [
  { key: 'game_date', label: 'Date' },
  { key: 'team_id', label: 'Team' },
  { key: 'home_team', label: 'Home' },
  { key: 'away_team', label: 'Away' },
  { key: 'home_jersey', label: 'Home Jersey' },
  { key: 'away_jersey', label: 'Away Jersey' },
  { key: 'pts', label: 'PTS' },
  { key: 'reb', label: 'REB' },
  { key: 'ast', label: 'AST' },
  { key: 'fg', label: 'FGM/FGA', format: (_, row) => `${row.fgm}/${row.fga}` },
  { key: 'fg3', label: 'FG3M/FG3A', format: (_, row) => `${row.fg3m}/${row.fg3a}` },
  { key: 'ft', label: 'FTM/FTA', format: (_, row) => `${row.ftm}/${row.fta}` },
  { key: 'min', label: 'MIN', format: (v) => v?.toFixed(1) },
  { key: 'plus_minus', label: '+/-', format: (v) => (v > 0 ? '+' : '') + v?.toFixed(1) },
];

export default function PlayerPage() {
  const { playerId } = useParams();
  const location = useLocation();

  const [playerName, setPlayerName] = useState(location.state?.playerName || null);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState([]);
  const [gameLog, setGameLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const teamsFetch = fetchPlayerTeams(playerId).catch(() => []);

    Promise.all([fetchPlayerJerseyStats(playerId), fetchPlayerGameLog(playerId), teamsFetch])
      .then(([statsData, gameLogData, teamsData]) => {
        if (cancelled) return;
        setStats(statsData);
        setGameLog(gameLogData);
        setTeams(teamsData);
        if (!playerName && teamsData.length > 0) {
          setPlayerName(teamsData[0].player_name);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [playerId]);

  if (loading) return <p className="text-gray-500">Loading player...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  const teamLabel = teams.length > 0
    ? teams.map((t) => t.team_name).join(' → ')
    : null;

  return (
    <div>
      <Link to="/" className="text-sm text-blue-600 hover:underline">&larr; All Teams</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-2">
        {playerName || `Player ${playerId}`}
      </h1>
      {teamLabel && <p className="text-gray-500">{teamLabel}</p>}
      <div className="mb-6" />
      <StatsTable columns={columns} rows={stats} />

      {gameLog.length > 0 && (
        <>
          <h2 className="text-lg text-gray-600 mt-8 mb-4">Game Log</h2>
          <StatsTable columns={gameLogColumns} rows={gameLog} />
        </>
      )}
    </div>
  );
}
