import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import TeamPage from './pages/TeamPage';
import PlayerPage from './pages/PlayerPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/teams/:teamId" element={<TeamPage />} />
          <Route path="/players/:playerId" element={<PlayerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
