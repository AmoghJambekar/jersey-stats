import { Link } from 'react-router-dom';

export default function TeamCard({ team }) {
  return (
    <Link
      to={`/teams/${team.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="text-2xl font-bold text-gray-900">{team.id}</div>
      <div className="text-sm text-gray-500 mt-1">{team.name}</div>
    </Link>
  );
}
