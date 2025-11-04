import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Users, ClipboardList, Download, Upload, FileText, AlertCircle, CheckCircle, X, UserPlus, FilePlus2, Trophy, Calendar, Eye, EyeOff } from 'lucide-react';
import { getDashboardData, getSports, createSession, getSessionCsvTemplate, uploadSessionCsv, createTeamProposal, listTeamProposals, listNotifications, acceptTeamAssignment, rejectTeamAssignment, listTeamAssignments, acceptLinkRequest, rejectLinkRequest, listLinkRequests, endSession, listSessions, listTournaments, listTournamentMatches, getPointsTable, getTournamentLeaderboard } from '../services/coach';

// Modal Component
const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl shadow-xl w-full max-w-md border border-[#334155] p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function CoachDashboard() {
  const [dashboardData, setDashboardData] = useState({ teams: [], players: [] });
  const [sessions, setSessions] = useState([]);
  const [sports, setSports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // End session modal state
  const [isEndSessionModalOpen, setEndSessionModalOpen] = useState(false);
  const [endSessionFile, setEndSessionFile] = useState(null);
  const [sessionToEnd, setSessionToEnd] = useState(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalForm, setProposalForm] = useState({ teamName: '', sportId: '', playerIds: '' });
  const [proposals, setProposals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState([]);
  const [linkRequests, setLinkRequests] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentDetails, setTournamentDetails] = useState({});
  const [showTournamentDetails, setShowTournamentDetails] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dashRes, sportsRes, propsRes, notifsRes, assignsRes, linksRes, sessionsRes, tournamentsRes] = await Promise.all([
        getDashboardData(),
        getSports().catch(() => ({ data: [] })),
        listTeamProposals().catch(() => ({ data: [] })),
        listNotifications().catch(() => ({ data: [] })),
        listTeamAssignments().catch(() => ({ data: [] })),
        listLinkRequests().catch((e) => {
          console.error('Error loading link requests:', e);
          console.error('Error details:', e?.response?.data, e?.response?.status);
          return { data: [] };
        }).then(res => {
          // Debug: log the response
          console.log('Link requests API response:', res);
          console.log('Response data type:', typeof res?.data, 'Is array:', Array.isArray(res?.data));
          console.log('Response data:', JSON.stringify(res?.data, null, 2));
          return res;
        }),
        listSessions().catch(() => ({ data: [] })),
        // Remove tournament call - coaches don't have permission, it causes 403 errors
        Promise.resolve({ data: [] })
      ]);
      setDashboardData(dashRes.data);
      setSports(sportsRes.data);
      setProposals(propsRes.data || []);
      setNotifications(notifsRes.data || []);
      setTeamAssignments(assignsRes.data || []);
      // Ensure linkRequests is always an array
      // Handle different response structures (direct array or paginated)
      let linkData = [];
      if (Array.isArray(linksRes.data)) {
        linkData = linksRes.data;
      } else if (linksRes.data?.results) {
        linkData = linksRes.data.results;
      } else if (linksRes.data?.data) {
        linkData = linksRes.data.data;
      }
      setLinkRequests(linkData);
      const playerToCoachPending = linkData.filter(l => {
        const dirMatch = (l.direction === 'player_to_coach' || String(l.direction).toLowerCase() === 'player_to_coach');
        const statusMatch = (l.status === 'pending' || String(l.status).toLowerCase() === 'pending');
        return dirMatch && statusMatch;
      });
      console.log('Link requests loaded:', {
        count: linkData.length,
        data: linkData,
        rawResponse: linksRes.data,
        playerToCoachRequests: playerToCoachPending,
        allDirections: linkData.map(l => l.direction),
        allStatuses: linkData.map(l => l.status)
      });
      setSessions(sessionsRes.data || []);
      
      // Tournaments are only accessible to managers/admins, so set empty array for coaches
      setTournaments([]);
      
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
  }, [fetchData]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const res = await createSession({
        sport_id: parseInt(data.sport, 10),
        title: data.title,
        notes: data.notes,
      });
      // Refetch sessions to get the full session data with proper sport object
      try {
        const sessionsRes = await listSessions();
        setSessions(sessionsRes.data || []);
      } catch (e) {
        console.error('Failed to refresh sessions:', e);
        // Fallback: add session with sport object (not string)
        const sportObj = sports.find(s => s.id === parseInt(data.sport));
        setSessions(prev => [{ 
          id: res.data.id, 
          title: data.title,
          notes: data.notes,
          sport: sportObj || null,
          is_active: true,
          session_date: new Date().toISOString()
        }, ...prev]);
      }
      setCreateModalOpen(false);
    } catch (err) {
      console.error("Failed to create session:", err);
      alert("Error: Could not create session.");
    }
  };

  const handleDownloadTemplate = async (sessionId) => {
    try {
      const blob = await getSessionCsvTemplate(sessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `session_${sessionId}_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download template:", err);
      alert("Error: Could not download template.");
    }
  };

  const handleUploadCsv = async () => {
    if (!uploadFile || !selectedSession) return;
    setIsUploading(true);
    setUploadResult(null);
    try {
      const res = await uploadSessionCsv(selectedSession.id, uploadFile);
      setUploadResult({ success: true, data: res.data });
    } catch (err) {
      setUploadResult({ success: false, data: err.response?.data || { detail: "An unknown error occurred." } });
      console.error("Failed to upload CSV:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const openUploadModal = (session) => {
    setSelectedSession(session);
    setUploadFile(null);
    setUploadResult(null);
    setUploadModalOpen(true);
  };

  const openEndSessionModal = (session) => {
    setSessionToEnd(session);
    setEndSessionFile(null);
    setEndSessionModalOpen(true);
  };

  const handleEndSessionWithCsv = async () => {
    if (!endSessionFile || !sessionToEnd) {
      alert('Please select a CSV file to end the session');
      return;
    }
    
    setIsEndingSession(true);
    try {
      const result = await endSession(sessionToEnd.id, endSessionFile);
      alert(`✅ Session ended successfully!\n\nSummary:\n- Total Players: ${result.data.summary?.total_players || 'N/A'}\n- Attended: ${result.data.summary?.attended || 'N/A'}\n- Absent: ${result.data.summary?.absent || 'N/A'}\n- Average Rating: ${result.data.summary?.average_rating || 'N/A'}`);
      setEndSessionModalOpen(false);
      setEndSessionFile(null);
      setSessionToEnd(null);
      await fetchData(); // Refresh all data
    } catch (e) {
      console.error('Failed to end session:', e);
      const errorMsg = e?.response?.data?.detail || 'Failed to end session. Please check your CSV file format.';
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setIsEndingSession(false);
    }
  };

  if (isLoading) {
    return <div className="bg-[#0f172a] min-h-screen flex items-center justify-center text-white">Loading Coach Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Coach Dashboard</h1>
            <p className="text-[#94a3b8] mt-1">Manage your teams, players, and sessions.</p>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] text-white font-bold py-2 px-4 rounded-lg hover:from-[#0ea5e9] hover:to-[#0284c7] transition-all duration-300"
            >
              <PlusCircle size={20} />
              Create Session
            </button>
            <button
              onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
              className="text-sm text-[#ef4444] hover:text-[#dc2626] transition-colors px-3 py-1 rounded border border-[#ef4444] hover:bg-[#ef4444]/10"
            >Logout</button>
          </div>
        </header>

        {error && <div className="bg-red-900/30 border border-red-500 text-red-300 p-4 rounded-lg mb-6">{error}</div>}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-[#334155] flex items-center gap-4">
            <div className="bg-gradient-to-br from-[#38bdf8] to-[#0ea5e9] p-3 rounded-lg"><Users className="text-white" size={28} /></div>
            <div>
              <p className="text-[#94a3b8] text-sm">Total Players</p>
              <p className="text-2xl font-bold text-[#fbbf24]">{dashboardData.players.length}</p>
            </div>
          </div>
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-[#334155] flex items-center gap-4">
            <div className="bg-gradient-to-br from-[#10b981] to-[#059669] p-3 rounded-lg"><ClipboardList className="text-white" size={28} /></div>
            <div>
              <p className="text-[#94a3b8] text-sm">Managed Teams</p>
              <p className="text-2xl font-bold text-[#fbbf24]">{dashboardData.teams.length}</p>
            </div>
          </div>
           <div className="bg-[#1e293b] p-6 rounded-2xl border border-[#334155] flex items-center gap-4">
            <div className="bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] p-3 rounded-lg"><FileText className="text-[#0f172a]" size={28} /></div>
            <div>
              <p className="text-[#94a3b8] text-sm">Sessions Created</p>
              <p className="text-2xl font-bold text-[#fbbf24]">{sessions.length}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => setShowNotifications(true)}
            className="bg-[#1e293b] p-4 rounded-2xl border border-[#334155] hover:border-[#38bdf8] transition-colors flex items-center gap-3 relative"
          >
            <UserPlus className="text-[#38bdf8]" size={24} />
            <div className="text-left">
              <div className="font-semibold text-white">Application Requests</div>
              <div className="text-xs text-[#94a3b8]">View player applications</div>
            </div>
            {(() => {
              const pendingCount = linkRequests.filter(l => {
                const dirMatch = (l.direction === 'player_to_coach' || String(l.direction).toLowerCase() === 'player_to_coach');
                const statusMatch = (l.status === 'pending' || String(l.status).toLowerCase() === 'pending');
                return dirMatch && statusMatch;
              }).length;
              return pendingCount > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-[#38bdf8] rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {pendingCount}
                </span>
              );
            })()}
          </button>
          <button
            onClick={() => setShowProposalModal(true)}
            className="bg-[#1e293b] p-4 rounded-2xl border border-[#334155] hover:border-[#fbbf24] transition-colors flex items-center gap-3"
          >
            <FilePlus2 className="text-[#fbbf24]" size={24} />
            <div className="text-left">
              <div className="font-semibold text-white">Create Team Proposal</div>
              <div className="text-xs text-[#94a3b8]">Propose team from students</div>
            </div>
          </button>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="bg-[#1e293b] p-4 rounded-2xl border border-[#334155] hover:border-[#38bdf8] transition-colors relative"
          >
            <div className="font-semibold mb-2 text-white">Notifications</div>
            <div className="text-2xl font-bold text-[#fbbf24]">{notifications.filter(n => !n.read_at).length}</div>
            <div className="text-xs text-[#94a3b8]">Unread</div>
            {notifications.filter(n => !n.read_at).length > 0 && (
              <span className="absolute top-2 right-2 w-3 h-3 bg-[#38bdf8] rounded-full"></span>
            )}
          </button>
        </div>

        {/* Recent Sessions */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-[#334155]">
          <h2 className="text-2xl font-bold mb-4">Recent Sessions</h2>
          <div className="space-y-4">
            {sessions.length > 0 ? (
              sessions.map(session => (
                <div key={session.id} className="bg-[#171717] p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-white">{session.title}</h3>
                      {session.is_active !== false ? (
                        <span className="px-2 py-1 text-xs rounded bg-[#10b981] text-white">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-[#94a3b8] text-white">Ended</span>
                      )}
                    </div>
                    <p className="text-sm text-[#94a3b8]">{(typeof session.sport === 'string' ? session.sport : session.sport?.name) || 'Unknown Sport'} - Notes: {session.notes || 'N/A'}</p>
                    {session.session_date && (
                      <p className="text-xs text-[#94a3b8] mt-1">Date: {new Date(session.session_date).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {session.is_active !== false && (
                      <>
                        <button onClick={() => handleDownloadTemplate(session.id)} className="flex items-center gap-2 text-sm bg-[#2F2F2F] hover:bg-[#404040] text-white py-2 px-3 rounded-md transition-colors">
                          <Download size={16} /> Template
                        </button>
                        <button onClick={() => openUploadModal(session)} className="flex items-center gap-2 text-sm bg-[#38bdf8] hover:bg-[#0ea5e9] text-white py-2 px-3 rounded-md transition-colors">
                          <Upload size={16} /> Upload
                        </button>
                        <button 
                          onClick={() => openEndSessionModal(session)}
                          className="flex items-center gap-2 text-sm bg-[#ef4444] hover:bg-[#dc2626] text-white py-2 px-3 rounded-md transition-colors"
                        >
                          <X size={16} /> End Session
                        </button>
                      </>
                    )}
                    {session.is_active === false && (
                      <span className="text-sm text-[#94a3b8]">Session ended</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-[#94a3b8] py-8">No sessions created yet. Click "Create Session" to get started.</p>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed top-24 right-4 w-96 bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl z-30 max-h-[80vh] overflow-y-auto">
          <div className="p-4 border-b border-[#334155] flex items-center justify-between">
            <h3 className="font-bold text-white">Notifications & Requests</h3>
            <button onClick={() => setShowNotifications(false)} className="text-[#94a3b8] hover:text-white">✕</button>
          </div>
          <div className="p-4 space-y-3">
            {/* Player Link Requests (Player requested coach) */}
            {(() => {
              console.log('Notifications panel - All linkRequests:', linkRequests);
              const playerRequests = linkRequests.filter(l => {
                // Handle case-insensitive matching and different formats
                const directionMatch = (l.direction === 'player_to_coach' || 
                                        l.direction === 'PLAYER_TO_COACH' ||
                                        String(l.direction).toLowerCase() === 'player_to_coach');
                const statusMatch = (l.status === 'pending' || 
                                    l.status === 'PENDING' ||
                                    String(l.status).toLowerCase() === 'pending');
                const matches = directionMatch && statusMatch;
                console.log('Checking link:', l.id, 'direction:', l.direction, 'status:', l.status, 'matches:', matches);
                return matches;
              });
              console.log('Filtered playerRequests:', playerRequests);
              if (playerRequests.length === 0) {
                return (
                  <div className="text-sm text-[#94a3b8] text-center py-4">
                    No pending application requests
                    {linkRequests.length > 0 && (
                      <div className="text-xs mt-2">(Found {linkRequests.length} total requests, but none match filter)</div>
                    )}
                  </div>
                );
              }
              return (
                <div>
                  <div className="text-xs font-semibold text-[#94a3b8] mb-2">Player Requests ({playerRequests.length})</div>
                  {playerRequests.map(link => (
                    <div key={link.id} className="bg-[#0f172a] border border-[#334155] rounded-lg p-3 mb-2">
                      <div className="text-sm text-white mb-2">
                        Player <strong>{link.player?.user?.username || link.player?.username || 'Unknown'}</strong> requested you for <strong>{link.sport?.name || 'sport'}</strong>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await acceptLinkRequest(link.id);
                              // Remove from local state immediately
                              setLinkRequests(linkRequests.filter(l => l.id !== link.id));
                              alert('Request accepted! Player is now your student.');
                              // Refresh all data to update dashboard
                              await fetchData();
                            } catch (e) {
                              console.error('Error accepting request:', e);
                              alert(e?.response?.data?.detail || 'Failed to accept');
                            }
                          }}
                          className="flex-1 px-3 py-1 bg-[#10b981] hover:bg-[#059669] text-white rounded text-sm transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await rejectLinkRequest(link.id);
                              setLinkRequests(linkRequests.filter(l => l.id !== link.id));
                              alert('Request rejected');
                            } catch (e) {
                              alert(e?.response?.data?.detail || 'Failed to reject');
                            }
                          }}
                          className="flex-1 px-3 py-1 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded text-sm transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Team Assignment Requests */}
            {teamAssignments.filter(a => a.status === 'pending').length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[#94a3b8] mb-2">Team Assignment Requests</div>
                {teamAssignments.filter(a => a.status === 'pending').map(assign => (
                  <div key={assign.id} className="bg-[#0f172a] border border-[#334155] rounded-lg p-3 mb-2">
                    <div className="text-sm text-white mb-2">
                      Assigned to team: <strong>{assign.team?.name || 'Unknown'}</strong>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await acceptTeamAssignment(assign.id);
                            setTeamAssignments(teamAssignments.filter(a => a.id !== assign.id));
                            alert('Assignment accepted!');
                            fetchData();
                          } catch (e) {
                            alert(e?.response?.data?.detail || 'Failed to accept');
                          }
                        }}
                        className="flex-1 px-3 py-1 bg-[#10b981] hover:bg-[#059669] text-white rounded text-sm transition-colors"
                      >
                        Accept
                      </button>
           <button
                        onClick={async () => {
                          try {
                            await rejectTeamAssignment(assign.id);
                            setTeamAssignments(teamAssignments.filter(a => a.id !== assign.id));
                            alert('Assignment rejected');
                            fetchData();
                          } catch (e) {
                            alert(e?.response?.data?.detail || 'Failed to reject');
                          }
                        }}
                        className="flex-1 px-3 py-1 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded text-sm transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Notifications */}
            {notifications.length > 0 ? (
              notifications.map(notif => (
                <div key={notif.id} className={`bg-[#0f172a] border border-[#334155] rounded-lg p-3 ${!notif.read_at ? 'border-l-4 border-l-[#38bdf8]' : ''}`}>
                  <div className="text-sm font-medium text-white">{notif.title}</div>
                  <div className="text-xs text-[#94a3b8] mt-1">{notif.message}</div>
                  <div className="text-xs text-[#94a3b8] mt-2">{new Date(notif.created_at).toLocaleString()}</div>
                </div>
              ))
            ) : linkRequests.filter(l => l.direction === 'player_to_coach' && l.status === 'pending').length === 0 && teamAssignments.filter(a => a.status === 'pending').length === 0 && (
              <div className="text-sm text-[#94a3b8] text-center py-4">No notifications</div>
            )}
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Session">
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[#94a3b8] mb-1">Title</label>
            <input type="text" name="title" id="title" required className="w-full p-2 bg-[#171717] border border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]" />
          </div>
          <div>
            <label htmlFor="sport" className="block text-sm font-medium text-[#94a3b8] mb-1">Sport</label>
            <select name="sport" id="sport" required className="w-full p-2 bg-[#171717] border border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]">
              {sports.length > 0 ? sports.map(sport => (
                <option key={sport.id} value={sport.id}>{sport.name}</option>
              )) : <option disabled>No sports available</option>}
            </select>
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-[#94a3b8] mb-1">Notes (Optional)</label>
            <textarea name="notes" id="notes" rows="3" className="w-full p-2 bg-[#171717] border border-[#334155] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]"></textarea>
          </div>
          <button type="submit" className="w-full bg-[#38bdf8] text-white font-bold p-2 rounded-lg hover:bg-[#0ea5e9] transition-colors">Create</button>
        </form>
      </Modal>

      {/* Upload CSV Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} title={`Upload Attendance for "${selectedSession?.title}"`}>
        <div className="space-y-4">
          <p className="text-sm text-[#94a3b8]">Upload the completed CSV file. Ensure it follows the template format: <code className="bg-[#171717] px-1 rounded">player_id,attended,score</code>.</p>
          <div>
            <label htmlFor="csvFile" className="w-full cursor-pointer border-2 border-dashed border-[#334155] rounded-lg p-6 flex flex-col items-center justify-center hover:border-[#9E7FFF] transition-colors">
              <Upload size={32} className="text-[#94a3b8] mb-2" />
              <span className="text-white font-semibold">{uploadFile ? uploadFile.name : 'Click to select a file'}</span>
              <span className="text-xs text-[#94a3b8]">CSV up to 5MB</span>
            </label>
            <input type="file" id="csvFile" accept=".csv" onChange={(e) => setUploadFile(e.target.files[0])} className="hidden" />
          </div>
          
          {uploadResult && (
            <div className={`p-3 rounded-lg text-sm ${uploadResult.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
              {uploadResult.success ? (
                <div className="flex gap-2">
                  <CheckCircle className="flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Success!</strong> {uploadResult.data.updated} records updated.
                    {uploadResult.data.errors?.length > 0 && <span className="ml-2">({uploadResult.data.errors.length} errors)</span>}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <AlertCircle className="flex-shrink-0 mt-0.5" />
                  <strong>Upload Failed.</strong>
                </div>
              )}
              {uploadResult.data.errors?.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-xs space-y-1 max-h-32 overflow-y-auto">
                  {uploadResult.data.errors.map((err, i) => <li key={i}>Row {err.row}: {err.error} (Player ID: {err.player_id})</li>)}
                </ul>
              )}
            </div>
          )}

          <button onClick={handleUploadCsv} disabled={!uploadFile || isUploading} className="w-full bg-[#38bdf8] text-white font-bold p-2 rounded-lg hover:bg-[#0ea5e9] transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center">
            {isUploading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Upload & Process File'}
          </button>
        </div>
      </Modal>


      {/* Team Proposal Modal */}
      <Modal isOpen={showProposalModal} onClose={() => setShowProposalModal(false)} title="Create Team Proposal">
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            const ids = proposalForm.playerIds.split(',').map(s => Number(s.trim())).filter(Boolean);
            await createTeamProposal({
              managerId: null,
              sportId: Number(proposalForm.sportId),
              teamName: proposalForm.teamName,
              playerIds: ids,
            });
            setProposalForm({ teamName: '', sportId: '', playerIds: '' });
            setShowProposalModal(false);
            await fetchData(); // Refresh all data
            alert('Team proposal created successfully!');
          } catch (err) {
            alert(err?.response?.data?.detail || err?.response?.data?.player_ids?.[0] || err?.response?.data?.sport_id?.[0] || 'Failed to create proposal');
          }
        }} className="space-y-4">
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Team Name</label>
            <input
              type="text"
              value={proposalForm.teamName}
              onChange={(e) => setProposalForm(v => ({ ...v, teamName: e.target.value }))}
              required
              className="w-full p-2 bg-[#171717] border border-[#334155] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Sport</label>
            <select
              value={proposalForm.sportId}
              onChange={(e) => setProposalForm(v => ({ ...v, sportId: e.target.value }))}
              required
              className="w-full p-2 bg-[#171717] border border-[#334155] rounded-lg"
            >
              <option value="">Select sport</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Player IDs (comma-separated)</label>
            <input
              type="text"
              value={proposalForm.playerIds}
              onChange={(e) => setProposalForm(v => ({ ...v, playerIds: e.target.value }))}
              placeholder="e.g., 12,15,18"
              required
              className="w-full p-2 bg-[#171717] border border-[#334155] rounded-lg"
            />
            <p className="text-xs text-[#94a3b8] mt-1">Only your students not in any team</p>
          </div>
          <button type="submit" className="w-full bg-[#38bdf8] text-white font-bold p-2 rounded-lg">Submit Proposal</button>
        </form>
      </Modal>

      {/* Proposals List */}
      {proposals.length > 0 && (
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-[#334155] mt-6">
          <h2 className="text-2xl font-bold mb-4 text-white">My Team Proposals</h2>
          <div className="space-y-3">
            {proposals.map(pr => (
              <div key={pr.id} className="bg-[#0f172a] border border-[#334155] p-3 rounded-lg">
                <div className="font-medium text-white">{pr.team_name}</div>
                <div className="text-xs text-[#94a3b8]">{pr.sport?.name || 'Unknown'} • Status: <span className={`font-semibold ${pr.status === 'approved' ? 'text-[#10b981]' : pr.status === 'rejected' ? 'text-[#ef4444]' : 'text-[#fbbf24]'}`}>{pr.status}</span></div>
                {pr.created_at && <div className="text-xs text-[#94a3b8] mt-1">Created: {new Date(pr.created_at).toLocaleDateString()}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coach-Player History */}
      <div className="bg-[#1e293b] p-6 rounded-2xl border border-[#334155] mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">My Students History</h2>
          <div className="text-sm text-[#94a3b8]">
            Total: {dashboardData.total_students || 0} students • {dashboardData.total_teams || 0} teams
          </div>
        </div>
        <div className="space-y-3">
          {dashboardData.players && dashboardData.players.length > 0 ? (
            dashboardData.players.map(player => {
              const profiles = player.profiles || [];
              return (
                <div key={player.id || player.user_id} className="bg-[#0f172a] border border-[#334155] p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-white">{player.user?.username || player.username || `Player ${player.id}`}</div>
                      <div className="text-xs text-[#94a3b8] mt-1">Player ID: {player.player_id || 'N/A'}</div>
                      {player.user?.email && <div className="text-xs text-[#94a3b8]">Email: {player.user.email}</div>}
                    </div>
                  </div>
                  {profiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {profiles.map((profile, idx) => (
                        <div key={profile.id || idx} className="bg-[#1e293b] p-3 rounded border border-[#334155]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-semibold text-white">{profile.sport?.name || 'Unknown Sport'}</div>
                            <span className={`text-xs px-2 py-1 rounded ${profile.is_active ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#94a3b8]/20 text-[#94a3b8]'}`}>
                              {profile.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-[#94a3b8]">
                            <div>Team: <span className="text-white">{profile.team?.name || 'No team'}</span></div>
                            {profile.joined_date && <div>Joined: <span className="text-white">{new Date(profile.joined_date).toLocaleDateString()}</span></div>}
                            {profile.career_score !== undefined && <div>Career Score: <span className="text-[#fbbf24] font-semibold">{Math.round(profile.career_score || 0)}</span></div>}
                          </div>
                          {/* Sport-specific stats */}
                          {profile.stats && (
                            <div className="mt-2 pt-2 border-t border-[#334155]">
                              <div className="text-xs font-semibold text-[#94a3b8] mb-1">Statistics:</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(profile.stats).map(([key, value]) => (
                                  <div key={key} className="text-[#94a3b8]">
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: <span className="text-white font-medium">{typeof value === 'number' ? (key.includes('rate') || key.includes('average') ? value.toFixed(2) : value) : value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-sm text-[#94a3b8] text-center py-4">No students yet. Invite players to get started.</div>
          )}
        </div>
      </div>

      {/* Tournaments Section - Only show if there are tournaments (coaches typically don't have access) */}
      {tournaments.length > 0 && (
      <div className="bg-[#1e293b] p-6 rounded-2xl border border-[#334155] mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy size={24} /> Tournaments
          </h2>
        </div>
        <div className="space-y-3">
          {tournaments.map(tournament => (
              <div key={tournament.id} className="bg-[#0f172a] border border-[#334155] p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-white">{tournament.name}</div>
                    <div className="text-xs text-[#94a3b8] mt-1">
                      {tournament.sport?.name || 'Sport'} • {tournament.location || '-'}
                      {tournament.overs_per_match && ` • ${tournament.overs_per_match} Overs`}
                      {tournament.status && ` • Status: ${tournament.status}`}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const newShowDetails = { ...showTournamentDetails };
                      newShowDetails[tournament.id] = !newShowDetails[tournament.id];
                      setShowTournamentDetails(newShowDetails);
                      
                      if (newShowDetails[tournament.id]) {
                        try {
                          const [matches, points, leaderboard] = await Promise.all([
                            listTournamentMatches(tournament.id).catch(() => ({ data: [] })),
                            getPointsTable(tournament.id).catch(() => ({ data: [] })),
                            getTournamentLeaderboard(tournament.id).catch(() => ({ data: {} }))
                          ]);
                          setTournamentDetails({
                            ...tournamentDetails,
                            [tournament.id]: {
                              matches: matches.data || [],
                              points: points.data || [],
                              leaderboard: leaderboard.data || {}
                            }
                          });
                        } catch (e) {
                          console.error('Failed to load tournament details', e);
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1 text-sm border border-[#334155] rounded bg-[#1e293b] hover:bg-[#0f172a] text-white transition-colors"
                  >
                    {showTournamentDetails[tournament.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    {showTournamentDetails[tournament.id] ? 'Hide' : 'View'} Details
                  </button>
                </div>
                
                {showTournamentDetails[tournament.id] && tournamentDetails[tournament.id] && (
                  <div className="mt-3 space-y-3 border-t border-[#334155] pt-3">
                    {/* Points Table */}
                    {tournamentDetails[tournament.id].points && tournamentDetails[tournament.id].points.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-2">Points Table</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-[#334155]">
                                <th className="text-left p-2 text-[#94a3b8]">Team</th>
                                <th className="text-center p-2 text-[#94a3b8]">MP</th>
                                <th className="text-center p-2 text-[#94a3b8]">W</th>
                                <th className="text-center p-2 text-[#94a3b8]">Pts</th>
                                <th className="text-center p-2 text-[#94a3b8]">NRR</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tournamentDetails[tournament.id].points
                                .sort((a, b) => b.points - a.points || b.net_run_rate - a.net_run_rate)
                                .map((pt, idx) => (
                                  <tr key={pt.id || idx} className="border-b border-[#334155]">
                                    <td className="p-2 text-white">{pt.team?.name || 'Unknown'}</td>
                                    <td className="text-center p-2 text-[#94a3b8]">{pt.matches_played || 0}</td>
                                    <td className="text-center p-2 text-[#94a3b8]">{pt.matches_won || 0}</td>
                                    <td className="text-center p-2 text-white font-bold">{pt.points || 0}</td>
                                    <td className="text-center p-2 text-[#94a3b8]">{pt.net_run_rate?.toFixed(2) || '0.00'}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {/* Matches */}
                    {tournamentDetails[tournament.id].matches && tournamentDetails[tournament.id].matches.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                          <Calendar size={16} /> Matches
                        </h3>
                        <div className="space-y-2">
                          {tournamentDetails[tournament.id].matches.map((match, idx) => (
                            <div key={match.id || idx} className="bg-[#1e293b] p-2 rounded text-xs">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-white">#{match.match_number}</span> {match.team1?.name || 'T1'} vs {match.team2?.name || 'T2'}
                                  {match.is_completed && (
                                    <span className="ml-2 text-[#94a3b8]">
                                      ({match.score_team1}/{match.wickets_team1} - {match.score_team2}/{match.wickets_team2})
                                    </span>
                                  )}
                                  {match.status === 'in_progress' && (
                                    <span className="ml-2 text-xs text-[#10b981]">● Live</span>
                                  )}
                                </div>
                                <div className="text-xs text-[#94a3b8]">
                                  {match.is_completed ? '✓ Completed' : match.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
      )}

      {/* End Session Modal - Requires CSV upload */}
      <Modal isOpen={isEndSessionModalOpen} onClose={() => {
        setEndSessionModalOpen(false);
        setEndSessionFile(null);
        setSessionToEnd(null);
      }} title={`End Session: "${sessionToEnd?.title}"`}>
        <div className="space-y-4">
          <p className="text-sm text-[#94a3b8]">
            To end this session, please upload the attendance CSV file. The session will be ended automatically after the CSV is verified.
          </p>
          <p className="text-xs text-[#94a3b8] bg-[#0f172a] p-2 rounded">
            <strong>CSV Format:</strong> <code className="bg-[#171717] px-1 rounded">player_id,attended,score</code><br/>
            Ensure the file follows the template format exactly.
          </p>
          
          <div>
            <label htmlFor="endSessionCsvFile" className="w-full cursor-pointer border-2 border-dashed border-[#334155] rounded-lg p-6 flex flex-col items-center justify-center hover:border-[#ef4444] transition-colors">
              <Upload size={32} className="text-[#94a3b8] mb-2" />
              <span className="text-white font-semibold">{endSessionFile ? endSessionFile.name : 'Click to select CSV file'}</span>
              <span className="text-xs text-[#94a3b8] mt-1">CSV file required</span>
            </label>
            <input 
              type="file" 
              id="endSessionCsvFile" 
              accept=".csv" 
              onChange={(e) => setEndSessionFile(e.target.files?.[0] || null)} 
              className="hidden" 
            />
          </div>

          {sessionToEnd && (
            <div className="flex gap-2">
              <button
                onClick={handleDownloadTemplate.bind(null, sessionToEnd.id)}
                className="flex-1 flex items-center justify-center gap-2 text-sm bg-[#2F2F2F] hover:bg-[#404040] text-white py-2 px-3 rounded-md transition-colors"
              >
                <Download size={16} /> Download Template
              </button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setEndSessionModalOpen(false);
                setEndSessionFile(null);
                setSessionToEnd(null);
              }}
              className="flex-1 bg-[#334155] hover:bg-[#475569] text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              disabled={isEndingSession}
            >
              Cancel
            </button>
            <button
              onClick={handleEndSessionWithCsv}
              disabled={!endSessionFile || isEndingSession}
              className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] disabled:bg-[#334155] disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isEndingSession ? (
                <>
                  <span className="animate-spin">⏳</span> Ending Session...
                </>
              ) : (
                <>
                  <X size={16} /> End Session
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
