import React, { useEffect, useMemo, useState } from "react";
import {
  getSports,
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
} from "../services/coach";

export default function ManagerDashboard() {
  const [sports, setSports] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", sportId: "", location: "" });
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
    } catch {}
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

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Manager Dashboard</h1>
            {error && <div className="mt-2 text-sm text-[#ef4444]">{error}</div>}
          </div>
          <button
            onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
            className="text-sm text-[#ef4444] hover:text-[#dc2626] transition-colors px-3 py-1 rounded border border-[#ef4444] hover:bg-[#ef4444]/10"
          >Logout</button>
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
                {sports.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                placeholder="Coach ID (optional)"
                value={teamForm.coachId}
                onChange={(e) => setTeamForm(v => ({ ...v, coachId: e.target.value }))}
                className="p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
              />
              <button
                onClick={async () => {
                  try {
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    await createTeam({
                      name: teamForm.name,
                      sportId: Number(teamForm.sportId),
                      coachId: teamForm.coachId || null,
                      managerId: currentUser.id || null,
                    });
                    await fetchAllData();
                    setTeamForm({ name: "", sportId: "", coachId: "" });
                    alert('Team created successfully');
                  } catch (e) {
                    setError(e?.response?.data?.detail || 'Failed to create team');
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
                      {team.sport?.name || 'No sport'} • Coach: {team.coach?.user?.username || 'None'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const details = await getTeamDetails(team.id);
                          setTeamDetails(details.data);
                          setSelectedTeam(team.id);
                        } catch (e) {
                          setError('Failed to load team details');
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
                      {Array.isArray(playerProfiles) && playerProfiles.length > 0 ? (
                        playerProfiles
                          .filter(profile => {
                            const profileTeamId = profile.team?.id || profile.team;
                            const profileSportId = profile.sport?.id || profile.sport;
                            const teamSportId = team.sport?.id || team.sport;
                            return profileTeamId === team.id && profileSportId === teamSportId;
                          })
                          .map(profile => (
                            <div key={profile.id} className="flex items-center justify-between text-sm border-b border-[#334155] pb-2">
                              <span className="text-white">{profile.player?.user?.username || profile.player?.username || `Player ${profile.player?.id || profile.player_id || 'Unknown'}`}</span>
                              <button
                                onClick={async () => {
                                  try {
                                    await updatePlayerSportProfile(profile.id, { team: null });
                                    await fetchAllData();
                                    alert('Player removed from team');
                                  } catch (e) {
                                    setError(e?.response?.data?.detail || 'Failed to remove player');
                                  }
                                }}
                                className="text-xs text-[#ef4444] hover:underline"
                              >Remove</button>
                            </div>
                          ))
                      ) : (
                        <div className="text-xs text-[#94a3b8]">Loading players...</div>
                      )}
                      {Array.isArray(playerProfiles) && playerProfiles.filter(p => {
                        const pTeamId = p.team?.id || p.team;
                        const pSportId = p.sport?.id || p.sport;
                        const tSportId = team.sport?.id || team.sport;
                        return pTeamId === team.id && pSportId === tSportId;
                      }).length === 0 && (
                        <div className="text-xs text-[#94a3b8]">No players in this team yet</div>
                      )}
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
                              await updatePlayerSportProfile(Number(profileId), { team: team.id });
                              await fetchAllData();
                              alert('Player added to team');
                              e.target.value = '';
                            } catch (err) {
                              setError(err?.response?.data?.detail || 'Failed to add player');
                            }
                          }}
                        >
                          <option value="">Select player...</option>
                          {Array.isArray(playerProfiles) && playerProfiles
                            .filter(p => p.sport?.id === team.sport?.id && (!p.team || p.team.id !== team.id))
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.player?.user?.username || `Player ${p.player?.id}`} ({p.sport?.name})
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  await createTournament({ name: form.name, sport: Number(form.sportId), location: form.location });
                  const tt = await listTournaments();
                  setTournaments(tt.data || []);
                  setForm({ name: "", sportId: "", location: "" });
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
                    <div className="text-xs text-[#94a3b8]">{t.sport?.name || 'Sport'} • {t.location || '-'}</div>
                  </div>
                  <div className="flex items-center gap-2">
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
                              <span className="ml-2 text-xs">({m.score_team1} - {m.score_team2})</span>
                            )}
                            {m.man_of_the_match && (
                              <span className="ml-2 text-xs text-blue-600">MOM: {m.man_of_the_match?.user?.username || 'Player'}</span>
                            )}
                          </div>
                          <div className="text-xs text-[#94a3b8]">
                            {m.is_completed ? '✓ Completed' : 'Pending'}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-xs text-[#94a3b8]">No matches yet</div>
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
    </div>
  );
}
