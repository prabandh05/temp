import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Shield, UserCircle, LogOut, Loader2, FilePlus2, Bell } from 'lucide-react';
import { getDashboardData, getSports, createTeamProposal, listTeamProposals, listNotifications, acceptTeamAssignment, rejectTeamAssignment } from '../services/coach';

// Import new view components
import DashboardOverview from '../components/coach/DashboardOverview';
import TeamsView from '../components/coach/TeamsView';
import PlayersView from '../components/coach/PlayersView';
import ProfileView from '../components/coach/ProfileView';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'teams', label: 'My Teams', icon: Shield },
  { id: 'sessions', label: 'Sessions', icon: Shield },
  { id: 'players', label: 'My Players', icon: Users },
  { id: 'proposals', label: 'Team Proposals', icon: FilePlus2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

export default function CoachDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({ teams: [], players: [] });
  const [sports, setSports] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [proposalForm, setProposalForm] = useState({ teamName: '', sportId: '', playerIds: '' });
  const [notifications, setNotifications] = useState([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const dashRes = await getDashboardData();
      setDashboardData(dashRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    (async () => {
      try {
        const s = await getSports();
        setSports(s.data || []);
      } catch {}
      try {
        const p = await listTeamProposals();
        setProposals(p.data || []);
      } catch {}
      try {
        const n = await listNotifications();
        setNotifications(n.data || []);
      } catch {}
    })();
  }, [fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#9E7FFF]" />
        </div>
      );
    }
    if (error) {
        return <div className="bg-red-900/30 border border-red-500 text-red-300 p-4 rounded-lg m-8">{error}</div>;
    }
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview initialData={dashboardData} />;
      case 'teams':
        return <TeamsView teams={dashboardData?.teams || []} />;
      case 'players':
        return <PlayersView players={dashboardData?.players || []} onPlayersUpdate={fetchData} />;
      case 'sessions':
        return (
          <div className="max-w-5xl mx-auto space-y-6">
            <CreateSessionCard sports={sports} />
            <UploadCsvCard />
          </div>
        );
      case 'proposals':
        return (
          <div className="max-w-7xl mx-auto">
            <header className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Team Proposals</h1>
                <p className="text-[#A3A3A3]">Create a team proposal from your students and submit to your manager.</p>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#262626] p-4 rounded-2xl border border-[#2F2F2F]">
                <h2 className="text-xl font-semibold mb-3">New Proposal</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#A3A3A3] mb-1">Team Name</label>
                    <input
                      value={proposalForm.teamName}
                      onChange={(e) => setProposalForm(v => ({ ...v, teamName: e.target.value }))}
                      className="w-full p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg focus:outline-none"
                      placeholder="e.g., Wildcats"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A3A3A3] mb-1">Sport</label>
                    <select
                      value={proposalForm.sportId}
                      onChange={(e) => setProposalForm(v => ({ ...v, sportId: e.target.value }))}
                      className="w-full p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg focus:outline-none"
                    >
                      <option value="">Select sport</option>
                      {sports.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#A3A3A3] mb-1">Player IDs (comma-separated)</label>
                    <input
                      value={proposalForm.playerIds}
                      onChange={(e) => setProposalForm(v => ({ ...v, playerIds: e.target.value }))}
                      className="w-full p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg focus:outline-none"
                      placeholder="e.g., 12,15,18"
                    />
                    <p className="text-[11px] text-[#A3A3A3] mt-1">Only your students in the selected sport and not in any team will be accepted.</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const managerId = null; // Manager determined server-side by permissions or pass known manager user id
                        const ids = (proposalForm.playerIds || '').split(',').map(s => Number(s.trim())).filter(Boolean);
                        await createTeamProposal({
                          managerId: managerId || undefined,
                          sportId: Number(proposalForm.sportId),
                          teamName: proposalForm.teamName,
                          playerIds: ids,
                        });
                        const p = await listTeamProposals();
                        setProposals(p.data || []);
                        setProposalForm({ teamName: '', sportId: '', playerIds: '' });
                      } catch (e) {
                        alert(e?.response?.data?.detail || 'Failed to create proposal');
                      }
                    }}
                    className="w-full bg-[#9E7FFF] text-white font-bold py-2 rounded-lg hover:bg-purple-600"
                  >
                    Submit Proposal
                  </button>
                </div>
              </div>

              <div className="bg-[#262626] p-4 rounded-2xl border border-[#2F2F2F]">
                <h2 className="text-xl font-semibold mb-3">My Proposals</h2>
                <div className="space-y-3">
                  {proposals.length ? proposals.map(pr => (
                    <div key={pr.id} className="border border-[#2F2F2F] rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{pr.team_name}</div>
                          <div className="text-xs text-[#A3A3A3]">{pr.sport?.name || 'Sport'} • {new Date(pr.created_at).toLocaleString()}</div>
                        </div>
                        <div className="text-xs">{pr.status}</div>
                      </div>
                      <div className="text-xs text-[#A3A3A3] mt-2">Players: {(pr.proposed_players||[]).map(p => p.user?.username || p.id).join(', ') || '-'}</div>
                    </div>
                  )) : (
                    <div className="text-sm text-[#A3A3A3]">No proposals yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-[#262626] p-4 rounded-2xl border border-[#2F2F2F]">
              <div className="font-semibold mb-3">My Notifications</div>
              <div className="space-y-2">
                {notifications.length ? notifications.map(n => (
                  <div key={n.id} className="border border-[#2F2F2F] rounded px-3 py-2 text-sm flex items-center justify-between">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-[#A3A3A3]">{n.message}</div>
                    </div>
                    <div className="text-[11px] text-[#A3A3A3]">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                )) : <div className="text-sm text-[#A3A3A3]">No notifications</div>}
              </div>
            </div>

            <div className="bg-[#262626] p-4 rounded-2xl border border-[#2F2F2F]">
              <div className="font-semibold mb-3">Respond to Team Assignment</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  placeholder="Assignment ID"
                  value={assignmentId}
                  onChange={(e) => setAssignmentId(e.target.value)}
                  className="w-full p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg focus:outline-none"
                />
                <button
                  onClick={async () => {
                    try {
                      await acceptTeamAssignment(Number(assignmentId));
                      alert('Assignment accepted');
                      setAssignmentId('');
                    } catch (e) {
                      alert(e?.response?.data?.detail || 'Failed to accept');
                    }
                  }}
                  className="px-4 py-2 rounded bg-[#9E7FFF] text-white"
                >Accept</button>
                <button
                  onClick={async () => {
                    try {
                      await rejectTeamAssignment(Number(assignmentId), 'No thanks');
                      alert('Assignment rejected');
                      setAssignmentId('');
                    } catch (e) {
                      alert(e?.response?.data?.detail || 'Failed to reject');
                    }
                  }}
                  className="px-4 py-2 rounded border"
                >Reject</button>
              </div>
            </div>
          </div>
        );
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardOverview initialData={dashboardData} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#171717] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#262626] border-r border-[#2F2F2F] flex flex-col p-4">
        <div className="text-2xl font-bold text-white mb-10 px-2">Social Sports</div>
        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-[#9E7FFF] text-white'
                  : 'text-[#A3A3A3] hover:bg-[#3f3f46] hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto">
           <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#A3A3A3] hover:bg-[#3f3f46] hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}

function CreateSessionCard({ sports }) {
  const [form, setForm] = useState({ sportId: '', title: '', notes: '' });
  const [creating, setCreating] = useState(false);
  const [createdId, setCreatedId] = useState('');
  const { createSession, getSessionCsvTemplate } = require('../services/coach');
  return (
    <div className="bg-[#262626] p-4 rounded-2xl border border-[#2F2F2F]">
      <div className="font-semibold mb-3">Create Session</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={form.sportId}
          onChange={(e) => setForm(v => ({ ...v, sportId: e.target.value }))}
          className="p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg"
        >
          <option value="">Select sport</option>
          {sports.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm(v => ({ ...v, title: e.target.value }))}
          className="p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg"
        />
        <input
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm(v => ({ ...v, notes: e.target.value }))}
          className="p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg"
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          disabled={creating}
          onClick={async () => {
            try {
              setCreating(true);
              const payload = { sport: Number(form.sportId), title: form.title, notes: form.notes };
              const res = await createSession(payload);
              setCreatedId(res.data?.id || '');
            } catch (e) {
              alert(e?.response?.data?.detail || 'Failed to create');
            } finally {
              setCreating(false);
            }
          }}
          className="px-4 py-2 bg-[#9E7FFF] text-white rounded"
        >{creating ? 'Creating...' : 'Create Session'}</button>
        {createdId && (
          <button
            onClick={async () => {
              try {
                const blob = await getSessionCsvTemplate(createdId);
                const url = window.URL.createObjectURL(new Blob([blob]));
                const a = document.createElement('a');
                a.href = url; a.download = `session_${createdId}_template.csv`; a.click();
                window.URL.revokeObjectURL(url);
              } catch (e) {
                alert('Failed to download template');
              }
            }}
            className="px-4 py-2 border rounded"
          >Download CSV Template</button>
        )}
      </div>
    </div>
  );
}

function UploadCsvCard() {
  const [sessionId, setSessionId] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { uploadSessionCsv } = require('../services/coach');
  return (
    <div className="bg-[#262626] p-4 rounded-2xl border border-[#2F2F2F]">
      <div className="font-semibold mb-3">Upload Attendance CSV</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        <input
          placeholder="Session ID"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg"
        />
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg"
        />
        <button
          disabled={uploading || !file || !sessionId}
          onClick={async () => {
            try {
              setUploading(true);
              await uploadSessionCsv(Number(sessionId), file);
              alert('Uploaded');
              setFile(null); setSessionId('');
            } catch (e) {
              alert(e?.response?.data?.detail || 'Failed to upload');
            } finally {
              setUploading(false);
            }
          }}
          className="px-4 py-2 bg-[#9E7FFF] text-white rounded"
        >{uploading ? 'Uploading...' : 'Upload'}</button>
      </div>
    </div>
  );
}
