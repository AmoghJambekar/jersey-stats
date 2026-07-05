import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { fetchPlayerTeams, fetchPlayerBio, fetchPlayerJerseyStats, fetchPlayerGameLog } from '../api';
import StatsTable from '../components/StatsTable';
import ColorDots from '../components/ColorDots';

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
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;
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
  const team = bio.draft_team ? ` (${bio.draft_team})` : '';
  return `${bio.draft_year}: R${bio.draft_round}, Pk ${bio.draft_number}${team}`;
}

const TEAM_NICKNAMES = {
  ATL: 'Hawks', BOS: 'Celtics', BKN: 'Nets', CHA: 'Hornets',
  CHI: 'Bulls', CLE: 'Cavaliers', DAL: 'Mavericks', DEN: 'Nuggets',
  DET: 'Pistons', GSW: 'Warriors', HOU: 'Rockets', IND: 'Pacers',
  LAC: 'Clippers', LAL: 'Lakers', MEM: 'Grizzlies', MIA: 'Heat',
  MIL: 'Bucks', MIN: 'Timberwolves', NOP: 'Pelicans', NYK: 'Knicks',
  OKC: 'Thunder', ORL: 'Magic', PHI: '76ers', PHX: 'Suns',
  POR: 'Trail Blazers', SAC: 'Kings', SAS: 'Spurs', TOR: 'Raptors',
  UTA: 'Jazz', WAS: 'Wizards',
};

// --- Stats table columns (excluding team — handled via rowspan) ---
const statCols = [
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
  { key: 'team_id', label: 'Team', format: (v) => (
    <img src={teamLogoUrl(v)} alt={v} className="w-6 h-6 object-contain" />
  ) },
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
        style={{ backgroundColor: colors.primary, minHeight: '340px' }}
      >
        {/* Watermark logo in background */}
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

        <div className="relative max-w-6xl mx-auto px-4 flex items-end" style={{ minHeight: '340px' }}>
          {/* Team logo top-left */}
          {logoUrl && (
            <Link to={currentTeamId ? `/teams/${currentTeamId}` : '/'}>
              <img
                src={logoUrl}
                alt={currentTeamName}
                className="absolute top-5 left-5 w-24 h-24 object-contain drop-shadow-lg"
              />
            </Link>
          )}

          {/* Player headshot */}
          <div className="shrink-0 self-end z-10" style={{ marginBottom: '-2px' }}>
            <img
              src={headshotUrl(playerId)}
              alt={playerName || 'Player'}
              className="w-72 h-56 object-contain object-bottom drop-shadow-xl"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Player info text */}
          <div className="ml-10 pb-10 z-10">
            <p className="text-white/80 text-sm font-medium tracking-wide">
              {currentTeamName}
              {bio?.jersey_number ? ` | #${bio.jersey_number}` : ''}
              {bio?.position ? ` | ${bio.position}` : ''}
            </p>
            <h1 className="text-4xl font-bold text-white tracking-wide mt-1">
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
            className="flex items-center divide-x divide-white/20 shrink-0"
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
            <div className="flex-1 grid grid-cols-4 grid-rows-2 divide-x divide-y divide-white/20 border border-white/20">
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
            {stats.length === 0 ? (
              <p className="text-gray-500">No stats available.</p>
            ) : (() => {
              // Group stats by team, ordered by teams array, GP desc within each group
              const teamOrder = teams.map((t) => t.team_id);
              const grouped = {};
              for (const row of stats) {
                (grouped[row.team_id] ??= []).push(row);
              }
              for (const tid of Object.keys(grouped)) {
                grouped[tid].sort((a, b) => b.games_played - a.games_played);
              }
              const orderedGroups = teamOrder
                .filter((tid) => grouped[tid])
                .map((tid) => ({ teamId: tid, rows: grouped[tid] }));
              // For single-team players, flatten into one group without team column
              const showTeamCol = multiTeam;
              const totalCols = (showTeamCol ? 1 : 0) + statCols.length;

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                      <tr>
                        {showTeamCol && <th className="px-4 py-3 font-medium">Team</th>}
                        {statCols.map((col) => (
                          <th key={col.key} className="px-4 py-3 font-medium">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orderedGroups.map((group) =>
                        group.rows.map((row, i) => (
                          <tr key={`${group.teamId}-${i}`} className="hover:bg-gray-50">
                            {showTeamCol && i === 0 && (
                              <td
                                rowSpan={group.rows.length}
                                className="px-4 py-3 align-middle border-r border-gray-200"
                              >
                                <div className="flex items-center gap-2">
                                  <img
                                    src={teamLogoUrl(group.teamId)}
                                    alt={TEAM_NICKNAMES[group.teamId]}
                                    className="w-6 h-6 object-contain shrink-0"
                                  />
                                  <span className="font-medium text-gray-900 whitespace-nowrap">
                                    {TEAM_NICKNAMES[group.teamId] || group.teamId}
                                  </span>
                                </div>
                              </td>
                            )}
                            {statCols.map((col) => (
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
                        ))
                      )}
                    </tbody>
                    {overallRow && (
                      <tfoot className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                        <tr>
                          {showTeamCol && <td className="px-4 py-3" />}
                          {statCols.map((col, ci) => {
                            const val = overallRow[col.key];
                            // Merge edition + colors into one "Overall" cell
                            if (col.key === 'edition_name') {
                              return (
                                <td key={col.key} className="px-4 py-3" colSpan={2}>Overall</td>
                              );
                            }
                            if (col.key === 'color_tags') return null;
                            return (
                              <td key={col.key} className="px-4 py-3">
                                {col.format && val != null && typeof val === 'number'
                                  ? col.format(val, overallRow)
                                  : val ?? ''}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              );
            })()}
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
