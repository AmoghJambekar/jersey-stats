import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { searchPlayers } from '../api';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeout = setTimeout(() => {
      searchPlayers(query)
        .then((data) => {
          setResults(data);
          setIsOpen(true);
        })
        .catch(() => setResults([]));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-lg">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search players..."
        className="w-full px-5 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      />
      {isOpen && results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((player) => (
            <li key={player.player_id}>
              <Link
                to={`/players/${player.player_id}`}
                state={{ playerName: player.player_name, teamId: player.team_id }}
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                }}
                className="block px-4 py-2 hover:bg-gray-100"
              >
                <span className="font-medium text-gray-900">{player.player_name}</span>
                <span className="ml-2 text-sm text-gray-500">{player.team_id}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
