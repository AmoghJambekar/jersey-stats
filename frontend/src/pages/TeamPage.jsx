import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchTeam, fetchTeamJerseyStats, fetchTeamGameLog, fetchTeamStandings, fetchTeamDepthChart } from '../api';
import StatsTable from '../components/StatsTable';
import ColorDots from '../components/ColorDots';
import { TEAM_COLORS, TEAM_NICKNAMES, COACHES, teamLogoUrl, headshotUrl, darkenHex } from '../data/teamData';

// --- Jersey stats columns ---
const jerseyStatCols = [
  { key: 'edition_name', label: 'Edition' },
  { key: 'color_tags', label: 'Colors' },
  { key: 'games_played', label: 'GP' },
  { key: 'wins', label: 'W' },
  { key: 'losses', label: 'L' },
  { key: 'ppg', label: 'PPG', format: (v) => v?.toFixed(1) },
  { key: 'opp_ppg', label: 'Opp PPG', format: (v) => v?.toFixed(1) },
];

const fmtLeader = (l) => l ? `${l.name} (${l.value})` : '';

const stackedLeaders = (away, home) => {
  const aw = away?.value ?? 0;
  const hw = home?.value ?? 0;
  return (
    <div className="flex flex-col leading-tight">
      <span className={aw >= hw && away ? 'font-medium' : ''}>{fmtLeader(away)}</span>
      <span className={hw >= aw && home ? 'font-medium' : ''}>{fmtLeader(home)}</span>
    </div>
  );
};

const stacked = (top, bottom) => (
  <div className="flex flex-col leading-tight">
    <span>{top}</span>
    <span>{bottom}</span>
  </div>
);

const fmtDate = (d) => {
  const [y, m, day] = d.split('-');
  const date = new Date(+y, +m - 1, +day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const gameLogColumns = [
  { key: 'game_date', label: 'Date', format: (v) => fmtDate(v) },
  { key: 'away_team', label: 'Game', format: (_, row) => {
    const awayWon = row.away_score > row.home_score;
    return (
      <div className="flex flex-col gap-0.5 leading-tight">
        <span className="flex items-center gap-1.5">
          <img src={teamLogoUrl(row.away_team)} alt={row.away_team} className="w-7 h-7 object-contain" />
          <span className="text-xs text-gray-600">{TEAM_NICKNAMES[row.away_team]}</span>
          <span className={awayWon ? 'text-green-600 font-semibold' : 'text-red-500'}>{row.away_score}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <img src={teamLogoUrl(row.home_team)} alt={row.home_team} className="w-7 h-7 object-contain" />
          <span className="text-xs text-gray-600">{TEAM_NICKNAMES[row.home_team]}</span>
          <span className={!awayWon ? 'text-green-600 font-semibold' : 'text-red-500'}>{row.home_score}</span>
        </span>
      </div>
    );
  } },
  { key: 'away_jersey', label: 'Jersey', format: (_, row) => stacked(row.away_jersey || '—', row.home_jersey || '—') },
  { key: 'pts_leader', label: 'Pts Leader', format: (_, row) => stackedLeaders(row.away_pts_leader, row.home_pts_leader) },
  { key: 'reb_leader', label: 'Reb Leader', format: (_, row) => stackedLeaders(row.away_reb_leader, row.home_reb_leader) },
  { key: 'ast_leader', label: 'Ast Leader', format: (_, row) => stackedLeaders(row.away_ast_leader, row.home_ast_leader) },
];

// --- Depth chart helpers ---
function parseHeightInches(h) {
  if (!h) return 0;
  const m = h.match(/(\d+)-(\d+)/);
  if (!m) return 0;
  return parseInt(m[1]) * 12 + parseInt(m[2]);
}

function assignPosition(pos, height) {
  const inches = parseHeightInches(height);
  if (!pos) return 'SG';
  const p = pos.toLowerCase();
  if (p === 'center' || p === 'c') return 'C';
  if (p === 'guard' || p === 'g') return inches < 75 ? 'PG' : 'SG'; // 6'3" = 75"
  if (p === 'forward' || p === 'f') return inches < 80 ? 'SF' : 'PF'; // 6'8" = 80"
  if (p.includes('guard') && p.includes('forward')) return 'SG';
  if (p.includes('forward') && p.includes('center')) return 'PF';
  if (p.includes('guard')) return inches < 75 ? 'PG' : 'SG';
  if (p.includes('forward')) return inches < 80 ? 'SF' : 'PF';
  return 'SG';
}

const POSITION_ORDER = ['PG', 'SG', 'SF', 'PF', 'C'];

function buildDepthChart(players) {
  const byPos = { PG: [], SG: [], SF: [], PF: [], C: [] };
  for (const p of players) {
    const pos = assignPosition(p.position, p.height);
    byPos[pos].push(p);
  }
  // Already sorted by avg_min DESC from API
  return byPos;
}

export default function TeamPage() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [stats, setStats] = useState([]);
  const [gameLog, setGameLog] = useState([]);
  const [standings, setStandings] = useState([]);
  const [depthChart, setDepthChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchTeam(teamId),
      fetchTeamJerseyStats(teamId),
      fetchTeamDepthChart(teamId),
      fetchTeamStandings(teamId),
      fetchTeamGameLog(teamId),
    ])
      .then(([teamData, statsData, depthData, standingsData, gameLogData]) => {
        if (!cancelled) {
          setTeam(teamData);
          setStats(statsData);
          setDepthChart(depthData);
          setStandings(standingsData);
          setGameLog(gameLogData);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teamId]);

  if (loading) return <p className="text-gray-500 p-6">Loading team...</p>;
  if (error) return <p className="text-red-500 p-6">Error: {error}</p>;

  const colors = TEAM_COLORS[teamId] || { primary: '#1D428A', secondary: '#002D62' };
  const darkPrimary = darkenHex(colors.primary, 0.3);
  const logoUrl = teamLogoUrl(teamId);

  // Compute record from standings
  const teamStanding = standings.find((s) => s.team_id === teamId);
  const wins = teamStanding?.wins ?? 0;
  const losses = teamStanding?.losses ?? 0;
  const teamRank = standings.findIndex((s) => s.team_id === teamId) + 1;
  const conference = team?.conference || '';
  const confLabel = conference === 'East' ? 'East' : conference === 'West' ? 'West' : conference;

  // Previous game
  const lastGame = gameLog.length > 0 ? gameLog[0] : null;

  // Depth chart data
  const depthByPos = buildDepthChart(depthChart);

  const tabs = [
    { id: 'stats', label: 'Stats' },
    { id: 'gamelog', label: 'Game Log' },
  ];

  return (
    <div>
      {/* === BANNER === */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: colors.primary, minHeight: '260px' }}
      >
        {/* Watermark logo */}
        {logoUrl && (
          <img
            src={logoUrl}
            alt=""
            className="absolute pointer-events-none select-none"
            style={{
              width: '420px',
              height: '420px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.1,
            }}
          />
        )}

        <div className="relative max-w-6xl mx-auto px-4 flex items-center gap-8" style={{ minHeight: '260px' }}>
          {/* Big team logo */}
          {logoUrl && (
            <img
              src={logoUrl}
              alt={team?.name}
              className="w-28 h-28 object-contain drop-shadow-lg shrink-0"
            />
          )}

          {/* Team info */}
          <div className="z-10 flex-1">
            <h1 className="text-4xl font-bold text-white tracking-wide">
              {team?.name}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              {COACHES[teamId] ? `Coach: ${COACHES[teamId]}` : ''}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-white text-xl font-semibold">{wins}-{losses}</span>
              {teamRank > 0 && (
                <span className="text-white/70 text-sm">
                  {teamRank}{teamRank === 1 ? 'st' : teamRank === 2 ? 'nd' : teamRank === 3 ? 'rd' : 'th'} {confLabel}
                </span>
              )}
            </div>
          </div>

          {/* Previous game card */}
          {lastGame && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 shrink-0 z-10" style={{ minWidth: '220px' }}>
              <div className="text-white/60 text-xs uppercase tracking-wider mb-2">Last Game</div>
              <div className="text-white/50 text-xs mb-2">{fmtDate(lastGame.game_date)}</div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <img src={teamLogoUrl(lastGame.away_team)} alt={lastGame.away_team} className="w-6 h-6 object-contain" />
                  <span className="text-white text-xs flex-1">{TEAM_NICKNAMES[lastGame.away_team]}</span>
                  <span className={`text-sm font-semibold ${lastGame.away_score > lastGame.home_score ? 'text-green-400' : 'text-red-400'}`}>
                    {lastGame.away_score}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <img src={teamLogoUrl(lastGame.home_team)} alt={lastGame.home_team} className="w-6 h-6 object-contain" />
                  <span className="text-white text-xs flex-1">{TEAM_NICKNAMES[lastGame.home_team]}</span>
                  <span className={`text-sm font-semibold ${lastGame.home_score > lastGame.away_score ? 'text-green-400' : 'text-red-400'}`}>
                    {lastGame.home_score}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === DEPTH CHART === */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Depth Chart</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-w-lg">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Pos</th>
                <th className="px-2 py-2 text-center font-medium">Starter</th>
                <th className="px-2 py-2 text-center font-medium">2nd</th>
                <th className="px-2 py-2 text-center font-medium">3rd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {POSITION_ORDER.map((pos) => {
                const players = depthByPos[pos] || [];
                const top3 = players.slice(0, 3);
                return (
                  <tr key={pos}>
                    <td className="px-2 py-2 font-semibold text-gray-700">{pos}</td>
                    {[0, 1, 2].map((idx) => {
                      const p = top3[idx];
                      if (!p) return <td key={idx} className="px-2 py-2 text-center text-gray-300">—</td>;
                      const lastName = p.player_name.split(' ').pop();
                      return (
                        <td key={idx} className="px-2 py-2 text-center">
                          <Link to={`/players/${p.player_id}`} className="flex flex-col items-center gap-0.5 hover:opacity-80">
                            <img
                              src={headshotUrl(p.player_id)}
                              alt={p.player_name}
                              className="w-8 h-8 rounded-full object-cover bg-gray-100"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <span className="text-[10px] text-gray-700 leading-tight truncate max-w-[60px]">{lastName}</span>
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* === TAB BAR === */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* === TAB CONTENT === */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'stats' && (
          <>
            {stats.length === 0 ? (
              <p className="text-gray-500">No jersey stats available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                    <tr>
                      {jerseyStatCols.map((col) => (
                        <th key={col.key} className="px-4 py-3 font-medium">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {jerseyStatCols.map((col) => (
                          <td key={col.key} className="px-4 py-3">
                            {col.key === 'color_tags' ? (
                              <ColorDots colors={row[col.key]} />
                            ) : col.format ? (
                              col.format(row[col.key], row)
                            ) : (
                              row[col.key]
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'gamelog' && (
          <>
            {gameLog.length > 0 ? (
              <StatsTable columns={gameLogColumns} rows={gameLog} />
            ) : (
              <p className="text-gray-500">No game log data available.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
