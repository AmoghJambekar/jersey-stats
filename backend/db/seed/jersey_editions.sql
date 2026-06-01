-- Seed jersey editions for all 30 NBA teams, 2025-26 season.
-- Each team has up to 5 editions: Icon, Association, Statement, City, Classic.
-- Color tags are the dominant 2-3 colors visible on the jersey.
-- ON CONFLICT skips duplicates so this is safe to re-run.

-- ATL Hawks
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('ATL', 'Icon', '{"red","white","gold"}', '2025-26'),
  ('ATL', 'Association', '{"white","red","gold"}', '2025-26'),
  ('ATL', 'Statement', '{"black","red","gold"}', '2025-26'),
  ('ATL', 'City', '{"black","peach"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- BOS Celtics
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('BOS', 'Icon', '{"green","white"}', '2025-26'),
  ('BOS', 'Association', '{"white","green"}', '2025-26'),
  ('BOS', 'Statement', '{"black","green"}', '2025-26'),
  ('BOS', 'City', '{"white","gold","black"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- BKN Nets
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('BKN', 'Icon', '{"black","white"}', '2025-26'),
  ('BKN', 'Association', '{"white","black"}', '2025-26'),
  ('BKN', 'Statement', '{"gray","black","white"}', '2025-26'),
  ('BKN', 'City', '{"black","multicolor"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- CHA Hornets
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('CHA', 'Icon', '{"teal","purple","white"}', '2025-26'),
  ('CHA', 'Association', '{"white","teal","purple"}', '2025-26'),
  ('CHA', 'Statement', '{"purple","teal"}', '2025-26'),
  ('CHA', 'City', '{"orange","blue","yellow"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- CHI Bulls
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('CHI', 'Icon', '{"red","black","white"}', '2025-26'),
  ('CHI', 'Association', '{"white","red","black"}', '2025-26'),
  ('CHI', 'Statement', '{"black","red"}', '2025-26'),
  ('CHI', 'City', '{"black","red","blue"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- CLE Cavaliers
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('CLE', 'Icon', '{"wine","gold"}', '2025-26'),
  ('CLE', 'Association', '{"white","wine","gold"}', '2025-26'),
  ('CLE', 'Statement', '{"black","wine","gold"}', '2025-26'),
  ('CLE', 'City', '{"orange","blue","tan"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- DAL Mavericks
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('DAL', 'Icon', '{"blue","white","silver"}', '2025-26'),
  ('DAL', 'Association', '{"white","blue","silver"}', '2025-26'),
  ('DAL', 'Statement', '{"navy","green"}', '2025-26'),
  ('DAL', 'City', '{"green","blue","silver"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- DEN Nuggets
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('DEN', 'Icon', '{"navy","gold","red"}', '2025-26'),
  ('DEN', 'Association', '{"white","navy","gold"}', '2025-26'),
  ('DEN', 'Statement', '{"red","navy","gold"}', '2025-26'),
  ('DEN', 'City', '{"navy","gold","red"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- DET Pistons
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('DET', 'Icon', '{"blue","red","white"}', '2025-26'),
  ('DET', 'Association', '{"white","blue","red"}', '2025-26'),
  ('DET', 'Statement', '{"red","blue"}', '2025-26'),
  ('DET', 'City', '{"black","teal","maroon"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- GSW Warriors
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('GSW', 'Icon', '{"blue","gold","white"}', '2025-26'),
  ('GSW', 'Association', '{"white","blue","gold"}', '2025-26'),
  ('GSW', 'Statement', '{"navy","gold"}', '2025-26'),
  ('GSW', 'City', '{"brown","cream","gold"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- HOU Rockets
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('HOU', 'Icon', '{"red","white"}', '2025-26'),
  ('HOU', 'Association', '{"white","red"}', '2025-26'),
  ('HOU', 'Statement', '{"black","red"}', '2025-26'),
  ('HOU', 'City', '{"red","white","blue"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- IND Pacers
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('IND', 'Icon', '{"navy","gold","white"}', '2025-26'),
  ('IND', 'Association', '{"white","navy","gold"}', '2025-26'),
  ('IND', 'Statement', '{"gold","navy"}', '2025-26'),
  ('IND', 'City', '{"navy","gold","red"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- LAC Clippers
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('LAC', 'Icon', '{"blue","red","white"}', '2025-26'),
  ('LAC', 'Association', '{"white","blue","red"}', '2025-26'),
  ('LAC', 'Statement', '{"black","blue","red"}', '2025-26'),
  ('LAC', 'City', '{"blue","red","orange"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- LAL Lakers
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('LAL', 'Icon', '{"purple","gold"}', '2025-26'),
  ('LAL', 'Association', '{"white","purple","gold"}', '2025-26'),
  ('LAL', 'Statement', '{"black","purple","gold"}', '2025-26'),
  ('LAL', 'City', '{"black","purple","gold"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- MEM Grizzlies
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('MEM', 'Icon', '{"navy","blue","gold"}', '2025-26'),
  ('MEM', 'Association', '{"white","navy","blue"}', '2025-26'),
  ('MEM', 'Statement', '{"blue","navy","gold"}', '2025-26'),
  ('MEM', 'Classic', '{"red","navy","gold"}', '2025-26'),
  ('MEM', 'City', '{"platinum","silver"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- MIA Heat
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('MIA', 'Icon', '{"black","red","white"}', '2025-26'),
  ('MIA', 'Association', '{"white","black","red"}', '2025-26'),
  ('MIA', 'Statement', '{"red","black"}', '2025-26'),
  ('MIA', 'City', '{"black","pink","blue"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- MIL Bucks
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('MIL', 'Icon', '{"green","cream"}', '2025-26'),
  ('MIL', 'Association', '{"white","green","cream"}', '2025-26'),
  ('MIL', 'Statement', '{"black","green"}', '2025-26'),
  ('MIL', 'City', '{"cream","green"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- MIN Timberwolves
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('MIN', 'Icon', '{"navy","green","white"}', '2025-26'),
  ('MIN', 'Association', '{"white","navy","green"}', '2025-26'),
  ('MIN', 'Statement', '{"black","green","navy"}', '2025-26'),
  ('MIN', 'City', '{"purple"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- NOP Pelicans
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('NOP', 'Icon', '{"navy","red","gold"}', '2025-26'),
  ('NOP', 'Association', '{"white","navy","red"}', '2025-26'),
  ('NOP', 'Statement', '{"red","navy","gold"}', '2025-26'),
  ('NOP', 'City', '{"purple","green","gold"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- NYK Knicks
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('NYK', 'Icon', '{"blue","orange","white"}', '2025-26'),
  ('NYK', 'Association', '{"white","blue","orange"}', '2025-26'),
  ('NYK', 'Statement', '{"black","blue","orange"}', '2025-26'),
  ('NYK', 'City', '{"cream","orange","blue"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- OKC Thunder
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('OKC', 'Icon', '{"blue","orange","white"}', '2025-26'),
  ('OKC', 'Association', '{"white","blue","orange"}', '2025-26'),
  ('OKC', 'Statement', '{"navy","orange"}', '2025-26'),
  ('OKC', 'City', '{"blue","orange","yellow"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- ORL Magic
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('ORL', 'Icon', '{"black","blue","white"}', '2025-26'),
  ('ORL', 'Association', '{"white","blue","black"}', '2025-26'),
  ('ORL', 'Statement', '{"blue","black"}', '2025-26'),
  ('ORL', 'City', '{"white","blue"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- PHI 76ers
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('PHI', 'Icon', '{"blue","red","white"}', '2025-26'),
  ('PHI', 'Association', '{"white","blue","red"}', '2025-26'),
  ('PHI', 'Statement', '{"navy","red"}', '2025-26'),
  ('PHI', 'City', '{"cream","blue","red"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- PHX Suns
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('PHX', 'Icon', '{"purple","orange","white"}', '2025-26'),
  ('PHX', 'Association', '{"white","purple","orange"}', '2025-26'),
  ('PHX', 'Statement', '{"black","orange","purple"}', '2025-26'),
  ('PHX', 'City', '{"black","orange","purple"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- POR Trail Blazers
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('POR', 'Icon', '{"red","black","white"}', '2025-26'),
  ('POR', 'Association', '{"white","red","black"}', '2025-26'),
  ('POR', 'Statement', '{"black","red"}', '2025-26'),
  ('POR', 'City', '{"red","black","white"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- SAC Kings
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('SAC', 'Icon', '{"purple","silver","black"}', '2025-26'),
  ('SAC', 'Association', '{"white","purple","silver"}', '2025-26'),
  ('SAC', 'Statement', '{"black","purple","silver"}', '2025-26'),
  ('SAC', 'City', '{"purple","violet"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- SAS Spurs
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('SAS', 'Icon', '{"black","silver","white"}', '2025-26'),
  ('SAS', 'Association', '{"white","black","silver"}', '2025-26'),
  ('SAS', 'Statement', '{"gray","black","silver"}', '2025-26'),
  ('SAS', 'City', '{"black","teal","pink","orange"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- TOR Raptors
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('TOR', 'Icon', '{"red","black","white"}', '2025-26'),
  ('TOR', 'Association', '{"white","red","black"}', '2025-26'),
  ('TOR', 'Statement', '{"black","red","gold"}', '2025-26'),
  ('TOR', 'City', '{"black","silver","white"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- UTA Jazz
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('UTA', 'Icon', '{"navy","gold","white"}', '2025-26'),
  ('UTA', 'Association', '{"white","navy","gold"}', '2025-26'),
  ('UTA', 'Statement', '{"black","gold"}', '2025-26'),
  ('UTA', 'City', '{"black","gray","blue"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;

-- WAS Wizards
INSERT INTO jersey_editions (team_id, edition_name, color_tags, season) VALUES
  ('WAS', 'Icon', '{"navy","red","white"}', '2025-26'),
  ('WAS', 'Association', '{"white","navy","red"}', '2025-26'),
  ('WAS', 'Statement', '{"red","navy"}', '2025-26'),
  ('WAS', 'City', '{"navy","red","white"}', '2025-26')
ON CONFLICT (team_id, edition_name, season) DO NOTHING;
