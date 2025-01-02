import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Team, User } from '../types/database';
import TeamChat from '../components/TeamChat';
import WorkOrders from '../components/WorkOrders';
import { Users, LogOut, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    checkUser();
    loadTeams();
  }, []);

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate('/');
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (userData) {
      setUser(userData);
    }
  };

  const loadTeams = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    // Get teams where user is a member
    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', authUser.id);

    // Get teams where user is a leader
    const { data: leaderTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('leader_id', authUser.id);

    // Get full team details for member teams
    const memberTeamIds = memberTeams?.map(tm => tm.team_id) || [];
    const { data: memberTeamDetails } = await supabase
      .from('teams')
      .select('*')
      .in('id', memberTeamIds);

    const allTeams = [
      ...(leaderTeams || []),
      ...(memberTeamDetails || [])
    ];

    // Remove duplicates
    const uniqueTeams = Array.from(new Map(allTeams.map(team => [team.id, team])).values());
    setTeams(uniqueTeams);

    if (uniqueTeams.length > 0 && !selectedTeam) {
      setSelectedTe <boltAction type="file" filePath="src/pages/Home.tsx">      setSelectedTeam(uniqueTeams[0]);
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert([
        {
          name: newTeamName,
          leader_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      toast.error('Error creating team');
      return;
    }

    setTeams([...teams, newTeam]);
    setSelectedTeam(newTeam);
    setShowNewTeamForm(false);
    setNewTeamName('');
    toast.success('Team created successfully');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r">
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Teams</h2>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>

            {/* Create Team Button */}
            <button
              onClick={() => setShowNewTeamForm(true)}
              className="w-full flex items-center justify-center space-x-2 mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>Create Team</span>
            </button>

            {/* New Team Form */}
            {showNewTeamForm && (
              <form onSubmit={createTeam} className="mb-4">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Team name"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="mt-2 flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewTeamForm(false)}
                    className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Teams List */}
            <div className="space-y-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                    selectedTeam?.id === team.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Users size={20} />
                  <span>{team.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedTeam ? (
            <>
              <div className="bg-white border-b px-6 py-4">
                <h1 className="text-2xl font-bold">{selectedTeam.name}</h1>
              </div>
              <div className="flex-1 flex">
                <div className="flex-1 border-r">
                  <TeamChat teamId={selectedTeam.id} userId={user.id} />
                </div>
                <div className="w-96">
                  <WorkOrders
                    teamId={selectedTeam.id}
                    isLeader={selectedTeam.leader_id === user.id}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <p>Select a team to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}