import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchPlayers } from '../api';

export default function SearchBar({ compact = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

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
    setActiveIndex(-1);
  }, [results]);

  function handleKeyDown(e) {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const player = results[activeIndex];
      setIsOpen(false);
      setQuery('');
      navigate(`/players/${player.player_id}`, {
        state: { playerName: player.player_name, teamId: player.team_id },
      });
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

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
    <div ref={wrapperRef} className={`relative w-full ${compact ? '' : 'max-w-lg'}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search players..."
        className={`w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-3 text-lg shadow-sm'}`}
      />
      {isOpen && results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((player, index) => (
            <li key={player.player_id}>
              <Link
                to={`/players/${player.player_id}`}
                state={{ playerName: player.player_name, teamId: player.team_id }}
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                }}
                className={`block px-4 py-2 ${index === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
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
