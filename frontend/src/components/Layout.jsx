import { Link, Outlet, useLocation } from 'react-router-dom';
import SearchBar from './SearchBar';

export default function Layout() {
  const isHome = useLocation().pathname === '/';

  return (
    <div className="min-h-screen bg-gray-50">
      {!isHome && (
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link to="/" className="text-xl font-bold text-gray-900 shrink-0">
              JerseyStats
            </Link>
            <div className="w-64">
              <SearchBar compact />
            </div>
          </div>
        </nav>
      )}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
