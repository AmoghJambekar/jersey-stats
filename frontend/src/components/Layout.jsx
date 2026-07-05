import { Link, Outlet, useLocation } from 'react-router-dom';
import SearchBar from './SearchBar';

export default function Layout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const isPlayer = pathname.startsWith('/players/');
  const isTeam = pathname.startsWith('/teams/');
  const isFullWidth = isHome || isPlayer || isTeam;

  return (
    <div className="min-h-screen bg-gray-50">
      {!isHome && (
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link to="/" className="text-xl font-extrabold text-gray-900 shrink-0 tracking-tight">
              Jersey<span className="text-blue-600">Stats</span>
            </Link>
            <div className="w-64">
              <SearchBar compact />
            </div>
          </div>
        </nav>
      )}
      {isFullWidth ? (
        <main>
          <Outlet />
        </main>
      ) : (
        <main className={`mx-auto px-4 py-6 ${isHome ? 'max-w-[84rem]' : 'max-w-6xl'}`}>
          <Outlet />
        </main>
      )}
    </div>
  );
}
