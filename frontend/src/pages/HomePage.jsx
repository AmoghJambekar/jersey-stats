import { useState, useEffect } from 'react';
import { fetchTeams } from '../api';
import TeamCard from '../components/TeamCard';
import SearchBar from '../components/SearchBar';

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

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center justify-end gap-4 w-full pb-8 min-h-[40vh]">
        <h1 className="text-4xl font-bold text-gray-900">Jersey Stats</h1>
        <p className="text-gray-500">Search for a player or select a team below</p>
        <SearchBar />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 w-full">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}
