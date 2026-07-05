import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTeams } from '../api';
import SearchBar from '../components/SearchBar';

const DIVISION_ORDER = [
  'Atlantic', 'Central', 'Southeast',
  'Northwest', 'Pacific', 'Southwest',
];

function logoUrl(nbaId) {
  return `https://cdn.nba.com/logos/nba/${nbaId}/primary/L/logo.svg`;
}

export default function HomePage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchTeams()
      .then((data) => { if (!cancelled) setTeams(data); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="text-gray-500">Loading teams...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  const byDivision = {};
  for (const t of teams) {
    (byDivision[t.division] ??= []).push(t);
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center justify-end gap-4 w-full pb-8 min-h-[40vh]">
        <h1 className="text-4xl font-bold text-gray-900">Jersey Stats</h1>
        <p className="text-gray-500">Search for a player or select a team below</p>
        <SearchBar />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-6 w-full">
        {DIVISION_ORDER.map((div) => (
          <div key={div}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {div} Division
            </h3>
            <ul className="space-y-2">
              {(byDivision[div] || []).map((team) => (
                <li key={team.id}>
                  <Link
                    to={`/teams/${team.id}`}
                    className="flex items-center gap-3 hover:bg-gray-100 rounded-md px-2 py-1.5 -mx-2 transition-colors"
                  >
                    <img
                      src={logoUrl(team.nba_id)}
                      alt={team.name}
                      className="w-10 h-10 object-contain shrink-0"
                    />
                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{team.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
