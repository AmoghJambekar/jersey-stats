import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { fetchPlayerTeams, fetchPlayerBio, fetchPlayerJerseyStats, fetchPlayerGameLog } from '../api';
import StatsTable from '../components/StatsTable';

// --- Team colors (primary = banner, secondary = accent) ---
const TEAM_COLORS = {
  ATL: { primary: '#E03A3E', secondary: '#C1D32F' },
  BOS: { primary: '#007A33', secondary: '#BA9653' },
  BKN: { primary: '#000000', secondary: '#FFFFFF' },
  CHA: { primary: '#1D1160', secondary: '#00788C' },
  CHI: { primary: '#CE1141', secondary: '#000000' },
  CLE: { primary: '#860038', secondary: '#FDBB30' },
  DAL: { primary: '#00538C', secondary: '#002B5E' },
  DEN: { primary: '#0E2240', secondary: '#FEC524' },
  DET: { primary: '#C8102E', secondary: '#1D42BA' },
  GSW: { primary: '#1D428A', secondary: '#FFC72C' },
  HOU: { primary: '#CE1141', secondary: '#000000' },
  IND: { primary: '#002D62', secondary: '#FDBB30' },
  LAC: { primary: '#C8102E', secondary: '#1D428A' },
  LAL: { primary: '#552583', secondary: '#FDB927' },
  MEM: { primary: '#5D76A9', secondary: '#12173F' },
  MIA: { primary: '#98002E', secondary: '#F9A01B' },
  MIL: { primary: '#00471B', secondary: '#EEE1C6' },
  MIN: { primary: '#0C2340', secondary: '#236192' },
  NOP: { primary: '#0C2340', secondary: '#C8102E' },
  NYK: { primary: '#006BB6', secondary: '#F58426' },
  OKC: { primary: '#007AC1', secondary: '#EF6020' },
  ORL: { primary: '#0077C0', secondary: '#C4CED4' },
  PHI: { primary: '#006BB6', secondary: '#ED174C' },
  PHX: { primary: '#1D1160', secondary: '#E56020' },
  POR: { primary: '#E03A3E', secondary: '#000000' },
  SAC: { primary: '#5A2D81', secondary: '#63727A' },
  SAS: { primary: '#C4CED4', secondary: '#000000' },
  TOR: { primary: '#CE1141', secondary: '#000000' },
  UTA: { primary: '#002B5C', secondary: '#F9A01B' },
  WAS: { primary: '#002B5C', secondary: '#E31837' },
};

function teamLogoUrl(teamId) {
  // We need the nba_id for the CDN URL. Since we don't have it on the player page,
  // we use a mapping from team abbreviation to NBA numeric ID.
  const NBA_IDS = {
    ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766,
    CHI: 1610612741, CLE: 1610612739, DAL: 1610612742, DEN: 1610612743,
    DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
    LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748,
    MIL: 1610612749, MIN: 1610612750, NOP: 1610612740, NYK: 1610612752,
    OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
    POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761,
    UTA: 1610612762, WAS: 1610612764,
  };
  const nbaId = NBA_IDS[teamId];
  return nbaId ? `https://cdn.nba.com/logos/nba/${nbaId}/primary/L/logo.svg` : '';
}

function headshotUrl(playerId) {
  return `https://cdn.nba.com/headshots/nba/latest/260x190/${playerId}.png`;
}

function darkenHex(hex, amount = 0.25) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * (1 - amount));
  const dg = Math.round(g * (1 - amount));
  const db = Math.round(b * (1 - amount));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

function computeAge(birthDateStr) {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatBirthDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const date = new Date(+y, +m - 1, +d);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDraft(bio) {
  if (!bio.draft_year || bio.draft_year === 0) return 'Undrafted';
  return `${bio.draft_year} R${bio.draft_round} Pick ${bio.draft_number}`;
}

// --- Stats table columns ---
const jerseyStatsColumns = [
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
  { key: 'jersey', label: 'Jersey', format: (_, row) => stacked(row.away_jersey || '\u2014', row.home_jersey || '\u2014') },
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
  const [bio, setBio] = useState(null);
  const [stats, setStats] = useState([]);
  const [gameLog, setGameLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchPlayerTeams(playerId).catch(() => []),
      fetchPlayerBio(playerId).catch(() => null),
      fetchPlayerJerseyStats(playerId),
      fetchPlayerGameLog(playerId),
    ])
      .then(([teamsData, bioData, statsData, gameLogData]) => {
        if (cancelled) return;
        setTeams(teamsData);
        setBio(bioData);
        setStats(statsData);
        setGameLog(gameLogData);
        if (!playerName && teamsData.length > 0) {
          setPlayerName(teamsData[0].player_name);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [playerId]);

  if (loading) return <p className="text-gray-500 p-6">Loading player...</p>;
  if (error) return <p className="text-red-500 p-6">Error: {error}</p>;

  // Use the last team (current/most recent) for coloring
  const currentTeamId = teams.length > 0 ? teams[teams.length - 1].team_id : null;
  const currentTeamName = teams.length > 0 ? teams[teams.length - 1].team_name : '';
  const colors = TEAM_COLORS[currentTeamId] || { primary: '#1D428A', secondary: '#002D62' };
  const darkPrimary = darkenHex(colors.primary, 0.3);

  const multiTeam = teams.length > 1;

  // Compute overall/season averages from jersey stats
  const overallRow = (() => {
    if (stats.length === 0) return null;
    const totalGP = stats.reduce((s, r) => s + r.games_played, 0);
    if (totalGP === 0) return null;
    const wavg = (key) => stats.reduce((s, r) => s + r[key] * r.games_played, 0) / totalGP;
    return {
      team_name: 'Overall',
      edition_name: 'Overall',
      color_tags: 'Overall',
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

  const seasonPPG = overallRow?.ppg?.toFixed(1) ?? '—';
  const seasonRPG = overallRow?.rpg?.toFixed(1) ?? '—';
  const seasonAPG = overallRow?.apg?.toFixed(1) ?? '—';

  const age = bio ? computeAge(bio.birth_date) : null;

  const logoUrl = currentTeamId ? teamLogoUrl(currentTeamId) : '';

  const tabs = [
    { id: 'stats', label: 'Stats' },
    { id: 'gamelog', label: 'Game Log' },
    { id: 'bio', label: 'Bio' },
  ];

  return (
    <div>
      {/* === BANNER === */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: colors.primary, minHeight: '260px' }}
      >
        {/* Watermark logo in background */}
        {logoUrl && (
          <img
            src={logoUrl}
            alt=""
            className="absolute pointer-events-none select-none"
            style={{
              width: '360px',
              height: '360px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.1,
            }}
          />
        )}

        <div className="relative max-w-6xl mx-auto px-4 flex items-end" style={{ minHeight: '260px' }}>
          {/* Team logo top-left */}
          {logoUrl && (
            <Link to={currentTeamId ? `/teams/${currentTeamId}` : '/'}>
              <img
                src={logoUrl}
                alt={currentTeamName}
                className="absolute top-4 left-4 w-20 h-20 object-contain drop-shadow-lg"
              />
            </Link>
          )}

          {/* Player headshot */}
          <div className="shrink-0 self-end z-10" style={{ marginBottom: '-2px' }}>
            <img
              src={headshotUrl(playerId)}
              alt={playerName || 'Player'}
              className="w-52 h-40 object-contain object-bottom drop-shadow-xl"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Player info text */}
          <div className="ml-8 pb-8 z-10">
            <p className="text-white/80 text-sm font-medium tracking-wide">
              {currentTeamName}
              {bio?.jersey_number ? ` | #${bio.jersey_number}` : ''}
              {bio?.position ? ` | ${bio.position}` : ''}
            </p>
            <h1 className="text-4xl font-bold text-white uppercase tracking-wider mt-1">
              {playerName || `Player ${playerId}`}
            </h1>
          </div>
        </div>
      </div>

      {/* === STATS + BIO INFO BAR === */}
      <div className="flex" style={{ backgroundColor: darkPrimary }}>
        <div className="max-w-6xl mx-auto px-4 flex w-full">
          {/* Left: Season averages (PPG / RPG / APG) */}
          <div
            className="flex divide-x divide-white/20 shrink-0"
            style={{ backgroundColor: darkenHex(colors.primary, 0.45) }}
          >
            {[
              { label: 'PPG', value: seasonPPG },
              { label: 'RPG', value: seasonRPG },
              { label: 'APG', value: seasonAPG },
            ].map((stat) => (
              <div key={stat.label} className="px-8 py-4 text-center min-w-[100px]">
                <div className="text-white/70 text-xs font-semibold tracking-wider uppercase">{stat.label}</div>
                <div className="text-white text-2xl font-bold mt-0.5">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Right: Bio info grid */}
          {bio && (
            <div className="flex-1 grid grid-cols-4 grid-rows-2 divide-x divide-y divide-white/20 border-l border-white/20">
              {[
                { label: 'HEIGHT', value: bio.height || '—' },
                { label: 'WEIGHT', value: bio.weight ? `${bio.weight}lb` : '—' },
                { label: 'COUNTRY', value: bio.country || '—' },
                { label: 'LAST ATTENDED', value: bio.last_attended || '—' },
                { label: 'AGE', value: age != null ? `${age} years` : '—' },
                { label: 'BIRTHDATE', value: formatBirthDate(bio.birth_date) || '—' },
                { label: 'DRAFT', value: formatDraft(bio) },
                { label: 'EXPERIENCE', value: bio.years_exp != null ? `${bio.years_exp} Year${bio.years_exp !== 1 ? 's' : ''}` : '—' },
              ].map((item) => (
                <div key={item.label} className="px-4 py-3 text-center">
                  <div className="text-white/60 text-[10px] font-semibold tracking-wider uppercase">{item.label}</div>
                  <div className="text-white text-sm font-medium mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
          )}
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
            <StatsTable
              columns={multiTeam ? jerseyStatsColumns : jerseyStatsColumns.filter((c) => c.key !== 'team_name')}
              rows={stats}
              footerRow={overallRow}
            />
          </>
        )}

        {activeTab === 'gamelog' && (
          <>
            {gameLog.length > 0 ? (
              <StatsTable
                columns={multiTeam ? gameLogColumns : gameLogColumns.filter((c) => c.key !== 'team_id')}
                rows={gameLog}
              />
            ) : (
              <p className="text-gray-500">No game log data available.</p>
            )}
          </>
        )}

        {activeTab === 'bio' && (
          <p className="text-gray-500">Bio content coming soon.</p>
        )}
      </div>
    </div>
  );
}
