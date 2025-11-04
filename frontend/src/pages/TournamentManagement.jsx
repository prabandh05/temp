import React, { useEffect, useState } from "react";
import {
  Trophy, Users, Calendar, MapPin, Play, Pause, Award, TrendingUp,
  Plus, X, Eye, EyeOff, ChevronDown, ChevronUp, Clock, Target
} from "lucide-react";
import {
  listTournaments,
  createTournament,
  addTeamToTournament,
  listTournamentMatches,
  createTournamentMatch,
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
  listTeams,
  getSports,
} from "../services/coach";

export default function TournamentManagement() {
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Tournament creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tournamentForm, setTournamentForm] = useState({
    name: "",
    sportId: "",
    location: "",
    overs_per_match: 20,
    start_date: "",
    end_date: "",
    description: ""
  });

  // Tournament details
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentMatches, setTournamentMatches] = useState({});
  const [pointsTable, setPointsTable] = useState({});
  const [leaderboard, setLeaderboard] = useState({});
  const [showDetails, setShowDetails] = useState({});

  // Match management
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchForm, setMatchForm] = useState({
    tournament_id: null,
    team1_id: "",
    team2_id: "",
    match_number: 1,
    date: "",
    location: "",
    notes: ""
  });

  // Match scoring
  const [selectedMatchForScoring, setSelectedMatchForScoring] = useState(null);
  const [matchState, setMatchState] = useState(null);
  const [matchPlayerStats, setMatchPlayerStats] = useState([]);

  // Team assignment
  const [assignForm, setAssignForm] = useState({ tournamentId: "", teamId: "" });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [tournamentsRes, sportsRes, teamsRes] = await Promise.all([
        listTournaments(),
        getSports(),
        listTeams()
      ]);
      setTournaments(tournamentsRes.data || []);
      setSports(sportsRes.data || []);
      const teamsData = teamsRes.data?.results || teamsRes.data || [];
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch (e) {
      setError("Failed to load data");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!tournamentForm.name || !tournamentForm.sportId) {
      alert("Please fill in tournament name and sport");
      return;
    }
    setCreating(true);
    try {
      await createTournament({
        name: tournamentForm.name,
        sport: Number(tournamentForm.sportId),
        location: tournamentForm.location,
        overs_per_match: tournamentForm.overs_per_match || 20,
        start_date: tournamentForm.start_date || null,
        end_date: tournamentForm.end_date || null,
        description: tournamentForm.description
      });
      await fetchAllData();
      setShowCreateModal(false);
      setTournamentForm({
        name: "",
        sportId: "",
        location: "",
        overs_per_match: 20,
        start_date: "",
        end_date: "",
        description: ""
      });
      alert("Tournament created successfully!");
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to create tournament");
    } finally {
      setCreating(false);
    }
  };

  const loadTournamentDetails = async (tournamentId) => {
    try {
      const [matches, points, leaderboardData] = await Promise.all([
        listTournamentMatches(tournamentId),
        getPointsTable(tournamentId),
        getTournamentLeaderboard(tournamentId)
      ]);
      setTournamentMatches({ ...tournamentMatches, [tournamentId]: matches.data || [] });
      setPointsTable({ ...pointsTable, [tournamentId]: points.data || [] });
      setLeaderboard({ ...leaderboard, [tournamentId]: leaderboardData.data || {} });
    } catch (e) {
      console.error("Failed to load tournament details", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-white text-xl">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[#fbbf24]" />
            <h1 className="text-3xl font-bold text-white">Tournament Management</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded-lg transition-colors"
          >
            <Plus size={20} /> Create Tournament
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-[#ef4444]/20 border border-[#ef4444] rounded-lg text-[#ef4444]">
            {error}
          </div>
        )}

        {/* Tournaments List */}
        <div className="grid grid-cols-1 gap-4">
          {tournaments.length === 0 ? (
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-8 text-center">
              <Trophy className="w-16 h-16 text-[#94a3b8] mx-auto mb-4" />
              <p className="text-[#94a3b8] text-lg">No tournaments yet</p>
              <p className="text-[#94a3b8] text-sm mt-2">Create your first tournament to get started</p>
            </div>
          ) : (
            tournaments.map(tournament => (
              <div key={tournament.id} className="bg-[#1e293b] border border-[#334155] rounded-xl p-6">
                {/* Tournament Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-white">{tournament.name}</h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        tournament.status === 'upcoming' ? 'bg-[#fbbf24]/20 text-[#fbbf24]' :
                        tournament.status === 'ongoing' ? 'bg-[#10b981]/20 text-[#10b981]' :
                        tournament.status === 'completed' ? 'bg-[#94a3b8]/20 text-[#94a3b8]' :
                        'bg-[#ef4444]/20 text-[#ef4444]'
                      }`}>
                        {tournament.status?.toUpperCase() || 'UPCOMING'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#94a3b8]">
                      <div className="flex items-center gap-1">
                        <Trophy size={16} />
                        {tournament.sport?.name || 'Unknown Sport'}
                      </div>
                      {tournament.overs_per_match && (
                        <div className="flex items-center gap-1">
                          <Target size={16} />
                          {tournament.overs_per_match} Overs
                        </div>
                      )}
                      {tournament.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          {tournament.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        {tournament.teams_count || 0} Teams
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        {tournament.matches_count || 0} Matches
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tournament.status === 'upcoming' && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Start tournament "${tournament.name}"?`)) {
                            try {
                              await startTournament(tournament.id);
                              await fetchAllData();
                              alert("Tournament started!");
                            } catch (e) {
                              alert(e?.response?.data?.detail || "Failed to start tournament");
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg transition-colors"
                      >
                        <Play size={16} /> Start
                      </button>
                    )}
                    {tournament.status === 'ongoing' && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`End tournament "${tournament.name}"? This will create achievements and finalize standings.`)) {
                            try {
                              const result = await endTournament(tournament.id);
                              await fetchAllData();
                              alert(`Tournament ended!\n\nAchievements Created: ${result.data.achievements_created?.join(', ') || 'None'}\nWinning Team: ${result.data.winning_team || 'N/A'}`);
                            } catch (e) {
                              alert(e?.response?.data?.detail || "Failed to end tournament");
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg transition-colors"
                      >
                        <Pause size={16} /> End
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const newShowDetails = { ...showDetails };
                        newShowDetails[tournament.id] = !newShowDetails[tournament.id];
                        setShowDetails(newShowDetails);
                        if (newShowDetails[tournament.id]) {
                          loadTournamentDetails(tournament.id);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] text-white rounded-lg transition-colors"
                    >
                      {showDetails[tournament.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      {showDetails[tournament.id] ? 'Hide' : 'View'} Details
                    </button>
                  </div>
                </div>

                {/* Tournament Details */}
                {showDetails[tournament.id] && (
                  <div className="mt-4 space-y-4 border-t border-[#334155] pt-4">
                    {/* Points Table */}
                    {pointsTable[tournament.id] && pointsTable[tournament.id].length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <TrendingUp size={20} /> Points Table
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[#334155]">
                                <th className="text-left p-3 text-[#94a3b8]">Team</th>
                                <th className="text-center p-3 text-[#94a3b8]">MP</th>
                                <th className="text-center p-3 text-[#94a3b8]">W</th>
                                <th className="text-center p-3 text-[#94a3b8]">L</th>
                                <th className="text-center p-3 text-[#94a3b8]">T</th>
                                <th className="text-center p-3 text-[#94a3b8]">Pts</th>
                                <th className="text-center p-3 text-[#94a3b8]">NRR</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pointsTable[tournament.id]
                                .sort((a, b) => {
                                  const pointsDiff = (b.points || 0) - (a.points || 0);
                                  if (pointsDiff !== 0) return pointsDiff;
                                  const nrrA = Number(a.net_run_rate) || 0;
                                  const nrrB = Number(b.net_run_rate) || 0;
                                  return nrrB - nrrA;
                                })
                                .map((pt, idx) => {
                                  const netRunRate = Number(pt.net_run_rate);
                                  const nrrDisplay = !isNaN(netRunRate) ? netRunRate.toFixed(2) : '0.00';
                                  return (
                                    <tr key={pt.id || idx} className="border-b border-[#334155] hover:bg-[#0f172a]">
                                      <td className="p-3 text-white font-medium">{pt.team?.name || 'Unknown'}</td>
                                      <td className="text-center p-3 text-[#94a3b8]">{pt.matches_played || 0}</td>
                                      <td className="text-center p-3 text-[#94a3b8]">{pt.matches_won || 0}</td>
                                      <td className="text-center p-3 text-[#94a3b8]">{pt.matches_lost || 0}</td>
                                      <td className="text-center p-3 text-[#94a3b8]">{pt.matches_tied || 0}</td>
                                      <td className="text-center p-3 text-white font-bold">{pt.points || 0}</td>
                                      <td className="text-center p-3 text-[#94a3b8]">{nrrDisplay}</td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Leaderboard */}
                    {leaderboard[tournament.id] && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <Award size={20} /> Leaderboard
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {leaderboard[tournament.id].top_scorer && (
                            <div className="bg-[#0f172a] p-4 rounded-lg border border-[#334155]">
                              <div className="text-sm text-[#94a3b8] mb-1">Top Scorer</div>
                              <div className="text-lg font-bold text-white">
                                {leaderboard[tournament.id].top_scorer?.player__user__username || 'N/A'}
                              </div>
                            </div>
                          )}
                          {leaderboard[tournament.id].most_wickets && (
                            <div className="bg-[#0f172a] p-4 rounded-lg border border-[#334155]">
                              <div className="text-sm text-[#94a3b8] mb-1">Most Wickets</div>
                              <div className="text-lg font-bold text-white">
                                {leaderboard[tournament.id].most_wickets?.player__user__username || 'N/A'}
                              </div>
                            </div>
                          )}
                          {leaderboard[tournament.id].most_mom && (
                            <div className="bg-[#0f172a] p-4 rounded-lg border border-[#334155]">
                              <div className="text-sm text-[#94a3b8] mb-1">Most MoM</div>
                              <div className="text-lg font-bold text-white">
                                {leaderboard[tournament.id].most_mom?.man_of_the_match__user__username || 'N/A'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Add Team */}
                    <div className="bg-[#0f172a] p-4 rounded-lg border border-[#334155]">
                      <h3 className="text-sm font-semibold text-white mb-3">Add Team to Tournament</h3>
                      <div className="flex gap-2">
                        <select
                          value={assignForm.tournamentId === String(tournament.id) ? assignForm.teamId : ''}
                          onChange={(e) => setAssignForm({ tournamentId: String(tournament.id), teamId: e.target.value })}
                          className="flex-1 p-2 border border-[#334155] rounded bg-[#1e293b] text-white"
                        >
                          <option value="">Select team...</option>
                          {teams
                            .filter(tm => tm.sport?.id === tournament.sport?.id)
                            .map(tm => (
                              <option key={tm.id} value={tm.id}>{tm.name}</option>
                            ))}
                        </select>
                        <button
                          onClick={async () => {
                            if (!assignForm.teamId || assignForm.tournamentId !== String(tournament.id)) return;
                            try {
                              await addTeamToTournament(tournament.id, Number(assignForm.teamId));
                              setAssignForm({ tournamentId: "", teamId: "" });
                              await fetchAllData();
                              await loadTournamentDetails(tournament.id);
                              alert("Team added successfully!");
                            } catch (e) {
                              alert(e?.response?.data?.detail || "Failed to add team");
                            }
                          }}
                          className="px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded transition-colors"
                        >
                          Add Team
                        </button>
                      </div>
                    </div>

                    {/* Matches */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Calendar size={20} /> Matches
                        </h3>
                        <button
                          onClick={() => {
                            setMatchForm({
                              tournament_id: tournament.id,
                              team1_id: "",
                              team2_id: "",
                              match_number: (tournamentMatches[tournament.id]?.length || 0) + 1,
                              date: new Date().toISOString().slice(0, 16),
                              location: tournament.location || "",
                              notes: ""
                            });
                            setShowMatchModal(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg transition-colors"
                        >
                          <Plus size={16} /> New Match
                        </button>
                      </div>
                      {tournamentMatches[tournament.id] && tournamentMatches[tournament.id].length > 0 ? (
                        <div className="space-y-2">
                          {tournamentMatches[tournament.id].map((match, idx) => (
                            <div key={match.id || idx} className="bg-[#0f172a] p-4 rounded-lg border border-[#334155]">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-sm font-semibold text-[#94a3b8]">#{match.match_number}</span>
                                    <span className="text-white font-medium">
                                      {match.team1?.name || 'T1'} vs {match.team2?.name || 'T2'}
                                    </span>
                                    {match.status === 'in_progress' && (
                                      <span className="px-2 py-1 text-xs rounded bg-[#10b981] text-white">● Live</span>
                                    )}
                                    {match.is_completed && (
                                      <span className="px-2 py-1 text-xs rounded bg-[#94a3b8] text-white">✓ Completed</span>
                                    )}
                                  </div>
                                  {match.is_completed && (
                                    <div className="text-sm text-[#94a3b8]">
                                      Score: {match.score_team1}/{match.wickets_team1} - {match.score_team2}/{match.wickets_team2}
                                    </div>
                                  )}
                                  {match.man_of_the_match && (
                                    <div className="text-xs text-[#38bdf8] mt-1">
                                      MoM: {match.man_of_the_match?.user?.username || 'Player'}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {match.status === 'in_progress' && tournament.sport?.name?.toLowerCase() === 'cricket' && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          const [state, stats] = await Promise.all([
                                            getMatchState(match.id),
                                            getMatchPlayerStats(match.id)
                                          ]);
                                          setMatchState(state.data);
                                          setMatchPlayerStats(stats.data || []);
                                          setSelectedMatchForScoring(match.id);
                                        } catch (e) {
                                          alert('Failed to load match state');
                                        }
                                      }}
                                      className="px-3 py-1 text-sm bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded transition-colors"
                                    >
                                      Score
                                    </button>
                                  )}
                                  {match.status !== 'in_progress' && !match.is_completed && tournament.sport?.name?.toLowerCase() === 'cricket' && (
                                    <button
                                      onClick={() => {
                                        setSelectedMatchForScoring(match.id);
                                        setMatchState(null);
                                        setMatchPlayerStats([]);
                                      }}
                                      className="px-3 py-1 text-sm bg-[#10b981] hover:bg-[#059669] text-white rounded transition-colors"
                                    >
                                      Start
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-[#0f172a] p-4 rounded-lg border border-[#334155] text-center text-[#94a3b8]">
                          No matches yet. Create a match to get started.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#334155]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Create Tournament</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#94a3b8] hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Tournament Name</label>
                <input
                  type="text"
                  value={tournamentForm.name}
                  onChange={(e) => setTournamentForm({ ...tournamentForm, name: e.target.value })}
                  className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  placeholder="e.g., Summer Cricket League"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Sport</label>
                  <select
                    value={tournamentForm.sportId}
                    onChange={(e) => setTournamentForm({ ...tournamentForm, sportId: e.target.value })}
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  >
                    <option value="">Select sport</option>
                    {sports.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Overs per Match</label>
                  <select
                    value={tournamentForm.overs_per_match}
                    onChange={(e) => setTournamentForm({ ...tournamentForm, overs_per_match: Number(e.target.value) })}
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  >
                    <option value={5}>5 Overs</option>
                    <option value={10}>10 Overs</option>
                    <option value={20}>20 Overs</option>
                    <option value={30}>30 Overs</option>
                    <option value={50}>50 Overs</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Location</label>
                <input
                  type="text"
                  value={tournamentForm.location}
                  onChange={(e) => setTournamentForm({ ...tournamentForm, location: e.target.value })}
                  className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  placeholder="e.g., Main Stadium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={tournamentForm.start_date}
                    onChange={(e) => setTournamentForm({ ...tournamentForm, start_date: e.target.value })}
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={tournamentForm.end_date}
                    onChange={(e) => setTournamentForm({ ...tournamentForm, end_date: e.target.value })}
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Description</label>
                <textarea
                  value={tournamentForm.description}
                  onChange={(e) => setTournamentForm({ ...tournamentForm, description: e.target.value })}
                  className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  rows={3}
                  placeholder="Tournament description..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateTournament}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Tournament'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#334155] rounded bg-[#0f172a] text-white hover:bg-[#1e293b] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Match Modal */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#334155]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Create Match</h2>
              <button onClick={() => setShowMatchModal(false)} className="text-[#94a3b8] hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createTournamentMatch({
                  tournament_id: matchForm.tournament_id,
                  team1_id: Number(matchForm.team1_id),
                  team2_id: Number(matchForm.team2_id),
                  match_number: Number(matchForm.match_number),
                  date: matchForm.date || new Date().toISOString(),
                  location: matchForm.location || "",
                  notes: matchForm.notes || ""
                });
                setShowMatchModal(false);
                const tournament = tournaments.find(t => t.id === matchForm.tournament_id);
                if (tournament) {
                  await loadTournamentDetails(tournament.id);
                }
                alert('Match created successfully!');
                setMatchForm({
                  tournament_id: null,
                  team1_id: "",
                  team2_id: "",
                  match_number: 1,
                  date: "",
                  location: "",
                  notes: ""
                });
              } catch (e) {
                alert(e?.response?.data?.detail || 'Failed to create match');
              }
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Team 1</label>
                  <select
                    value={matchForm.team1_id}
                    onChange={(e) => setMatchForm({ ...matchForm, team1_id: e.target.value })}
                    required
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  >
                    <option value="">Select team</option>
                    {tournaments.find(t => t.id === matchForm.tournament_id) && teams
                      .filter(tm => tm.sport?.id === tournaments.find(t => t.id === matchForm.tournament_id)?.sport?.id)
                      .map(tm => (
                        <option key={tm.id} value={tm.id}>{tm.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Team 2</label>
                  <select
                    value={matchForm.team2_id}
                    onChange={(e) => setMatchForm({ ...matchForm, team2_id: e.target.value })}
                    required
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  >
                    <option value="">Select team</option>
                    {tournaments.find(t => t.id === matchForm.tournament_id) && teams
                      .filter(tm => tm.sport?.id === tournaments.find(t => t.id === matchForm.tournament_id)?.sport?.id && tm.id !== Number(matchForm.team1_id))
                      .map(tm => (
                        <option key={tm.id} value={tm.id}>{tm.name}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Match Number</label>
                  <input
                    type="number"
                    value={matchForm.match_number}
                    onChange={(e) => setMatchForm({ ...matchForm, match_number: Number(e.target.value) })}
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={matchForm.date}
                    onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })}
                    className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Location</label>
                <input
                  type="text"
                  value={matchForm.location}
                  onChange={(e) => setMatchForm({ ...matchForm, location: e.target.value })}
                  className="w-full p-2 border border-[#334155] rounded bg-[#0f172a] text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Notes</label>
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
                  className="flex-1 px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded transition-colors"
                >
                  Create Match
                </button>
                <button
                  type="button"
                  onClick={() => setShowMatchModal(false)}
                  className="px-4 py-2 border border-[#334155] rounded bg-[#0f172a] text-white hover:bg-[#1e293b] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cricket Match Scoring Modal - Same as ManagerDashboard */}
      {selectedMatchForScoring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[#334155]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Cricket Match Scoring</h3>
              <button onClick={() => {
                setSelectedMatchForScoring(null);
                setMatchState(null);
                setMatchPlayerStats([]);
              }} className="text-[#94a3b8] hover:text-white text-2xl">
                <X size={24} />
              </button>
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
                          await fetchAllData();
                          const tournament = tournaments.find(t => t.id === match.tournament?.id);
                          if (tournament) {
                            await loadTournamentDetails(tournament.id);
                          }
                        } catch (e) {
                          alert(e?.response?.data?.detail || 'Failed to start match');
                        }
                      }}
                      className="w-full px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded transition-colors"
                    >Start Match</button>
                  </div>
                );
              }
              
              // Match scoring interface - same as ManagerDashboard
              if (matchState) {
                const battingTeam = matchState.current_batting_team;
                const bowlingTeam = matchState.current_bowling_team;
                const currentScore = battingTeam?.id === match.team1?.id ? matchState.team1_runs : matchState.team2_runs;
                const currentWickets = battingTeam?.id === match.team1?.id ? matchState.team1_wickets : matchState.team2_wickets;
                const tournament = tournaments.find(t => t.id === match.tournament?.id);
                
                return (
                  <div className="space-y-4">
                    {/* Score Display */}
                    <div className="bg-[#0f172a] p-4 rounded-lg border border-[#334155]">
                      <div className="text-center mb-2">
                        <div className="text-2xl font-bold text-white">
                          {currentScore}/{currentWickets}
                        </div>
                        <div className="text-sm text-[#94a3b8]">
                          {matchState.current_over}.{matchState.current_ball} / {tournament?.overs_per_match || 20} Overs
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
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm mb-1 text-[#94a3b8]">Batsman 1</label>
                            <select
                              id="batsman1"
                              className="w-full p-2 border border-[#334155] rounded bg-[#1e293b] text-white"
                            >
                              <option value="">Select player</option>
                              {matchPlayerStats.filter(s => s.team?.id === battingTeam?.id).map(s => (
                                <option key={s.player?.id} value={s.player?.id}>{s.player?.user?.username || s.player?.player_id}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm mb-1 text-[#94a3b8]">Batsman 2</label>
                            <select
                              id="batsman2"
                              className="w-full p-2 border border-[#334155] rounded bg-[#1e293b] text-white"
                            >
                              <option value="">Select player</option>
                              {matchPlayerStats.filter(s => s.team?.id === battingTeam?.id).map(s => (
                                <option key={s.player?.id} value={s.player?.id}>{s.player?.user?.username || s.player?.player_id}</option>
                              ))}
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
                          className="mt-2 w-full px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded transition-colors"
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
                              {matchPlayerStats.filter(s => s.team?.id === bowlingTeam?.id).map(s => (
                                <option key={s.player?.id} value={s.player?.id}>{s.player?.user?.username || s.player?.player_id}</option>
                              ))}
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
                              className="w-full px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded transition-colors"
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
                                      const stats = await getMatchPlayerStats(selectedMatchForScoring);
                                      setMatchPlayerStats(stats.data || []);
                                    } catch (e) {
                                      alert(e?.response?.data?.detail || 'Failed to add score');
                                    }
                                  }}
                                  className="px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded font-semibold transition-colors"
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
                              className="w-full px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded transition-colors"
                            >Wicket</button>
                          </div>
                        )}
                        
                        {/* Switch Innings / Complete Match */}
                        <div className="flex gap-2">
                          {(matchState.current_over >= (tournament?.overs_per_match || 20) || 
                            (matchState.current_batting_team?.id === match.team1?.id ? matchState.team1_wickets : matchState.team2_wickets) >= 10 ||
                            (matchState.current_batting_team?.id === match.team2?.id && matchState.team2_runs > matchState.team1_runs)) && (
                            <button
                              onClick={async () => {
                                if (matchState.current_batting_team?.id === match.team2?.id) {
                                  const momId = prompt('Enter Man of the Match Player ID (optional):');
                                  try {
                                    await completeMatch(selectedMatchForScoring, { man_of_the_match_player_id: momId || null });
                                    alert('Match completed!');
                                    setSelectedMatchForScoring(null);
                                    setMatchState(null);
                                    await fetchAllData();
                                    if (tournament) {
                                      await loadTournamentDetails(tournament.id);
                                    }
                                  } catch (e) {
                                    alert(e?.response?.data?.detail || 'Failed to complete match');
                                  }
                                } else {
                                  try {
                                    const result = await switchInnings(selectedMatchForScoring);
                                    setMatchState(result.data);
                                    alert('Innings switched!');
                                  } catch (e) {
                                    alert(e?.response?.data?.detail || 'Failed to switch innings');
                                  }
                                }
                              }}
                              className="flex-1 px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded transition-colors"
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
                                  if (tournament) {
                                    await loadTournamentDetails(tournament.id);
                                  }
                                } catch (e) {
                                  alert(e?.response?.data?.detail || 'Failed to cancel match');
                                }
                              }
                            }}
                            className="px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded transition-colors"
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

