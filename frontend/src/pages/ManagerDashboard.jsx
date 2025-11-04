import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import {
  getSports,
  getManagerSports,
  listTeamProposals,
  approveTeamProposal,
  rejectTeamProposal,
  listTeams,
  listTournaments,
  createTournament,
  addTeamToTournament,
  createTeamAssignment,
  listPromotionRequests,
  approvePromotionRequest,
  rejectPromotionRequest,
  createTeam,
  getTeamDetails,
  updateTeam,
  deleteTeam,
  listPlayers,
  listPlayerSportProfiles,
  updatePlayerSportProfile,
  listNotifications,
  listTournamentMatches,
  createTournamentMatch,
  updateTournamentMatch,
  startTournament,
  endTournament,
  getPointsTable,
  getTournamentLeaderboard,
  startMatch,
  setBatsmen,
  setBowler,
  addScore,
  addWicket,
  switchInnings,
  completeMatch,
  cancelMatch,
  getMatchState,
  getMatchPlayerStats,
} from "../services/coach";

export default function ManagerDashboard() {
  const [sports, setSports] = useState([]);
  const [managerSports, setManagerSports] = useState([]); // Sports assigned to this manager
  const [proposals, setProposals] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", sportId: "", location: "", overs_per_match: 20 });
  const [assignForm, setAssignForm] = useState({ tournamentId: "", teamId: "" });
  const [error, setError] = useState("");
  const [assignment, setAssignment] = useState({ teamId: "", coachId: "" });
  const [promotions, setPromotions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teamForm, setTeamForm] = useState({ name: "", sportId: "", coachId: "" });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [playerProfiles, setPlayerProfiles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedTournamentForMatches, setSelectedTournamentForMatches] = useState(null);
  const [tournamentMatches, setTournamentMatches] = useState({});
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [pointsTable, setPointsTable] = useState({});
  const [leaderboard, setLeaderboard] = useState({});
  const [selectedTournamentForDetails, setSelectedTournamentForDetails] = useState(null);
  const [selectedMatchForScoring, setSelectedMatchForScoring] = useState(null);
  const [matchState, setMatchState] = useState(null);
  const [matchPlayerStats, setMatchPlayerStats] = useState([]);
  const [matchForm, setMatchForm] = useState({
    tournament_id: null,
    team1_id: "",
    team2_id: "",
    match_number: 1,
    date: "",
    score_team1: 0,
    score_team2: 0,
    location: "",
    is_completed: false,
    man_of_the_match_player_id: "",
    notes: "",
  });

  const fetchAllData = async () => {
    try {
      const s = await getSports();
      setSports(s.data || []);
    } catch (e) {
      console.error('Error fetching sports:', e);
    }
    try {
      // Get manager's assigned sports
      const ms = await getManagerSports();
      const managerSportsData = ms.data || [];
      // Extract sport objects from manager-sport assignments
      const assignedSports = managerSportsData
        .map(ms => ms.sport)
        .filter(s => s); // Remove null/undefined
      setManagerSports(assignedSports);
      console.log('Manager assigned sports:', assignedSports);
    } catch (e) {
      console.error('Error fetching manager sports:', e);
      // If manager sports endpoint fails, use all sports (fallback)
      setManagerSports([]);
    }
    try {
      const p = await listTeamProposals();
      setProposals(p.data || []);
    } catch {}
    try {
      const t = await listTeams();
      // Handle paginated response (DRF returns {results: [...]})
      const teamsData = t.data?.results || t.data || [];
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch {}
    try {
      const tt = await listTournaments();
      setTournaments(tt.data || []);
    } catch {}
    try {
      const pr = await listPromotionRequests();
      setPromotions(pr.data || []);
    } catch {}
    try {
      const pl = await listPlayers();
      setPlayers(pl.data || []);
    } catch {}
    try {
      const profiles = await listPlayerSportProfiles();
      const profilesData = profiles.data?.results || profiles.data || [];
      setPlayerProfiles(Array.isArray(profilesData) ? profilesData : []);
    } catch {
      setPlayerProfiles([]);
    }
    try {
      const n = await listNotifications();
      setNotifications(n.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const sportOptions = useMemo(() => sports.map(s => ({ value: s.id, label: s.name })), [sports]);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Manager Dashboard</h1>
            {error && <div className="mt-2 text-sm text-[#ef4444]">{error}</div>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/tournaments")}
              className="flex items-center gap-2 px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded-lg transition-colors"
            >
              <Trophy size={18} /> Tournament Management
            </button>
            <button
              onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
              className="text-sm text-[#ef4444] hover:text-[#dc2626] transition-colors px-3 py-1 rounded border border-[#ef4444] hover:bg-[#ef4444]/10"
            >Logout</button>
          </div>
        </div>

        {/* Team Management */}
        <section className="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
          <div className="font-semibold mb-3 text-white">Team Management</div>

          {/* Create Team Form */}
          <div className="mb-6 p-4 bg-[#0f172a] rounded-lg">
            <div className="text-sm font-medium mb-3 text-white">Create New Team</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                placeholder="Team name"
                value={teamForm.name}
                onChange={(e) => setTeamForm(v => ({ ...v, name: e.target.value }))}
                className="p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
              />
              <select
                value={teamForm.sportId}
                onChange={(e) => setTeamForm(v => ({ ...v, sportId: e.target.value }))}
                className="p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
              >
                <option value="">Select sport</option>
                {/* Show only sports assigned to this manager, or all sports if none assigned (for admin) */}
                {(managerSports.length > 0 ? managerSports : sports).map(s => {
                  const sportId = s.id || s;
                  const sportName = s.name || (sports.find(sp => sp.id === sportId)?.name || 'Unknown');
                  return (
                    <option key={sportId} value={sportId}>{sportName}</option>
                  );
                })}
              </select>
              {managerSports.length === 0 && sports.length > 0 && (
                <div className="text-xs text-[#fbbf24] mt-1 col-span-4">
                  ⚠️ You are not assigned to any sports. Please contact admin to get assigned to a sport.
                </div>
              )}
              <input
                placeholder="Coach ID (optional)"
                value={teamForm.coachId}
                onChange={(e) => setTeamForm(v => ({ ...v, coachId: e.target.value }))}
                className="p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
              />
              <button
                onClick={async () => {
                  if (!teamForm.name || !teamForm.sportId) {
                    alert('Please fill in team name and select a sport');
                    return;
                  }
                  try {
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    await createTeam({
                      name: teamForm.name,
                      sport_id: Number(teamForm.sportId), // Use sport_id (backend expects this)
                      coach_id: teamForm.coachId || null,
                    });
                    // Refresh data to get updated team with sport
                    await fetchAllData();
                    setTeamForm({ name: "", sportId: "", coachId: "" });
                    alert('Team created successfully');
                  } catch (e) {
                    console.error('Error creating team:', e);
                    console.error('Error response:', e?.response?.data);
                    const errorMsg = e?.response?.data?.detail || 
                                   e?.response?.data?.sport_id?.[0] || 
                                   e?.response?.data?.name?.[0] ||
                                   JSON.stringify(e?.response?.data) ||
                                   'Failed to create team';
                    setError(errorMsg);
                    alert(`Error: ${errorMsg}`);
                  }
                }}
                className="px-4 py-2 rounded bg-[#38bdf8] text-white"
              >Create Team</button>
            </div>
          </div>

          {/* Teams List */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-white">Your Teams</div>
            {Array.isArray(teams) && teams.length ? teams.map(team => (
              <div key={team.id} className="border border-[#334155] rounded bg-[#0f172a] text-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-white">{team.name}</div>
                    <div className="text-xs text-[#94a3b8]">
                      Sport: {team.sport?.name || team.sport_id || 'No sport selected'} • Coach: {team.coach?.user?.username || team.coach?.username || 'None'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const details = await getTeamDetails(team.id);
                          setTeamDetails(details.data);
                          setSelectedTeam(team.id);
                          // Refresh player profiles to ensure we have latest data
                          try {
                            const profiles = await listPlayerSportProfiles();
                            const profilesData = profiles.data?.results || profiles.data || [];
                            setPlayerProfiles(Array.isArray(profilesData) ? profilesData : []);
                          } catch (e) {
                            console.error('Failed to refresh player profiles:', e);
                          }
                        } catch (e) {
                          setError('Failed to load team details');
                          console.error('Error loading team details:', e);
                        }
                      }}
                      className="px-3 py-1 text-sm rounded border"
                    >View Players</button>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Delete team "${team.name}"?`)) {
                          try {
                            await deleteTeam(team.id);
                            await fetchAllData();
                            alert('Team deleted');
                          } catch (e) {
                            setError(e?.response?.data?.detail || 'Failed to delete team');
                          }
                        }
                      }}
                      className="px-3 py-1 text-sm rounded border border-red-500 text-[#ef4444]"
                    >Delete</button>
                  </div>
                </div>

                {/* Show team details if selected */}
                {selectedTeam === team.id && (
                  <div className="mt-3 p-3 bg-[#0f172a] rounded border border-[#334155]">
                    <div className="text-sm font-medium mb-2 text-white">Team Players</div>
                    <div className="space-y-2">
                      {(() => {
                        // Filter players for this team and sport
                        const teamPlayers = Array.isArray(playerProfiles) ? playerProfiles.filter(profile => {
                          const profileTeamId = profile.team?.id || profile.team;
                          const profileSportId = profile.sport?.id || profile.sport;
                          // Handle both object and ID formats for team sport
                          const teamSportId = team.sport?.id || team.sport_id || team.sport;
                          const matchesTeam = profileTeamId === team.id || Number(profileTeamId) === Number(team.id);
                          const matchesSport = profileSportId === teamSportId || Number(profileSportId) === Number(teamSportId);
                          return matchesTeam && matchesSport;
                        }) : [];
                        
                        console.log('Team players filter:', {
                          teamId: team.id,
                          teamSportId: team.sport?.id || team.sport_id,
                          totalProfiles: playerProfiles.length,
                          filteredCount: teamPlayers.length,
                          teamPlayers: teamPlayers.map(p => ({
                            id: p.id,
                            teamId: p.team?.id || p.team,
                            sportId: p.sport?.id || p.sport,
                            playerName: p.player?.user?.username
                          }))
                        });
                        
                        if (teamPlayers.length > 0) {
                          return teamPlayers.map(profile => (
                            <div key={profile.id} className="flex items-center justify-between text-sm border-b border-[#334155] pb-2">
                              <span className="text-white">
                                {profile.player?.user?.username || profile.player?.username || `Player ${profile.player?.id || profile.player_id || 'Unknown'}`}
                              </span>
                              <button
                                onClick={async () => {
                                  try {
                                    await updatePlayerSportProfile(profile.id, { team_id: null });
                                    // Refresh player profiles
                                    const profiles = await listPlayerSportProfiles();
                                    const profilesData = profiles.data?.results || profiles.data || [];
                                    setPlayerProfiles(Array.isArray(profilesData) ? profilesData : []);
                                    alert('Player removed from team');
                                  } catch (e) {
                                    setError(e?.response?.data?.detail || 'Failed to remove player');
                                    console.error('Error removing player:', e);
                                  }
                                }}
                                className="text-xs text-[#ef4444] hover:underline"
                              >Remove</button>
                            </div>
                          ));
                        } else {
                          return (
                            <div className="text-xs text-[#94a3b8]">
                              {playerProfiles.length === 0 
                                ? "Loading players..." 
                                : `No players in this team yet. Add players using the dropdown below.`}
                            </div>
                          );
                        }
                      })()}
                    </div>

                    {/* Add player to team */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs font-medium mb-2">Add Player to Team</div>
                      <div className="flex gap-2">
                        <select
                          className="flex-1 p-1 border border-[#334155] rounded bg-[#0f172a] text-white text-sm"
                          onChange={async (e) => {
                            const profileId = e.target.value;
                            if (!profileId) return;
                            try {
                              // Ensure team has sport, and profile matches that sport
                              const teamSportId = team.sport?.id || team.sport_id || team.sport;
                              const selectedProfile = playerProfiles.find(p => p.id === Number(profileId));
                              if (!selectedProfile) {
                                alert('Selected player profile not found');
                                return;
                              }
                              const profileSportId = selectedProfile.sport?.id || selectedProfile.sport;
                              if (teamSportId && profileSportId && teamSportId !== profileSportId) {
                                alert(`Cannot add player: Team sport (${teamSportId}) doesn't match player sport (${profileSportId})`);
                                return;
                              }
                              // Send team_id instead of team object
                              await updatePlayerSportProfile(Number(profileId), { team_id: team.id });
                              await fetchAllData();
                              alert('Player added to team successfully');
                              e.target.value = '';
                            } catch (err) {
                              console.error('Error adding player to team:', err);
                              const errorMsg = err?.response?.data?.detail || err?.response?.data?.team?.[0] || 'Failed to add player';
                              setError(errorMsg);
                              alert(errorMsg);
                            }
                          }}
                        >
                          <option value="">Select player...</option>
                          {Array.isArray(playerProfiles) && playerProfiles
                            .filter(p => {
                              // Handle both object and ID formats for sport
                              const pSportId = p.sport?.id || p.sport;
                              const tSportId = team.sport?.id || team.sport_id || team.sport;
                              const pTeamId = p.team?.id || p.team;
                              // Filter: same sport, and either no team or different team
                              return pSportId === tSportId && (!pTeamId || pTeamId !== team.id);
                            })
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.player?.user?.username || `Player ${p.player?.id}`} ({p.sport?.name || 'Unknown Sport'})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <div className="text-sm text-[#94a3b8]">No teams yet. Create one above.</div>
            )}
          </div>
        </section>

        {/* Team Proposals */}
        <section className="bg-[#1e293b] border border-[#334155] rounded bg-[#0f172a] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-white">Team Proposals</div>
          </div>
          <div className="space-y-3">
            {proposals.length ? proposals.map(pr => (
              <div key={pr.id} className="border border-[#334155] rounded bg-[#0f172a] text-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-white">{pr.team_name}</div>
                    <div className="text-xs text-[#94a3b8]">
                      Sport: {pr.sport?.name || "Unknown"} • 
                      Coach: {pr.coach?.user?.username || pr.coach?.username || 'Unknown'} • 
                      Status: <span className={`font-semibold ${pr.status === 'approved' ? 'text-[#10b981]' : pr.status === 'rejected' ? 'text-[#ef4444]' : 'text-[#fbbf24]'}`}>{pr.status}</span>
                    </div>
                    {pr.proposed_players && pr.proposed_players.length > 0 && (
                      <div className="text-xs text-[#94a3b8] mt-1">
                        Players: {pr.proposed_players.length} players
                      </div>
                    )}
                    {pr.created_at && (
                      <div className="text-xs text-[#94a3b8] mt-1">
                        Proposed: {new Date(pr.created_at).toLocaleDateString()}
                      </div>
                    )}
                    {pr.remarks && (
                      <div className="text-xs text-[#94a3b8] mt-1">
                        Remarks: {pr.remarks}
                      </div>
                    )}
                  </div>
                  {pr.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await approveTeamProposal(pr.id);
                            await fetchAllData(); // Refresh all data
                            alert('Team proposal approved! Team created successfully.');
                          } catch (e) {
                            setError(e?.response?.data?.detail || 'Failed to approve');
                            alert(e?.response?.data?.detail || 'Failed to approve proposal');
                          }
                        }}
                        className="px-3 py-1 text-sm rounded bg-[#10b981] hover:bg-[#059669] text-white transition-colors"
                      >Approve</button>
                      <button
                        onClick={async () => {
                          const remarks = prompt('Rejection remarks (optional):');
                          try {
                            await rejectTeamProposal(pr.id, remarks || '');
                            await fetchAllData(); // Refresh all data
                            alert('Team proposal rejected');
                          } catch (e) {
                            setError(e?.response?.data?.detail || 'Failed to reject');
                            alert(e?.response?.data?.detail || 'Failed to reject proposal');
                          }
                        }}
                        className="px-3 py-1 text-sm rounded bg-[#ef4444] hover:bg-[#dc2626] text-white transition-colors"
                      >Reject</button>
                    </div>
                  )}
                </div>
                {pr.status !== 'pending' && pr.decided_by && (
                  <div className="text-xs text-[#94a3b8] mt-2 border-t border-[#334155] pt-2">
                    Decided by: {pr.decided_by?.username || 'Unknown'} on {pr.decided_at ? new Date(pr.decided_at).toLocaleDateString() : 'N/A'}
                  </div>
                )}
              </div>
            )) : (
              <div className="text-sm text-[#94a3b8]">No proposals</div>
            )}
          </div>
        </section>

        {/* Assign Coach to Team */}
        <section className="bg-[#1e293b] border border-[#334155] rounded bg-[#0f172a] rounded-xl p-4">
          <div className="font-semibold mb-3 text-white">Assign Coach to Team</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={assignment.teamId}
              onChange={(e) => setAssignment(v => ({ ...v, teamId: e.target.value }))}
              className="p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
            >
              <option value="">Select team</option>
              {Array.isArray(teams) && teams.map(tm => (
                <option key={tm.id} value={tm.id}>{tm.name}</option>
              ))}
            </select>
            <input
              placeholder="Coach ID (e.g., C2500001)"
              value={assignment.coachId}
              onChange={(e) => setAssignment(v => ({ ...v, coachId: e.target.value }))}
              className="p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
            />
            <button
              onClick={async () => {
                try {
                  await createTeamAssignment({ teamId: Number(assignment.teamId), coachId: assignment.coachId });
                  alert('Assignment request sent to coach');
                  setAssignment({ teamId: "", coachId: "" });
                  await fetchAllData(); // Refresh data
                } catch (e) {
                  setError(e?.response?.data?.detail || e?.response?.data?.coach_id?.[0] || e?.response?.data?.team_id?.[0] || 'Failed to assign coach');
                }
              }}
              className="px-4 py-2 rounded bg-[#38bdf8] hover:bg-[#0ea5e9] text-white transition-colors"
            >Assign</button>
          </div>
        </section>

        {/* Promotion Requests */}
        <section className="bg-[#1e293b] border border-[#334155] rounded bg-[#0f172a] rounded-xl p-4">
          <div className="font-semibold mb-3 text-white">Promotion Requests</div>
          <div className="space-y-3">
            {promotions.length ? promotions.map(p => (
              <div key={p.id} className="border border-[#334155] rounded bg-[#0f172a] text-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{p.player?.user?.username || p.user || 'Unknown'}</div>
                    <div className="text-xs text-[#94a3b8]">Sport: {p.sport?.name || p.sport || 'Unknown'} • Status: <span className={`font-semibold ${p.status === 'approved' ? 'text-[#10b981]' : p.status === 'rejected' ? 'text-[#ef4444]' : 'text-[#fbbf24]'}`}>{p.status}</span></div>
                    {p.remarks && <div className="text-xs text-[#94a3b8] mt-1">Remarks: {p.remarks}</div>}
                    {p.requested_at && <div className="text-xs text-[#94a3b8] mt-1">Requested: {new Date(p.requested_at).toLocaleDateString()}</div>}
                  </div>
                  {p.status === 'pending' && (
                    <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await approvePromotionRequest(p.id);
                          await fetchAllData(); // Refresh all data
                          alert('Promotion approved successfully!');
                        } catch (e) {
                          setError(e?.response?.data?.detail || 'Failed to approve promotion');
                          alert(e?.response?.data?.detail || 'Failed to approve promotion');
                        }
                      }}
                      className="px-3 py-1 text-sm rounded bg-[#10b981] hover:bg-[#059669] text-white transition-colors"
                    >Approve</button>
                      <button
                        onClick={async () => {
                          const remarks = prompt('Rejection remarks (optional):');
                          try {
                            await rejectPromotionRequest(p.id, remarks || '');
                            await fetchAllData();
                            alert('Promotion rejected');
                          } catch (e) {
                            setError(e?.response?.data?.detail || 'Failed to reject promotion');
                          }
                        }}
                        className="px-3 py-1 text-sm rounded bg-[#ef4444] hover:bg-[#dc2626] text-white transition-colors"
                      >Reject</button>
                    </div>
                  )}
                </div>
                {p.status !== 'pending' && p.decided_by && (
                  <div className="text-xs text-[#94a3b8] mt-2">Decided by: {p.decided_by?.username || 'Unknown'} on {p.decided_at ? new Date(p.decided_at).toLocaleDateString() : 'N/A'}</div>
                )}
              </div>
            )) : (
              <div className="text-sm text-[#94a3b8]">No promotion requests</div>
            )}
          </div>
        </section>

        {/* Create Tournament */}
        <section className="bg-[#1e293b] border border-[#334155] rounded bg-[#0f172a] rounded-xl p-4">
          <div className="font-semibold mb-3 text-white">Create Tournament</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              placeholder="Tournament name"
              value={form.name}
              onChange={(e) => setForm(v => ({ ...v, name: e.target.value }))}
              className="p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
            />
            <select
              value={form.sportId}
              onChange={(e) => setForm(v => ({ ...v, sportId: e.target.value }))}
              className="p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
            >
              <option value="">Select sport</option>
              {sportOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={form.overs_per_match}
              onChange={(e) => setForm(v => ({ ...v, overs_per_match: Number(e.target.value) }))}
              className="p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
            >
              <option value={5}>5 Overs</option>
              <option value={10}>10 Overs</option>
              <option value={20}>20 Overs</option>
              <option value={30}>30 Overs</option>
              <option value={50}>50 Overs</option>
            </select>
            <input
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm(v => ({ ...v, location: e.target.value }))}
              className="p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
            />
          </div>
          <div className="mt-3">
            <button
              disabled={creating}
              onClick={async () => {
                setCreating(true);
                setError("");
                try {
                  await createTournament({ 
                    name: form.name, 
                    sport: Number(form.sportId), 
                    location: form.location,
                    overs_per_match: form.overs_per_match || 20
                  });
                  const tt = await listTournaments();
                  setTournaments(tt.data || []);
                  setForm({ name: "", sportId: "", location: "", overs_per_match: 20 });
                } catch (e) {
                  setError(e?.response?.data?.detail || 'Failed to create tournament');
                } finally {
                  setCreating(false);
                }
              }}
              className="px-4 py-2 rounded bg-[#38bdf8] text-white"
            >{creating ? 'Creating...' : 'Create'}</button>
          </div>
        </section>

        {/* Tournaments */}
        <section className="bg-[#1e293b] border border-[#334155] rounded bg-[#0f172a] rounded-xl p-4">
          <div className="font-semibold mb-3 text-white">Tournaments</div>
          <div className="space-y-3">
            {tournaments.length ? tournaments.map(t => (
              <div key={t.id} className="border border-[#334155] rounded bg-[#0f172a] text-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-[#94a3b8]">
                      {t.sport?.name || 'Sport'} • {t.location || '-'} 
                      {t.overs_per_match && ` • ${t.overs_per_match} Overs`}
                      {t.status && ` • Status: ${t.status}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.status === 'upcoming' && (
                      <button
                        onClick={async () => {
                          try {
                            await startTournament(t.id);
                            await fetchAllData();
                            alert('Tournament started');
                          } catch (e) {
                            alert(e?.response?.data?.detail || 'Failed to start tournament');
                          }
                        }}
                        className="px-3 py-1 text-sm rounded bg-[#10b981] hover:bg-[#059669] text-white transition-colors"
                      >Start Tournament</button>
                    )}
                    {t.status === 'ongoing' && (
                      <button
                        onClick={async () => {
                          if (window.confirm('End tournament? This will create achievements.')) {
                            try {
                              const result = await endTournament(t.id);
                              await fetchAllData();
                              alert(`Tournament ended!\nAchievements: ${result.data.achievements_created?.join(', ') || 'None'}\nWinning Team: ${result.data.winning_team || 'N/A'}`);
                            } catch (e) {
                              alert(e?.response?.data?.detail || 'Failed to end tournament');
                            }
                          }
                        }}
                        className="px-3 py-1 text-sm rounded bg-[#ef4444] hover:bg-[#dc2626] text-white transition-colors"
                      >End Tournament</button>
                    )}
                    <button
                      onClick={async () => {
                        setSelectedTournamentForDetails(selectedTournamentForDetails === t.id ? null : t.id);
                        if (selectedTournamentForDetails !== t.id) {
                          try {
                            const [points, leaderboard] = await Promise.all([
                              getPointsTable(t.id),
                              getTournamentLeaderboard(t.id)
                            ]);
                            setPointsTable({ ...pointsTable, [t.id]: points.data || [] });
                            setLeaderboard({ ...leaderboard, [t.id]: leaderboard.data || {} });
                          } catch (e) {
                            console.error('Failed to load details', e);
                          }
                        }
                      }}
                      className="px-3 py-1 text-sm border border-[#334155] rounded bg-[#0f172a] text-white"
                    >{selectedTournamentForDetails === t.id ? 'Hide' : 'View'} Details</button>
                    <select
                      value={assignForm.tournamentId === String(t.id) ? assignForm.teamId : ''}
                      onChange={(e) => setAssignForm({ tournamentId: String(t.id), teamId: e.target.value })}
                      className="p-1 border border-[#334155] rounded bg-[#0f172a] text-white text-sm"
                    >
                      <option value="">Add team...</option>
                      {teams.filter(tm => tm.sport?.id === t.sport?.id).map(tm => (
                        <option key={tm.id} value={tm.id}>{tm.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        if (!assignForm.teamId || assignForm.tournamentId !== String(t.id)) return;
                        try {
                          await addTeamToTournament(t.id, Number(assignForm.teamId));
                          alert('Team added');
                          setAssignForm({ tournamentId: "", teamId: "" });
                          fetchAllData();
                        } catch (e) {
                          setError(e?.response?.data?.detail || 'Failed to add team');
                        }
                      }}
                      className="px-3 py-1 text-sm border border-[#334155] rounded bg-[#0f172a] text-white"
                    >Add</button>
                    <button
                      onClick={async () => {
                        setSelectedTournamentForMatches(selectedTournamentForMatches === t.id ? null : t.id);
                        if (selectedTournamentForMatches !== t.id) {
                          try {
                            const matches = await listTournamentMatches(t.id);
                            setTournamentMatches({ ...tournamentMatches, [t.id]: matches.data || [] });
                          } catch (e) {
                            console.error('Failed to load matches', e);
                          }
                        }
                      }}
                      className="px-3 py-1 text-sm border border-[#334155] rounded bg-[#0f172a] text-white bg-blue-50"
                    >{selectedTournamentForMatches === t.id ? 'Hide' : 'View'} Matches</button>
                    <button
                      onClick={() => {
                        setMatchForm({
                          ...matchForm,
                          tournament_id: t.id,
                          team1_id: "",
                          team2_id: "",
                          match_number: (tournamentMatches[t.id]?.length || 0) + 1,
                          date: new Date().toISOString().slice(0, 16),
                        });
                        setShowMatchModal(true);
                      }}
                      className="px-3 py-1 text-sm border border-[#334155] rounded bg-[#0f172a] text-white bg-green-50"
                    >New Match</button>
                  </div>
                </div>
                {selectedTournamentForMatches === t.id && tournamentMatches[t.id] && (
                  <div className="mt-3 space-y-2 border-t pt-2">
                    <div className="text-xs font-semibold text-[#94a3b8] mb-2">Matches:</div>
                    {tournamentMatches[t.id].length ? tournamentMatches[t.id].map((m, idx) => (
                      <div key={m.id || idx} className="bg-[#0f172a] p-2 rounded text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">#{m.match_number}</span> {m.team1?.name || 'T1'} vs {m.team2?.name || 'T2'}
                            {m.is_completed && (
                              <span className="ml-2 text-xs">({m.score_team1}/{m.wickets_team1} - {m.score_team2}/{m.wickets_team2})</span>
                            )}
                            {m.man_of_the_match && (
                              <span className="ml-2 text-xs text-blue-600">MOM: {m.man_of_the_match?.user?.username || 'Player'}</span>
                            )}
                            {m.status === 'in_progress' && (
                              <span className="ml-2 text-xs text-[#10b981]">● Live</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-[#94a3b8]">
                              {m.is_completed ? '✓ Completed' : m.status === 'in_progress' ? 'In Progress' : 'Pending'}
                            </div>
                            {m.status === 'in_progress' && t.sport?.name?.toLowerCase() === 'cricket' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const [state, stats] = await Promise.all([
                                      getMatchState(m.id),
                                      getMatchPlayerStats(m.id)
                                    ]);
                                    setMatchState(state.data);
                                    const statsData = stats.data || [];
                                    setMatchPlayerStats(statsData);
                                    setSelectedMatchForScoring(m.id);
                                    console.log('Loaded match player stats for scoring:', {
                                      matchId: m.id,
                                      statsCount: statsData.length,
                                      stats: statsData.map(s => ({
                                        id: s.id,
                                        playerId: s.player?.id,
                                        playerName: s.player?.user?.username,
                                        teamId: s.team?.id,
                                        teamName: s.team?.name
                                      }))
                                    });
                                    if (statsData.length === 0) {
                                      alert('No players found for this match. Make sure the match has been started and teams have players assigned.');
                                    }
                                  } catch (e) {
                                    console.error('Failed to load match state:', e);
                                    alert(e?.response?.data?.detail || 'Failed to load match state');
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded bg-[#38bdf8] hover:bg-[#0ea5e9] text-white"
                              >Score</button>
                            )}
                            {m.status !== 'in_progress' && !m.is_completed && t.sport?.name?.toLowerCase() === 'cricket' && (
                              <button
                                onClick={() => {
                                  setSelectedMatchForScoring(m.id);
                                  setMatchState(null);
                                  setMatchPlayerStats([]);
                                }}
                                className="px-2 py-1 text-xs rounded bg-[#10b981] hover:bg-[#059669] text-white"
                              >Start</button>
                            )}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-xs text-[#94a3b8]">No matches yet</div>
                    )}
                  </div>
                )}
                {selectedTournamentForDetails === t.id && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    {/* Points Table */}
                    {pointsTable[t.id] && pointsTable[t.id].length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-[#94a3b8] mb-2">Points Table:</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-[#334155]">
                                <th className="text-left p-2">Team</th>
                                <th className="text-center p-2">MP</th>
                                <th className="text-center p-2">W</th>
                                <th className="text-center p-2">L</th>
                                <th className="text-center p-2">Pts</th>
                                <th className="text-center p-2">NRR</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pointsTable[t.id].sort((a, b) => {
                                const pointsDiff = (b.points || 0) - (a.points || 0);
                                if (pointsDiff !== 0) return pointsDiff;
                                const nrrA = Number(a.net_run_rate) || 0;
                                const nrrB = Number(b.net_run_rate) || 0;
                                return nrrB - nrrA;
                              }).map((pt, idx) => (
                                <tr key={pt.id || idx} className="border-b border-[#334155]">
                                  <td className="p-2">{pt.team?.name || 'Unknown'}</td>
                                  <td className="text-center p-2">{pt.matches_played || 0}</td>
                                  <td className="text-center p-2">{pt.matches_won || 0}</td>
                                  <td className="text-center p-2">{pt.matches_lost || 0}</td>
                                  <td className="text-center p-2 font-semibold">{pt.points || 0}</td>
                                  <td className="text-center p-2">{(() => {
                                    const netRunRate = Number(pt.net_run_rate);
                                    return !isNaN(netRunRate) ? netRunRate.toFixed(2) : '0.00';
                                  })()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {/* Leaderboard */}
                    {leaderboard[t.id] && (
                      <div>
                        <div className="text-xs font-semibold text-[#94a3b8] mb-2">Leaderboard:</div>
                        <div className="text-xs space-y-1">
                          {leaderboard[t.id].top_scorer && (
                            <div>🏆 Top Scorer: {leaderboard[t.id].top_scorer?.player__user__username || 'N/A'}</div>
                          )}
                          {leaderboard[t.id].most_wickets && (
                            <div>🏆 Most Wickets: {leaderboard[t.id].most_wickets?.player__user__username || 'N/A'}</div>
                          )}
                          {leaderboard[t.id].most_mom && (
                            <div>🏆 Most MoM: {leaderboard[t.id].most_mom?.man_of_the_match__user__username || 'N/A'}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )) : (
              <div className="text-sm text-[#94a3b8]">No tournaments</div>
            )}
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-[#1e293b] border border-[#334155] rounded bg-[#0f172a] rounded-xl p-4">
          <div className="font-semibold mb-3 text-white">Notifications</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.length ? notifications.map(n => (
              <div key={n.id} className="border border-[#334155] rounded bg-[#0f172a] text-white p-2 text-sm flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-[#94a3b8] mt-1">{n.message}</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">{new Date(n.created_at).toLocaleDateString()}</div>
              </div>
            )) : (
              <div className="text-sm text-[#94a3b8]">No notifications</div>
            )}
          </div>
        </section>
      </div>

      {/* Match Modal */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1e293b] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Create Tournament Match</h3>
              <button onClick={() => setShowMatchModal(false)} className="text-[#94a3b8] hover:text-gray-700">×</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = {
                  tournament_id: matchForm.tournament_id,
                  team1_id: Number(matchForm.team1_id),
                  team2_id: Number(matchForm.team2_id),
                  match_number: Number(matchForm.match_number),
                  date: matchForm.date || new Date().toISOString(),
                  score_team1: Number(matchForm.score_team1) || 0,
                  score_team2: Number(matchForm.score_team2) || 0,
                  location: matchForm.location || "",
                  is_completed: matchForm.is_completed,
                  notes: matchForm.notes || "",
                };
                if (matchForm.man_of_the_match_player_id) {
                  payload.man_of_the_match_player_id = matchForm.man_of_the_match_player_id.trim();
                }
                await createTournamentMatch(payload);
                alert('Match created');
                setShowMatchModal(false);
                if (matchForm.tournament_id) {
                  const matches = await listTournamentMatches(matchForm.tournament_id);
                  setTournamentMatches({ ...tournamentMatches, [matchForm.tournament_id]: matches.data || [] });
                }
                setMatchForm({
                  tournament_id: null,
                  team1_id: "",
                  team2_id: "",
                  match_number: 1,
                  date: "",
                  score_team1: 0,
                  score_team2: 0,
                  location: "",
                  is_completed: false,
                  man_of_the_match_player_id: "",
                  notes: "",
                });
              } catch (err) {
                alert(err?.response?.data?.detail || JSON.stringify(err?.response?.data) || 'Failed to create match');
              }
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Team 1</label>
                  <select
                    value={matchForm.team1_id}
                    onChange={(e) => setMatchForm({ ...matchForm, team1_id: e.target.value })}
                    required
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  >
                    <option value="">Select team</option>
                    {tournaments.find(t => t.id === matchForm.tournament_id) && teams
                      .filter(tm => tm.sport === tournaments.find(t => t.id === matchForm.tournament_id)?.sport?.id)
                      .map(tm => (
                        <option key={tm.id} value={tm.id}>{tm.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Team 2</label>
                  <select
                    value={matchForm.team2_id}
                    onChange={(e) => setMatchForm({ ...matchForm, team2_id: e.target.value })}
                    required
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  >
                    <option value="">Select team</option>
                    {tournaments.find(t => t.id === matchForm.tournament_id) && teams
                      .filter(tm => tm.sport === tournaments.find(t => t.id === matchForm.tournament_id)?.sport?.id && tm.id !== Number(matchForm.team1_id))
                      .map(tm => (
                        <option key={tm.id} value={tm.id}>{tm.name}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Match Number</label>
                  <input
                    type="number"
                    value={matchForm.match_number}
                    onChange={(e) => setMatchForm({ ...matchForm, match_number: e.target.value })}
                    required
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={matchForm.date}
                    onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })}
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Score Team 1</label>
                  <input
                    type="number"
                    value={matchForm.score_team1}
                    onChange={(e) => setMatchForm({ ...matchForm, score_team1: e.target.value })}
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Score Team 2</label>
                  <input
                    type="number"
                    value={matchForm.score_team2}
                    onChange={(e) => setMatchForm({ ...matchForm, score_team2: e.target.value })}
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={matchForm.location}
                  onChange={(e) => setMatchForm({ ...matchForm, location: e.target.value })}
                  className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={matchForm.is_completed}
                    onChange={(e) => setMatchForm({ ...matchForm, is_completed: e.target.checked })}
                  />
                  <span className="text-sm font-medium">Match Completed</span>
                </label>
              </div>
              {matchForm.is_completed && (
                <div>
                  <label className="block text-sm font-medium mb-1">Man of the Match (Player ID)</label>
                  <input
                    type="text"
                    value={matchForm.man_of_the_match_player_id}
                    onChange={(e) => setMatchForm({ ...matchForm, man_of_the_match_player_id: e.target.value })}
                    placeholder="e.g., P2500001"
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  />
                  <p className="text-xs text-[#94a3b8] mt-1">Enter player ID like P2500001</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={matchForm.notes}
                  onChange={(e) => setMatchForm({ ...matchForm, notes: e.target.value })}
                  className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#38bdf8] text-white rounded"
                >Create Match</button>
                <button
                  type="button"
                  onClick={() => setShowMatchModal(false)}
                  className="px-4 py-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                >Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cricket Match Scoring Modal */}
      {selectedMatchForScoring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1e293b] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Cricket Match Scoring</h3>
              <button onClick={() => {
                setSelectedMatchForScoring(null);
                setMatchState(null);
                setMatchPlayerStats([]);
              }} className="text-[#94a3b8] hover:text-white text-2xl">×</button>
            </div>
            
            {(() => {
              const match = tournamentMatches[Object.keys(tournamentMatches).find(k => tournamentMatches[k].find(m => m.id === selectedMatchForScoring))]?.find(m => m.id === selectedMatchForScoring);
              if (!match) return <div className="text-white">Match not found</div>;
              
              // Start match form
              if (!matchState && match.status !== 'in_progress') {
                return (
                  <div className="space-y-4">
                    <div className="text-white mb-4">Start Match: {match.team1?.name} vs {match.team2?.name}</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-white">Toss Won By</label>
                        <select
                          id="toss_won_by"
                          className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                        >
                          <option value="">Select team</option>
                          <option value={match.team1?.id}>{match.team1?.name}</option>
                          <option value={match.team2?.id}>{match.team2?.name}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-white">Batting First</label>
                        <select
                          id="batting_first"
                          className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                        >
                          <option value="">Select team</option>
                          <option value={match.team1?.id}>{match.team1?.name}</option>
                          <option value={match.team2?.id}>{match.team2?.name}</option>
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const tossWon = document.getElementById('toss_won_by').value;
                        const battingFirst = document.getElementById('batting_first').value;
                        if (!tossWon || !battingFirst) {
                          alert('Please select toss winner and batting first team');
                          return;
                        }
                        try {
                          const result = await startMatch(selectedMatchForScoring, {
                            toss_won_by_team_id: Number(tossWon),
                            batting_first_team_id: Number(battingFirst)
                          });
                          setMatchState(result.data.state);
                          // Wait a moment for backend to create MatchPlayerStats
                          await new Promise(resolve => setTimeout(resolve, 500));
                          // Load player stats after match starts
                          try {
                            const [state, stats] = await Promise.all([
                              getMatchState(selectedMatchForScoring),
                              getMatchPlayerStats(selectedMatchForScoring)
                            ]);
                            setMatchState(state.data);
                            const statsData = stats.data || [];
                            setMatchPlayerStats(statsData);
                            console.log('Loaded match player stats after start:', {
                              count: statsData.length,
                              stats: statsData.map(s => ({
                                id: s.id,
                                playerId: s.player?.id,
                                playerName: s.player?.user?.username || s.player?.player_id,
                                teamId: s.team?.id,
                                teamName: s.team?.name,
                                battingTeamId: state.data?.current_batting_team?.id
                              }))
                            });
                            if (statsData.length === 0) {
                              alert('⚠️ No players found in teams. Make sure players are assigned to teams before starting the match.');
                            }
                          } catch (e) {
                            console.error('Failed to load player stats:', e);
                            alert('Match started but failed to load player stats. Please refresh.');
                          }
                          await fetchAllData();
                          // Reload matches
                          const matches = await listTournamentMatches(match.tournament.id);
                          setTournamentMatches({ ...tournamentMatches, [match.tournament.id]: matches.data || [] });
                        } catch (e) {
                          alert(e?.response?.data?.detail || 'Failed to start match');
                        }
                      }}
                      className="w-full px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded"
                    >Start Match</button>
                  </div>
                );
              }
              
              // Match scoring interface
              if (matchState) {
                const battingTeam = matchState.current_batting_team;
                const bowlingTeam = matchState.current_bowling_team;
                const currentScore = battingTeam?.id === match.team1?.id ? matchState.team1_runs : matchState.team2_runs;
                const currentWickets = battingTeam?.id === match.team1?.id ? matchState.team1_wickets : matchState.team2_wickets;
                
                return (
                  <div className="space-y-4">
                    {/* Score Display */}
                    <div className="bg-[#0f172a] p-4 rounded-lg border border-[#334155]">
                      <div className="text-center mb-2">
                        <div className="text-2xl font-bold text-white">
                          {currentScore}/{currentWickets}
                        </div>
                        <div className="text-sm text-[#94a3b8]">
                          {matchState.current_over}.{matchState.current_ball} / {match.tournament.overs_per_match || 20} Overs
                        </div>
                      </div>
                      <div className="text-xs text-[#94a3b8] mt-2">
                        Batting: {battingTeam?.name} | Bowling: {bowlingTeam?.name}
                      </div>
                    </div>
                    
                    {/* Set Batsmen */}
                    {!matchState.batsman1 || !matchState.batsman2 ? (
                      <div className="bg-[#0f172a] p-4 rounded-lg border border-[#334155]">
                        <div className="text-white font-semibold mb-2">Set Batsmen ({battingTeam?.name})</div>
                        {matchPlayerStats.length === 0 && (
                          <div className="text-xs text-[#fbbf24] mb-2">
                            ⚠️ No players found. Make sure teams have players assigned and the match has been started.
                            <button 
                              onClick={async () => {
                                try {
                                  const stats = await getMatchPlayerStats(selectedMatchForScoring);
                                  setMatchPlayerStats(stats.data || []);
                                  console.log('Manually reloaded stats:', stats.data);
                                } catch (e) {
                                  console.error('Failed to reload:', e);
                                  alert('Failed to reload player stats');
                                }
                              }}
                              className="ml-2 text-blue-400 underline"
                            >
                              Reload Stats
                            </button>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm mb-1 text-[#94a3b8]">Batsman 1</label>
                            <select
                              id="batsman1"
                              className="w-full p-2 border border-[#334155] rounded bg-[#1e293b] text-white"
                            >
                              <option value="">Select player</option>
                              {(() => {
                                if (matchPlayerStats.length === 0) {
                                  return <option value="" disabled>No players available - Teams may not have players assigned</option>;
                                }
                                const battingTeamPlayers = matchPlayerStats.filter(s => {
                                  const statsTeamId = s.team?.id || s.team;
                                  const battingTeamId = battingTeam?.id;
                                  // Handle both object and ID comparisons
                                  const matches = statsTeamId === battingTeamId || 
                                                 Number(statsTeamId) === Number(battingTeamId) ||
                                                 (statsTeamId && battingTeamId && String(statsTeamId) === String(battingTeamId));
                                  return matches;
                                });
                                console.log('Batsman 1 filter:', {
                                  totalStats: matchPlayerStats.length,
                                  battingTeamId: battingTeam?.id,
                                  battingTeamName: battingTeam?.name,
                                  filteredCount: battingTeamPlayers.length,
                                  allStats: matchPlayerStats.map(s => ({
                                    teamId: s.team?.id,
                                    teamName: s.team?.name,
                                    playerId: s.player?.id,
                                    playerName: s.player?.user?.username
                                  }))
                                });
                                if (battingTeamPlayers.length === 0) {
                                  return <option value="" disabled>No players found for {battingTeam?.name || 'this team'}</option>;
                                }
                                return battingTeamPlayers.map(s => (
                                  <option key={s.player?.id || s.id} value={s.player?.id}>
                                    {s.player?.user?.username || s.player?.player_id || `Player ${s.player?.id || 'Unknown'}`}
                                  </option>
                                ));
                              })()}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm mb-1 text-[#94a3b8]">Batsman 2</label>
                            <select
                              id="batsman2"
                              className="w-full p-2 border border-[#334155] rounded bg-[#1e293b] text-white"
                            >
                              <option value="">Select player</option>
                              {(() => {
                                if (matchPlayerStats.length === 0) {
                                  return <option value="" disabled>No players available - Teams may not have players assigned</option>;
                                }
                                const battingTeamPlayers = matchPlayerStats.filter(s => {
                                  const statsTeamId = s.team?.id || s.team;
                                  const battingTeamId = battingTeam?.id;
                                  // Handle both object and ID comparisons
                                  const matches = statsTeamId === battingTeamId || 
                                                 Number(statsTeamId) === Number(battingTeamId) ||
                                                 (statsTeamId && battingTeamId && String(statsTeamId) === String(battingTeamId));
                                  return matches;
                                });
                                console.log('Batsman 1 filter:', {
                                  totalStats: matchPlayerStats.length,
                                  battingTeamId: battingTeam?.id,
                                  battingTeamName: battingTeam?.name,
                                  filteredCount: battingTeamPlayers.length,
                                  allStats: matchPlayerStats.map(s => ({
                                    teamId: s.team?.id,
                                    teamName: s.team?.name,
                                    playerId: s.player?.id,
                                    playerName: s.player?.user?.username
                                  }))
                                });
                                if (battingTeamPlayers.length === 0) {
                                  return <option value="" disabled>No players found for {battingTeam?.name || 'this team'}</option>;
                                }
                                return battingTeamPlayers.map(s => (
                                  <option key={s.player?.id || s.id} value={s.player?.id}>
                                    {s.player?.user?.username || s.player?.player_id || `Player ${s.player?.id || 'Unknown'}`}
                                  </option>
                                ));
                              })()}
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const b1 = document.getElementById('batsman1').value;
                            const b2 = document.getElementById('batsman2').value;
                            if (!b1 || !b2) {
                              alert('Please select both batsmen');
                              return;
                            }
                            try {
                              const result = await setBatsmen(selectedMatchForScoring, {
                                batsman1_id: Number(b1),
                                batsman2_id: Number(b2),
                                current_striker_id: Number(b1)
                              });
                              setMatchState(result.data);
                            } catch (e) {
                              alert(e?.response?.data?.detail || 'Failed to set batsmen');
                            }
                          }}
                          className="mt-2 w-full px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded"
                        >Set Batsmen</button>
                      </div>
                    ) : (
                      <>
                        {/* Set Bowler */}
                        {!matchState.current_bowler && (
                          <div className="bg-[#0f172a] p-4 rounded-lg border border-[#334155]">
                            <div className="text-white font-semibold mb-2">Set Bowler ({bowlingTeam?.name})</div>
                            <select
                              id="bowler"
                              className="w-full p-2 border border-[#334155] rounded bg-[#1e293b] text-white mb-2"
                            >
                              <option value="">Select bowler</option>
                              {matchPlayerStats.length > 0 ? (
                                matchPlayerStats.filter(s => {
                                  const statsTeamId = s.team?.id || s.team;
                                  const bowlingTeamId = bowlingTeam?.id;
                                  return statsTeamId === bowlingTeamId;
                                }).map(s => (
                                  <option key={s.player?.id || s.id} value={s.player?.id}>
                                    {s.player?.user?.username || s.player?.player_id || `Player ${s.player?.id || 'Unknown'}`}
                                  </option>
                                ))
                              ) : (
                                <option value="" disabled>No players available</option>
                              )}
                            </select>
                            <button
                              onClick={async () => {
                                const bowler = document.getElementById('bowler').value;
                                if (!bowler) {
                                  alert('Please select bowler');
                                  return;
                                }
                                try {
                                  const result = await setBowler(selectedMatchForScoring, { bowler_id: Number(bowler) });
                                  setMatchState(result.data);
                                } catch (e) {
                                  alert(e?.response?.data?.detail || 'Failed to set bowler');
                                }
                              }}
                              className="w-full px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded"
                            >Set Bowler</button>
                          </div>
                        )}
                        
                        {/* Scoring Controls */}
                        {matchState.current_bowler && (
                          <div className="bg-[#0f172a] p-4 rounded-lg border border-[#334155]">
                            <div className="text-white font-semibold mb-3">Score Runs</div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {[0, 1, 2, 3, 4, 5, 6].map(runs => (
                                <button
                                  key={runs}
                                  onClick={async () => {
                                    try {
                                      const result = await addScore(selectedMatchForScoring, { runs });
                                      setMatchState(result.data);
                                      // Reload player stats
                                      const stats = await getMatchPlayerStats(selectedMatchForScoring);
                                      setMatchPlayerStats(stats.data || []);
                                    } catch (e) {
                                      alert(e?.response?.data?.detail || 'Failed to add score');
                                    }
                                  }}
                                  className="px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded font-semibold"
                                >{runs}</button>
                              ))}
                            </div>
                            <button
                              onClick={async () => {
                                const nextBatsman = prompt('Enter next batsman ID:');
                                if (!nextBatsman) return;
                                try {
                                  const player = matchPlayerStats.find(s => s.player?.player_id === nextBatsman || s.player?.id === Number(nextBatsman));
                                  if (!player) {
                                    alert('Player not found');
                                    return;
                                  }
                                  const result = await addWicket(selectedMatchForScoring, { next_batsman_id: player.player.id });
                                  setMatchState(result.data);
                                  const stats = await getMatchPlayerStats(selectedMatchForScoring);
                                  setMatchPlayerStats(stats.data || []);
                                } catch (e) {
                                  alert(e?.response?.data?.detail || 'Failed to add wicket');
                                }
                              }}
                              className="w-full px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded"
                            >Wicket</button>
                          </div>
                        )}
                        
                        {/* Switch Innings / Complete Match */}
                        <div className="flex gap-2">
                          {(matchState.current_over >= (match.tournament.overs_per_match || 20) || 
                            (matchState.current_batting_team?.id === match.team1?.id ? matchState.team1_wickets : matchState.team2_wickets) >= 10 ||
                            (matchState.current_batting_team?.id === match.team2?.id && matchState.team2_runs > matchState.team1_runs)) && (
                            <button
                              onClick={async () => {
                                if (matchState.current_batting_team?.id === match.team2?.id) {
                                  // Second innings complete, can complete match
                                  const momId = prompt('Enter Man of the Match Player ID (optional):');
                                  try {
                                    await completeMatch(selectedMatchForScoring, { man_of_the_match_player_id: momId || null });
                                    alert('Match completed!');
                                    setSelectedMatchForScoring(null);
                                    setMatchState(null);
                                    await fetchAllData();
                                  } catch (e) {
                                    alert(e?.response?.data?.detail || 'Failed to complete match');
                                  }
                                } else {
                                  // First innings complete, switch
                                  try {
                                    const result = await switchInnings(selectedMatchForScoring);
                                    setMatchState(result.data);
                                    alert('Innings switched!');
                                  } catch (e) {
                                    alert(e?.response?.data?.detail || 'Failed to switch innings');
                                  }
                                }
                              }}
                              className="flex-1 px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded"
                            >
                              {matchState.current_batting_team?.id === match.team2?.id ? 'Complete Match' : 'Switch Innings'}
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (window.confirm('Cancel match? No stats will be updated.')) {
                                try {
                                  await cancelMatch(selectedMatchForScoring);
                                  alert('Match cancelled');
                                  setSelectedMatchForScoring(null);
                                  setMatchState(null);
                                  await fetchAllData();
                                } catch (e) {
                                  alert(e?.response?.data?.detail || 'Failed to cancel match');
                                }
                              }
                            }}
                            className="px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded"
                          >Cancel Match</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              }
              
              return <div className="text-white">Loading...</div>;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
