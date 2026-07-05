const BASE = '/api/v1';

export async function fetchTeams() {
  const res = await fetch(`${BASE}/teams`);
  if (!res.ok) throw new Error(`Failed to fetch teams: ${res.status}`);
  return res.json();
}

export async function fetchTeam(teamId) {
  const res = await fetch(`${BASE}/teams/${teamId}`);
  if (!res.ok) throw new Error(`Failed to fetch team: ${res.status}`);
  return res.json();
}

export async function fetchTeamJerseyStats(teamId) {
  const res = await fetch(`${BASE}/teams/${teamId}/jersey-stats`);
  if (!res.ok) throw new Error(`Failed to fetch team jersey stats: ${res.status}`);
  return res.json();
}

export async function fetchTeamRoster(teamId) {
  const res = await fetch(`${BASE}/teams/${teamId}/roster`);
  if (!res.ok) throw new Error(`Failed to fetch team roster: ${res.status}`);
  return res.json();
}

export async function fetchPlayerTeams(playerId) {
  const res = await fetch(`${BASE}/players/${playerId}/teams`);
  if (!res.ok) throw new Error(`Failed to fetch player teams: ${res.status}`);
  return res.json();
}

export async function fetchPlayerBio(playerId) {
  const res = await fetch(`${BASE}/players/${playerId}/bio`);
  if (!res.ok) throw new Error(`Failed to fetch player bio: ${res.status}`);
  return res.json();
}

export async function fetchPlayerJerseyStats(playerId) {
  const res = await fetch(`${BASE}/players/${playerId}/jersey-stats`);
  if (!res.ok) throw new Error(`Failed to fetch player jersey stats: ${res.status}`);
  return res.json();
}

export async function searchPlayers(query) {
  const res = await fetch(`${BASE}/players/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function fetchTeamGameLog(teamId) {
  const res = await fetch(`${BASE}/teams/${teamId}/game-log`);
  if (!res.ok) throw new Error(`Failed to fetch team game log: ${res.status}`);
  return res.json();
}

export async function fetchPlayerGameLog(playerId) {
  const res = await fetch(`${BASE}/players/${playerId}/game-log`);
  if (!res.ok) throw new Error(`Failed to fetch player game log: ${res.status}`);
  return res.json();
}
