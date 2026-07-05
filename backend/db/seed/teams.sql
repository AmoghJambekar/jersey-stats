-- Seed all 30 NBA teams for the 2025-26 season.
-- Team IDs match standard NBA abbreviations used in the CSV data.

INSERT INTO teams (id, name, city, nba_id, conference, division) VALUES
  ('ATL', 'Atlanta Hawks', 'Atlanta', 1610612737, 'East', 'Southeast'),
  ('BOS', 'Boston Celtics', 'Boston', 1610612738, 'East', 'Atlantic'),
  ('BKN', 'Brooklyn Nets', 'Brooklyn', 1610612751, 'East', 'Atlantic'),
  ('CHA', 'Charlotte Hornets', 'Charlotte', 1610612766, 'East', 'Southeast'),
  ('CHI', 'Chicago Bulls', 'Chicago', 1610612741, 'East', 'Central'),
  ('CLE', 'Cleveland Cavaliers', 'Cleveland', 1610612739, 'East', 'Central'),
  ('DAL', 'Dallas Mavericks', 'Dallas', 1610612742, 'West', 'Southwest'),
  ('DEN', 'Denver Nuggets', 'Denver', 1610612743, 'West', 'Northwest'),
  ('DET', 'Detroit Pistons', 'Detroit', 1610612765, 'East', 'Central'),
  ('GSW', 'Golden State Warriors', 'Golden State', 1610612744, 'West', 'Pacific'),
  ('HOU', 'Houston Rockets', 'Houston', 1610612745, 'West', 'Southwest'),
  ('IND', 'Indiana Pacers', 'Indiana', 1610612754, 'East', 'Central'),
  ('LAC', 'Los Angeles Clippers', 'Los Angeles', 1610612746, 'West', 'Pacific'),
  ('LAL', 'Los Angeles Lakers', 'Los Angeles', 1610612747, 'West', 'Pacific'),
  ('MEM', 'Memphis Grizzlies', 'Memphis', 1610612763, 'West', 'Southwest'),
  ('MIA', 'Miami Heat', 'Miami', 1610612748, 'East', 'Southeast'),
  ('MIL', 'Milwaukee Bucks', 'Milwaukee', 1610612749, 'East', 'Central'),
  ('MIN', 'Minnesota Timberwolves', 'Minnesota', 1610612750, 'West', 'Northwest'),
  ('NOP', 'New Orleans Pelicans', 'New Orleans', 1610612740, 'West', 'Southwest'),
  ('NYK', 'New York Knicks', 'New York', 1610612752, 'East', 'Atlantic'),
  ('OKC', 'Oklahoma City Thunder', 'Oklahoma City', 1610612760, 'West', 'Northwest'),
  ('ORL', 'Orlando Magic', 'Orlando', 1610612753, 'East', 'Southeast'),
  ('PHI', 'Philadelphia 76ers', 'Philadelphia', 1610612755, 'East', 'Atlantic'),
  ('PHX', 'Phoenix Suns', 'Phoenix', 1610612756, 'West', 'Pacific'),
  ('POR', 'Portland Trail Blazers', 'Portland', 1610612757, 'West', 'Northwest'),
  ('SAC', 'Sacramento Kings', 'Sacramento', 1610612758, 'West', 'Pacific'),
  ('SAS', 'San Antonio Spurs', 'San Antonio', 1610612759, 'West', 'Southwest'),
  ('TOR', 'Toronto Raptors', 'Toronto', 1610612761, 'East', 'Atlantic'),
  ('UTA', 'Utah Jazz', 'Utah', 1610612762, 'West', 'Northwest'),
  ('WAS', 'Washington Wizards', 'Washington', 1610612764, 'East', 'Southeast')
ON CONFLICT (id) DO UPDATE SET
  nba_id     = EXCLUDED.nba_id,
  conference = EXCLUDED.conference,
  division   = EXCLUDED.division;
