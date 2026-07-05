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
  { key: 'fg3_pct', label: '3P%', format: (v) => v?.toFixed(1) },
  { key: 'fg_pct', label: 'FG%', format: (v) => v?.toFixed(1) },
  { key: 'ft_pct', label: 'FT%', format: (v) => v?.toFixed(1) },
  { key: 'plus_minus', label: '+/-', format: (v) => (v > 0 ? '+' : '') + Math.round(v) },
];

const fmtDate = (d) => {
  const [y, m, day] = d.split('-');
  const date = new Date(+y, +m - 1, +day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const stacked = (top, bottom) => (
  <div className="flex flex-col leading-tight">
    <span>{top}</span>
    <span>{bottom}</span>
  </div>
);

const gameLogColumns = [
  { key: 'game_date', label: 'Date', format: (v) => fmtDate(v) },
  { key: 'team_id', label: 'Team' },
  { key: 'game', label: 'Game', format: (_, row) => stacked(`${row.away_team} ${row.away_score}`, `${row.home_team} ${row.home_score}`) },
  { key: 'jersey', label: 'Jersey', format: (_, row) => stacked(row.away_jersey || '—', row.home_jersey || '—') },
  { key: 'pts', label: 'PTS' },
  { key: 'reb', label: 'REB' },
  { key: 'ast', label: 'AST' },
  { key: 'fg', label: 'FGM/FGA', format: (_, row) => `${row.fgm}/${row.fga}` },
  { key: 'fg3', label: 'FG3M/FG3A', format: (_, row) => `${row.fg3m}/${row.fg3a}` },
  { key: 'ft', label: 'FTM/FTA', format: (_, row) => `${row.ftm}/${row.fta}` },
  { key: 'min', label: 'MIN', format: (v) => Math.round(v) },
  { key: 'plus_minus', label: '+/-', format: (v) => (v > 0 ? '+' : '') + Math.round(v) },
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

  const multiTeam = teams.length > 1;
  const teamLabel = teams.length > 0
    ? teams.map((t) => t.team_name).join(' → ')
    : null;

  const overallRow = (() => {
    if (stats.length === 0) return null;
    const totalGP = stats.reduce((s, r) => s + r.games_played, 0);
    if (totalGP === 0) return null;
    const wavg = (key) => stats.reduce((s, r) => s + r[key] * r.games_played, 0) / totalGP;
    return {
      team_name: 'Overall',
      edition_name: 'Overall',
      games_played: totalGP,
      ppg: wavg('ppg'),
      rpg: wavg('rpg'),
      apg: wavg('apg'),
      fg3_pct: wavg('fg3_pct'),
      fg_pct: wavg('fg_pct'),
      ft_pct: wavg('ft_pct'),
      plus_minus: wavg('plus_minus'),
    };
  })();

  return (
    <div>
      <Link to="/" className="text-sm text-blue-600 hover:underline">&larr; All Teams</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-2">
        {playerName || `Player ${playerId}`}
      </h1>
      {teamLabel && <p className="text-gray-500">{teamLabel}</p>}
      <div className="mb-6" />
      <StatsTable columns={multiTeam ? columns : columns.filter((c) => c.key !== 'team_name')} rows={stats} footerRow={overallRow} />

      {gameLog.length > 0 && (
        <>
          <h2 className="text-lg text-gray-600 mt-8 mb-4">Game Log</h2>
          <StatsTable columns={multiTeam ? gameLogColumns : gameLogColumns.filter((c) => c.key !== 'team_id')} rows={gameLog} />
        </>
      )}
    </div>
  );
}
