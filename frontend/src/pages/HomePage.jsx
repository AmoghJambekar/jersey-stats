import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTeams } from '../api';
import SearchBar from '../components/SearchBar';
import { teamLogoUrl } from '../data/teamData';

const EAST_DIVISIONS = ['Atlantic', 'Central', 'Southeast'];
const WEST_DIVISIONS = ['Northwest', 'Pacific', 'Southwest'];

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

  if (loading) return <p className="text-gray-500 p-6">Loading teams...</p>;
  if (error) return <p className="text-red-500 p-6">Error: {error}</p>;

  const byDivision = {};
  for (const t of teams) {
    (byDivision[t.division] ??= []).push(t);
  }

  const renderConference = (label, divisions) => (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {divisions.map((div, i) => (
          <div key={div}>
            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
              {i === 0 ? `${label}ern \u00B7 ` : ''}{div}
            </h3>
            <div className="space-y-0.5">
              {(byDivision[div] || []).map((team) => (
                <Link
                  key={team.id}
                  to={`/teams/${team.id}`}
                  className="flex items-center gap-3 hover:bg-gray-100 rounded-md px-2 py-1.5 -mx-1 transition-colors"
                >
                  <img
                    src={teamLogoUrl(team.id)}
                    alt={team.name}
                    className="w-9 h-9 object-contain shrink-0"
                  />
                  <span className="text-sm font-medium text-gray-900">{team.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {/* Hero */}
      <div className="flex flex-col items-center justify-end gap-4 w-full pb-10 pt-16">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
          Jersey<span className="text-blue-600">Stats</span>
        </h1>
        <div className="w-full max-w-lg mt-4">
          <SearchBar />
        </div>
      </div>

      {/* Teams */}
      <div className="max-w-5xl mx-auto px-4 pb-12 space-y-8">
        {renderConference('East', EAST_DIVISIONS)}
        {renderConference('West', WEST_DIVISIONS)}
      </div>
    </div>
  );
}
