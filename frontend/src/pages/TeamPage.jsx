import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchTeam, fetchTeamJerseyStats, fetchTeamGameLog, fetchTeamStandings, fetchTeamDepthChart } from '../api';
import StatsTable from '../components/StatsTable';
import ColorDots from '../components/ColorDots';
import { TEAM_COLORS, TEAM_NICKNAMES, teamLogoUrl, headshotUrl, darkenHex } from '../data/teamData';

// --- Jersey stats columns ---
const jerseyStatCols = [
  { key: 'edition_name', label: 'Edition' },
  { key: 'color_tags', label: 'Colors' },
  { key: 'games_played', label: 'GP' },
  { key: 'wins', label: 'W' },
  { key: 'losses', label: 'L' },
  { key: 'win_pct', label: 'WIN%', format: (v) => v != null ? v.toFixed(3).replace(/^0/, '') : '—' },
  { key: 'ppg', label: 'PPG', format: (v) => v?.toFixed(1) },
  { key: 'opp_ppg', label: 'Opp PPG', format: (v) => v?.toFixed(1) },
  { key: 'rpg', label: 'RPG', format: (v) => v?.toFixed(1) },
  { key: 'apg', label: 'APG', format: (v) => v?.toFixed(1) },
  { key: 'diff', label: 'DIFF', format: (v) => v != null ? (v > 0 ? '+' : '') + v.toFixed(1) : '—' },
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

// Hardcoded position assignments for 2025-26 season based on most-used starting lineups.
// Priority: end-of-season / post-deadline lineups. Sorted by starter first within each position.
const POSITION_MAP = {
  // ATL — Starters: Young/Daniels/Risacher/Johnson/Porzingis
  'Trae Young': 'PG', 'CJ McCollum': 'PG', 'Dyson Daniels': 'SG',
  'Nickeil Alexander-Walker': 'SG', 'Vít Krejčí': 'SG',
  'Zaccharie Risacher': 'SF', 'Jonathan Kuminga': 'SF',
  'Jalen Johnson': 'PF', 'Onyeka Okongwu': 'PF',
  'Kristaps Porziņģis': 'C',
  // BOS — Starters: Pritchard/White/Brown/Hauser/Queta (Tatum out for season)
  'Payton Pritchard': 'PG', 'Anfernee Simons': 'PG',
  'Derrick White': 'SG', 'Jaylen Brown': 'SF',
  'Sam Hauser': 'PF', 'Jayson Tatum': 'PF',
  'Neemias Queta': 'C', 'Nikola Vučević': 'C',
  // BKN — Starters: Traore/Demin/MPJ/Clowney/Claxton
  'Nolan Traore': 'PG', 'Malachi Smith': 'PG',
  'Egor Dëmin': 'SG', 'Drake Powell': 'SG',
  'Michael Porter Jr.': 'SF', 'Ziaire Williams': 'SF', 'Terance Mann': 'SF',
  'Noah Clowney': 'PF', 'Danny Wolf': 'PF',
  'Nic Claxton': 'C',
  // CLE — Starters: Harden/Mitchell/Wade/Mobley/Allen
  'James Harden': 'PG', 'Darius Garland': 'PG', 'Dennis Schröder': 'PG', 'Craig Porter Jr.': 'PG',
  'Donovan Mitchell': 'SG', 'Sam Merrill': 'SG', 'Keon Ellis': 'SG', 'Tyrese Proctor': 'SG',
  'Dean Wade': 'SF', 'De\'Andre Hunter': 'SF', 'Max Strus': 'SF', 'Jaylon Tyson': 'SF',
  'Evan Mobley': 'PF', 'Nae\'Qwan Tomlin': 'PF', 'Tristan Enaruna': 'PF', 'Riley Minix': 'PF',
  'Jarrett Allen': 'C', 'Larry Nance Jr.': 'C', 'Thomas Bryant': 'C',
  // CHA — Starters: Ball/Knueppel/Miller/Bridges/Diabate
  'LaMelo Ball': 'PG', 'Collin Sexton': 'PG',
  'Kon Knueppel': 'SG', 'Sion James': 'SG', 'Coby White': 'SG',
  'Brandon Miller': 'SF', 'Grant Williams': 'SF',
  'Miles Bridges': 'PF',
  'Moussa Diabaté': 'C', 'Ryan Kalkbrenner': 'C',
  // CHI — Starters: Giddey/Okoro/Buzelis/Vucevic + (Tre Jones or Ayo)
  'Josh Giddey': 'PG', 'Tre Jones': 'PG', 'Ayo Dosunmu': 'PG',
  'Coby White': 'SG', 'Anfernee Simons': 'SG',
  'Isaac Okoro': 'SF', 'Matas Buzelis': 'PF',
  'Nikola Vučević': 'C', 'Nick Richards': 'C',
  // DAL — Starters: Christie/Flagg/Marshall/Washington/Gafford (post-deadline)
  'Max Christie': 'PG', 'Brandon Williams': 'PG', 'Klay Thompson': 'PG',
  'Cooper Flagg': 'SF', 'Khris Middleton': 'SF',
  'Naji Marshall': 'SG', 'P.J. Washington': 'PF',
  'Anthony Davis': 'C', 'Daniel Gafford': 'C',
  'Marvin Bagley III': 'PF',
  // DEN — Starters: Murray/Braun/Cameron Johnson/Gordon/Jokic
  'Jamal Murray': 'PG', 'Jalen Pickett': 'PG',
  'Christian Braun': 'SG', 'Tim Hardaway Jr.': 'SG', 'Bruce Brown': 'SG',
  'Cameron Johnson': 'SF', 'Peyton Watson': 'SF', 'Spencer Jones': 'SF',
  'Aaron Gordon': 'PF', 'Nikola Jokić': 'C',
  // DET — Starters: Cunningham/Ausar/Robinson/Harris/Duren (60-22 season)
  'Cade Cunningham': 'PG', 'Daniss Jenkins': 'PG',
  'Ausar Thompson': 'SG', 'Caris LeVert': 'SG',
  'Duncan Robinson': 'SF', 'Tobias Harris': 'PF', 'Isaiah Stewart': 'PF',
  'Jalen Duren': 'C',
  // GSW — Starters: Curry/Podziemski/Butler/Green/Porzingis (Butler tore ACL)
  'Stephen Curry': 'PG', "De'Anthony Melton": 'PG',
  'Brandin Podziemski': 'SG', 'Moses Moody': 'SG',
  'Jimmy Butler III': 'SF', 'Draymond Green': 'PF',
  'Kristaps Porziņģis': 'C',
  // HOU — Starters: Thompson/Sheppard/Durant/Smith/Sengun
  'Amen Thompson': 'PG', 'Reed Sheppard': 'SG', 'Aaron Holiday': 'PG',
  'Kevin Durant': 'SF', 'Dorian Finney-Smith': 'SF',
  'Jabari Smith Jr.': 'PF', 'Tari Eason': 'PF',
  'Alperen Sengun': 'C', 'Steven Adams': 'C',
  'Josh Okogie': 'SG',
  // IND — Starters: Nembhard/Nesmith/Siakam/Walker/Huff (post-deadline, Zubac traded)
  'Andrew Nembhard': 'PG', 'Ben Sheppard': 'PG',
  'Aaron Nesmith': 'SG', 'Bennedict Mathurin': 'SG',
  'Pascal Siakam': 'SF', 'Jalen Slawson': 'SF',
  'Jarace Walker': 'PF', 'Kobe Brown': 'PF',
  'Ivica Zubac': 'C', 'Jay Huff': 'C',
  // LAC — Starters: Garland/Harden/Leonard/Collins/Zubac → post-deadline: Garland/Dunn/Leonard/Collins/Lopez
  'Darius Garland': 'PG', 'Kris Dunn': 'PG',
  'James Harden': 'SG', 'Jordan Miller': 'SG',
  'Kawhi Leonard': 'SF', 'Derrick Jones Jr.': 'SF',
  'John Collins': 'PF', 'Ivica Zubac': 'C', 'Brook Lopez': 'C',
  // LAL — Starters: Doncic/Reaves/Hachimura/LeBron/Ayton
  'Luka Dončić': 'PG', 'Marcus Smart': 'PG',
  'Austin Reaves': 'SG', 'Luke Kennard': 'SG',
  'Rui Hachimura': 'SF', 'Jake LaRavia': 'SF',
  'LeBron James': 'PF', 'Deandre Ayton': 'C',
  // MEM — Starters: Morant/Rupert/Wells/JJJ/Edey
  'Ja Morant': 'PG', 'Walter Clayton Jr.': 'PG', 'Cam Spencer': 'PG',
  'Rayan Rupert': 'SG', 'Cedric Coward': 'SG',
  'Jaylen Wells': 'SF', 'Taylor Hendricks': 'SF',
  'Jaren Jackson Jr.': 'PF', 'Santi Aldama': 'PF',
  'Zach Edey': 'C',
  // MIA — Starters: D.Mitchell/Herro/Powell/Wiggins/Adebayo
  'Davion Mitchell': 'PG', 'Kasparas Jakučionis': 'PG', 'Dru Smith': 'PG', 'Jahmir Young': 'PG', 'Trevor Keels': 'PG',
  'Tyler Herro': 'SG', 'Jaime Jaquez Jr.': 'SG', 'Pelle Larsson': 'SG',
  'Norman Powell': 'SF', 'Simone Fontecchio': 'SF', 'Myron Gardner': 'SF', 'Keshad Johnson': 'SF',
  'Andrew Wiggins': 'PF', 'Nikola Jović': 'PF',
  'Bam Adebayo': 'C', "Kel'el Ware": 'C', 'Vladislav Goldin': 'C',
  // MIL — Starters: Rollins/Green/Giannis/Kuzma/Turner (32-50, Giannis hurt)
  'Ryan Rollins': 'PG', 'Kevin Porter Jr.': 'SG', 'AJ Green': 'SG',
  'Giannis Antetokounmpo': 'SF', 'Ousmane Dieng': 'SF', 'Taurean Prince': 'SF',
  'Kyle Kuzma': 'PF', 'Bobby Portis': 'PF',
  'Myles Turner': 'C', 'Cormac Ryan': 'SG',
  // MIN — Starters: DiVincenzo or Conley/Edwards/McDaniels/Randle/Gobert
  'Donte DiVincenzo': 'PG', 'Mike Conley': 'PG', 'Bones Hyland': 'PG',
  'Anthony Edwards': 'SG', 'Ayo Dosunmu': 'SG',
  'Jaden McDaniels': 'SF', 'Kyle Anderson': 'SF',
  'Julius Randle': 'PF', 'Rudy Gobert': 'C', 'Naz Reid': 'C',
  // NOP — Starters: Murray/Bey/Murphy/Williamson/Jones or Queen
  'Dejounte Murray': 'PG', 'Jeremiah Fears': 'PG', 'Jose Alvarado': 'PG',
  'Saddiq Bey': 'SG', 'Jordan Poole': 'SG', 'Bryce McGowens': 'SG',
  'Trey Murphy III': 'SF', 'Herbert Jones': 'SF',
  'Zion Williamson': 'PF', 'Derik Queen': 'C',
  // NYK — Starters: Brunson/Bridges/OG/KAT/Hart (Champions)
  'Jalen Brunson': 'PG', 'Miles McBride': 'PG', 'Tyler Kolek': 'PG',
  'Mikal Bridges': 'SG', 'Landry Shamet': 'SG', 'Jordan Clarkson': 'SG',
  'OG Anunoby': 'SF', 'Josh Hart': 'SF', 'Mohamed Diawara': 'SF',
  'Karl-Anthony Towns': 'PF', 'Guerschon Yabusele': 'PF', 'Jeremy Sochan': 'PF',
  'Mitchell Robinson': 'C', 'Ariel Hukporti': 'C',
  // OKC — Starters: SGA/Dort/JWill/Chet/Hartenstein
  'Shai Gilgeous-Alexander': 'PG', 'Cason Wallace': 'PG', 'Ajay Mitchell': 'PG',
  'Luguentz Dort': 'SG', 'Isaiah Joe': 'SG',
  'Jalen Williams': 'SF', 'Chet Holmgren': 'PF',
  'Isaiah Hartenstein': 'C',
  // ORL — Starters: Suggs/Bane/Wagner/Banchero/WCJ
  'Jalen Suggs': 'PG', 'Anthony Black': 'PG', 'Tyus Jones': 'PG',
  'Desmond Bane': 'SG', 'Jevon Carter': 'SG',
  'Franz Wagner': 'SF', 'Tristan da Silva': 'SF',
  'Paolo Banchero': 'PF', 'Wendell Carter Jr.': 'C', 'Goga Bitadze': 'C',
  // PHI — Starters: Maxey/Edgecombe/George/Oubre/Embiid
  'Tyrese Maxey': 'PG', 'Jared McCain': 'PG',
  'VJ Edgecombe': 'SG', 'Quentin Grimes': 'SG',
  'Paul George': 'SF', 'Kelly Oubre Jr.': 'PF',
  'Joel Embiid': 'C', 'Andre Drummond': 'C',
  'Dominick Barlow': 'PF', 'Adem Bona': 'PF',
  // PHX — Starters: Booker/Green/Brooks/O'Neale/Williams
  'Devin Booker': 'PG', 'Collin Gillespie': 'PG', 'Jordan Goodwin': 'PG',
  'Jalen Green': 'SG', 'Grayson Allen': 'SG',
  'Dillon Brooks': 'SF', 'Ryan Dunn': 'SF',
  'Royce O\'Neale': 'PF', 'Oso Ighodaro': 'PF',
  'Mark Williams': 'C',
  // POR — Starters: Holiday/Sharpe/Avdija/Camara/Clingan
  'Jrue Holiday': 'PG', 'Scoot Henderson': 'PG', 'Caleb Love': 'PG',
  'Shaedon Sharpe': 'SG', 'Sidy Cissoko': 'SG',
  'Deni Avdija': 'SF', 'Jerami Grant': 'SF',
  'Toumani Camara': 'PF', 'Kris Murray': 'PF',
  'Donovan Clingan': 'C',
  // SAC — Starters: Westbrook or Schroder/LaVine/DeRozan/Murray/Sabonis
  'Dennis Schröder': 'PG', 'Russell Westbrook': 'PG',
  'Zach LaVine': 'SG', 'Nique Clifford': 'SG', 'Daeqwon Plowden': 'SG',
  'DeMar DeRozan': 'SF', 'Keegan Murray': 'PF', 'Precious Achiuwa': 'PF',
  'Domantas Sabonis': 'C', 'Maxime Raynaud': 'C',
  // SAS — Starters: Fox/Castle/Champagnie/Vassell/Wembanyama
  "De'Aaron Fox": 'PG', 'Dylan Harper': 'PG',
  'Stephon Castle': 'SG', 'Keldon Johnson': 'SG',
  'Julian Champagnie': 'SF', 'Harrison Barnes': 'SF',
  'Devin Vassell': 'PF', 'Victor Wembanyama': 'C', 'Luke Kornet': 'C',
  // TOR — Starters: Quickley/Barrett/Ingram/Barnes/Poeltl
  'Immanuel Quickley': 'PG', 'Jamal Shead': 'PG',
  'RJ Barrett': 'SG', "Ja'Kobe Walter": 'SG', 'Ochai Agbaji': 'SG',
  'Brandon Ingram': 'SF', 'Scottie Barnes': 'PF',
  'Collin Murray-Boyles': 'PF', 'Jakob Poeltl': 'C',
  'Sandro Mamukelashvili': 'C',
  // UTA — Starters: George/Mbeng/Markkanen/Bailey/Kessler
  'Keyonte George': 'PG', 'Isaiah Collier': 'PG',
  'Bez Mbeng': 'SG', 'John Konchar': 'SG',
  'Lauri Markkanen': 'SF', 'Cody Williams': 'SF',
  'Ace Bailey': 'PF', 'Brice Sensabaugh': 'PF',
  'Walker Kessler': 'C', 'Jusuf Nurkić': 'C',
  // WAS — Starters: Carrington/Johnson/Coulibaly/George/Sarr
  'Bub Carrington': 'PG', 'CJ McCollum': 'PG',
  'Tre Johnson': 'SG', 'Bilal Coulibaly': 'SF',
  'Kyshawn George': 'PF', 'Leaky Black': 'PF', 'Julian Reese': 'PF',
  'Alex Sarr': 'C', 'Will Riley': 'SF',
};

const POSITION_ORDER = ['PG', 'SG', 'SF', 'PF', 'C'];
const POSITION_LABELS = { PG: 'G', SG: 'G', SF: 'F', PF: 'F', C: 'C' };

function buildDepthChart(players) {
  const byPos = { PG: [], SG: [], SF: [], PF: [], C: [] };
  const placed = new Set();
  // First pass: place players with hardcoded positions
  for (const p of players) {
    const override = POSITION_MAP[p.player_name];
    if (override) {
      byPos[override].push(p);
      placed.add(p.player_id);
    }
  }
  // Second pass: fallback for unlisted players based on NBA position string
  for (const p of players) {
    if (placed.has(p.player_id)) continue;
    const pos = p.position?.toLowerCase() || '';
    let slot = 'SG';
    if (pos.includes('center')) slot = 'C';
    else if (pos.includes('forward') && !pos.includes('guard')) slot = 'PF';
    else if (pos.includes('guard') && !pos.includes('forward')) slot = 'SG';
    byPos[slot].push(p);
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
  const [jerseyFilter, setJerseyFilter] = useState('');

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

  // Derive the team's jersey per game log row
  const getTeamJersey = (row) => {
    return teamId === row.home_team ? row.home_jersey : row.away_jersey;
  };

  // Unique jerseys for filter dropdown
  const uniqueJerseys = useMemo(() => {
    const set = new Set();
    for (const row of gameLog) {
      const jersey = getTeamJersey(row);
      if (jersey) set.add(jersey);
    }
    return [...set].sort();
  }, [gameLog, teamId]);

  if (loading) return <p className="text-gray-500 p-6">Loading team...</p>;
  if (error) return <p className="text-red-500 p-6">Error: {error}</p>;

  // Filtered game log rows
  const filteredGameLog = jerseyFilter
    ? gameLog.filter((row) => getTeamJersey(row) === jerseyFilter)
    : gameLog;

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

  // 10 teams centered around current team
  const currentIdx = standings.findIndex((s) => s.team_id === teamId);
  const miniStart = Math.max(0, Math.min(currentIdx - 4, standings.length - 10));
  const miniEnd = Math.min(standings.length, miniStart + 10);
  const miniStandings = standings.slice(miniStart, miniEnd);

  // Enrich stats rows with derived fields
  const enrichedStats = stats.map((row) => ({
    ...row,
    win_pct: (row.wins + row.losses) > 0 ? row.wins / (row.wins + row.losses) : null,
    diff: row.ppg != null && row.opp_ppg != null ? row.ppg - row.opp_ppg : null,
  }));

  // Compute overall row from jersey stats
  const overallRow = (() => {
    if (enrichedStats.length === 0) return null;
    const totalGP = enrichedStats.reduce((s, r) => s + r.games_played, 0);
    if (totalGP === 0) return null;
    const totalW = enrichedStats.reduce((s, r) => s + (r.wins || 0), 0);
    const totalL = enrichedStats.reduce((s, r) => s + (r.losses || 0), 0);
    const wavg = (key) => enrichedStats.reduce((s, r) => s + (r[key] || 0) * r.games_played, 0) / totalGP;
    const ppg = wavg('ppg');
    const opp_ppg = wavg('opp_ppg');
    return {
      edition_name: 'Overall',
      color_tags: 'Overall',
      games_played: totalGP,
      wins: totalW,
      losses: totalL,
      win_pct: (totalW + totalL) > 0 ? totalW / (totalW + totalL) : null,
      ppg,
      opp_ppg,
      rpg: wavg('rpg'),
      apg: wavg('apg'),
      diff: ppg - opp_ppg,
    };
  })();

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
            <div className="flex items-center gap-3 mt-1 text-sm text-white/70">
              <span className="text-white text-lg font-semibold">{wins}-{losses}</span>
              {teamRank > 0 && (
                <>
                  <span className="text-white/40">|</span>
                  <span>
                    {teamRank}{teamRank === 1 ? 'st' : teamRank === 2 ? 'nd' : teamRank === 3 ? 'rd' : 'th'} {confLabel}
                  </span>
                </>
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

      {/* === DEPTH CHART + STANDINGS === */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Depth Chart (8 cols) */}
          <div className="col-span-8 flex flex-col">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Depth Chart</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase">
                  <tr>
                    <th className="w-10 px-2 py-2 text-left font-medium">Pos</th>
                    <th className="px-3 py-2 text-center font-medium">Starter</th>
                    <th className="px-3 py-2 text-center font-medium">2nd</th>
                    <th className="px-3 py-2 text-center font-medium">3rd</th>
                    <th className="px-3 py-2 text-center font-medium">4th</th>
                    <th className="px-3 py-2 text-center font-medium">5th</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {POSITION_ORDER.map((pos) => {
                    const players = depthByPos[pos] || [];
                    const top5 = players.slice(0, 5);
                    return (
                      <tr key={pos}>
                        <td className="w-10 px-2 py-2 font-semibold text-gray-700">{POSITION_LABELS[pos]}</td>
                        {[0, 1, 2, 3, 4].map((idx) => {
                          const p = top5[idx];
                          if (!p) return <td key={idx} className="px-3 py-2 text-center text-gray-300">—</td>;
                          const parts = p.player_name.split(' ');
                          const suffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV'];
                          const lastPart = parts[parts.length - 1];
                          const lastName = suffixes.includes(lastPart) && parts.length > 2
                            ? `${parts[parts.length - 2]} ${lastPart}`
                            : lastPart;
                          return (
                            <td key={idx} className="px-3 py-2 text-center">
                              <Link to={`/players/${p.player_id}`} className="flex flex-col items-center gap-0.5 hover:opacity-80">
                                <img
                                  src={headshotUrl(p.player_id)}
                                  alt={p.player_name}
                                  className="w-8 h-8 rounded-full object-cover bg-gray-100"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <span className="text-[10px] text-gray-700 leading-tight truncate max-w-[80px]">{lastName}</span>
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

          {/* Mini Standings (4 cols) */}
          <div className="col-span-4 flex flex-col">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{confLabel} Standings</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1">
              {miniStandings.length === 0 ? (
                <p className="text-gray-400 text-sm p-4">No standings data.</p>
              ) : (
                <table className="w-full h-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">#</th>
                      <th className="px-2 py-2 text-left font-medium">Team</th>
                      <th className="px-2 py-2 text-center font-medium">W</th>
                      <th className="px-2 py-2 text-center font-medium">L</th>
                      <th className="px-2 py-2 text-center font-medium">PCT</th>
                      <th className="px-2 py-2 text-center font-medium">STRK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {miniStandings.map((s) => {
                      const rank = standings.indexOf(s) + 1;
                      const pct = (s.wins + s.losses) > 0 ? (s.wins / (s.wins + s.losses)).toFixed(3) : '.000';
                      const isCurrent = s.team_id === teamId;
                      const form = s.form || '';
                      return (
                        <tr
                          key={s.team_id}
                          className={isCurrent ? '' : 'hover:bg-gray-50'}
                          style={isCurrent ? { backgroundColor: colors.primary + '15' } : undefined}
                        >
                          <td className="px-2 py-1.5 text-gray-500">{rank}</td>
                          <td className="px-2 py-1.5">
                            <Link to={`/teams/${s.team_id}`} className="flex items-center gap-1 hover:opacity-80">
                              <img src={teamLogoUrl(s.team_id)} alt={s.team_id} className="w-4 h-4 object-contain" />
                              <span className={`truncate ${isCurrent ? 'font-semibold' : ''}`}>
                                {TEAM_NICKNAMES[s.team_id] || s.team_name}
                              </span>
                            </Link>
                          </td>
                          <td className="px-2 py-1.5 text-center">{s.wins}</td>
                          <td className="px-2 py-1.5 text-center">{s.losses}</td>
                          <td className="px-2 py-1.5 text-center">{pct}</td>
                          <td className="px-2 py-1.5">
                            <span className="flex items-center justify-center gap-0.5">
                              {form.split('').map((ch, i) => (
                                <span
                                  key={i}
                                  className={`inline-flex items-center justify-center w-4 h-4 rounded-sm text-[9px] font-bold text-white ${ch === 'W' ? 'bg-green-600' : 'bg-red-500'}`}
                                >{ch}</span>
                              ))}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
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
                    {enrichedStats.map((row, i) => (
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
                  {overallRow && (
                    <tfoot className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                      <tr>
                        {jerseyStatCols.map((col) => {
                          const val = overallRow[col.key];
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
            )}
          </>
        )}

        {activeTab === 'gamelog' && (
          <>
            {gameLog.length > 0 ? (
              <>
                <div className="mb-4">
                  <select
                    value={jerseyFilter}
                    onChange={(e) => setJerseyFilter(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    <option value="">All Jerseys</option>
                    {uniqueJerseys.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
                <StatsTable columns={gameLogColumns} rows={filteredGameLog} />
              </>
            ) : (
              <p className="text-gray-500">No game log data available.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
