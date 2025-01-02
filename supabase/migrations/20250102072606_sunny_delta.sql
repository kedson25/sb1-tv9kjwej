/*
  # Initial Schema Setup

  1. New Tables
    - users
      - id (uuid, primary key)
      - full_name (text)
      - email (text)
      - cpf (text)
      - pix_key (text)
      - created_at (timestamp)
    
    - teams
      - id (uuid, primary key)
      - name (text)
      - leader_id (uuid, references users)
      - created_at (timestamp)
    
    - team_members
      - team_id (uuid, references teams)
      - user_id (uuid, references users)
      - joined_at (timestamp)
    
    - messages
      - id (uuid, primary key)
      - team_id (uuid, references teams)
      - user_id (uuid, references users)
      - content (text)
      - created_at (timestamp)
    
    - work_orders
      - id (uuid, primary key)
      - team_id (uuid, references teams)
      - title (text)
      - description (text)
      - created_by (uuid, references users)
      - created_at (timestamp)
      - status (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Users table
CREATE TABLE users (
  id uuid REFERENCES auth.users PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  cpf text UNIQUE,
  pix_key text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Teams table
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  leader_id uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
    OR leader_id = auth.uid()
  );

-- Team members table
CREATE TABLE team_members (
  team_id uuid REFERENCES teams ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team membership"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND (
        teams.leader_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = team_members.team_id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams ON DELETE CASCADE,
  user_id uuid REFERENCES users NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = messages.team_id
      AND team_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = messages.team_id
      AND teams.leader_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = messages.team_id
        AND team_members.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = messages.team_id
        AND teams.leader_id = auth.uid()
      )
    )
  );

-- Work orders table
CREATE TABLE work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES users NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read work orders"
  ON work_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = work_orders.team_id
      AND team_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = work_orders.team_id
      AND teams.leader_id = auth.uid()
    )
  );

CREATE POLICY "Only team leaders can create work orders"
  ON work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = work_orders.team_id
      AND teams.leader_id = auth.uid()
    )
    AND auth.uid() = created_by
  );