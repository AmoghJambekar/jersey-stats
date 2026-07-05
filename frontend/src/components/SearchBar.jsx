import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchTeams, searchPlayers } from '../api';

function logoUrl(nbaId) {
  return `https://cdn.nba.com/logos/nba/${nbaId}/primary/L/logo.svg`;
}

let teamsCache = null;

export default function SearchBar({ compact = false }) {
  const [query, setQuery] = useState('');
  const [teamResults, setTeamResults] = useState([]);
  const [playerResults, setPlayerResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  // Load teams once for client-side filtering
  useEffect(() => {
    if (!teamsCache) {
      fetchTeams().then((data) => { teamsCache = data; }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setTeamResults([]);
      setPlayerResults([]);
      setIsOpen(false);
      return;
    }

    // Filter teams client-side (only 30)
    const q = query.toLowerCase();
    const matchedTeams = (teamsCache || []).filter(
      (t) => t.name.toLowerCase().includes(q) || t.city.toLowerCase().includes(q)
    );
    setTeamResults(matchedTeams);

    const timeout = setTimeout(() => {
      searchPlayers(query)
        .then((data) => {
          setPlayerResults(data);
          setIsOpen(true);
        })
        .catch(() => setPlayerResults([]));
    }, 300);

    // Show teams immediately even while players load
    if (matchedTeams.length > 0) setIsOpen(true);

    return () => clearTimeout(timeout);
  }, [query]);

  const allItems = [
    ...teamResults.map((t) => ({ type: 'team', ...t })),
    ...playerResults.map((p) => ({ type: 'player', ...p })),
  ];

  useEffect(() => {
    setActiveIndex(-1);
  }, [teamResults, playerResults]);

  function handleKeyDown(e) {
    if (!isOpen || allItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const item = allItems[activeIndex];
      setIsOpen(false);
      setQuery('');
      if (item.type === 'team') {
        navigate(`/teams/${item.id}`);
      } else {
        navigate(`/players/${item.player_id}`, {
          state: { playerName: item.player_name, teamId: item.team_id },
        });
      }
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

  let flatIndex = -1;

  return (
    <div ref={wrapperRef} className={`relative w-full ${compact ? '' : 'max-w-lg'}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search players or teams..."
        className={`w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-3 text-lg shadow-sm'}`}
      />
      {isOpen && allItems.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {teamResults.length > 0 && (
            <>
              {teamResults.map((team) => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <li key={`team-${team.id}`}>
                    <Link
                      to={`/teams/${team.id}`}
                      onClick={() => { setIsOpen(false); setQuery(''); }}
                      className={`flex items-center gap-3 px-4 py-2 ${idx === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                    >
                      <img src={logoUrl(team.nba_id)} alt={team.name} className="w-6 h-6 object-contain shrink-0" />
                      <span className="font-medium text-gray-900">{team.name}</span>
                    </Link>
                  </li>
                );
              })}
              {playerResults.length > 0 && (
                <li className="border-t border-gray-200 mx-3 my-1" aria-hidden="true" />
              )}
            </>
          )}
          {playerResults.map((player) => {
            flatIndex++;
            const idx = flatIndex;
            return (
              <li key={`player-${player.player_id}`}>
                <Link
                  to={`/players/${player.player_id}`}
                  state={{ playerName: player.player_name, teamId: player.team_id }}
                  onClick={() => { setIsOpen(false); setQuery(''); }}
                  className={`block px-4 py-2 ${idx === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                >
                  <span className="font-medium text-gray-900">{player.player_name}</span>
                  <span className="ml-2 text-sm text-gray-500">{player.team_id}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
