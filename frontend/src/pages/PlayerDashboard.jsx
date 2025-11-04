import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { listNotifications, acceptLinkRequest, rejectLinkRequest, listLinkRequests, listTournaments, listTournamentMatches, getPointsTable, getTournamentLeaderboard, getCoachesBySport, requestCoach, getSports } from "../services/coach";
import { Bell, CheckCircle, XCircle, Trophy, Calendar, Eye, EyeOff, UserPlus, X } from "lucide-react";

export default function PlayerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [gameType, setGameType] = useState("team"); // 'team' | 'individual'
  const [activeSportName, setActiveSportName] = useState("");

  // UI state for leaderboard
  const [activeSportIndex, setActiveSportIndex] = useState(0);
  const [metric, setMetric] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [linkRequests, setLinkRequests] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentDetails, setTournamentDetails] = useState({});
  const [showTournamentDetails, setShowTournamentDetails] = useState({});
  const [showApplyCoachModal, setShowApplyCoachModal] = useState(false);
  const [availableCoaches, setAvailableCoaches] = useState([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [sports, setSports] = useState([]);

  // Ensure availableCoaches is always an array when modal closes
  useEffect(() => {
    if (!showApplyCoachModal) {
      setAvailableCoaches([]);
    }
  }, [showApplyCoachModal]);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const [resp, notifsRes, linksRes, tournamentsRes, sportsRes] = await Promise.all([
          api.get("/api/dashboard/player/"),
          listNotifications().catch(() => ({ data: [] })),
          listLinkRequests().catch(() => ({ data: [] })),
          // Remove tournament call - players don't have permission, it causes 403 errors
          Promise.resolve({ data: [] }),
          getSports().catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;
        const payload = resp.data;
        setData(payload);
        setNotifications(notifsRes.data || []);
        setLinkRequests(linksRes.data || []);
        setSports(sportsRes.data || []);
        
        // Filter tournaments where player's teams are participating
        const playerTeams = payload.profiles?.map(p => p.team?.id).filter(Boolean) || [];
        const allTournaments = tournamentsRes.data || [];
        const relevantTournaments = allTournaments.filter(t => {
          return playerTeams.some(teamId => 
            t.teams?.some(tt => tt.team?.id === teamId) || 
            t.teams_count > 0
          );
        });
        setTournaments(relevantTournaments);
        // Initialize selection: use primary_sport if provided, else first team then individual
        const all = payload.available_sports || [];
        const primary = payload.primary_sport || "";
        if (primary) {
          const ps = all.find(s => s.name === primary);
          if (ps) {
            setGameType(ps.sport_type || "team");
            setActiveSportName(ps.name);
          }
        }
        if (!primary && all.length) {
          const team = all.find(s => s.sport_type === "team");
          const indiv = all.find(s => s.sport_type === "individual");
          const first = team || indiv || all[0];
          setGameType(first.sport_type || "team");
          setActiveSportName(first.name);
        }
        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setError(
          (e?.response?.data && (e.response.data.detail || JSON.stringify(e.response.data))) ||
            e?.message ||
            "Failed to load player dashboard"
        );
        setLoading(false);
      }
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const profiles = data?.profiles || [];
  const available = data?.available_sports || [];
  const findProfileBySport = (name) => profiles.find(p => (p.sport||"") === name) || null;
  const activeProfile = activeSportName ? (findProfileBySport(activeSportName) || { sport: activeSportName, sport_type: (available.find(s=>s.name===activeSportName)?.sport_type || gameType), stats: {}, ranks: {}, achievements: [], performance: { series: [] }, attendance: { total_sessions: 0, attended: 0 }, career_score: 0 }) : null;
  const teamSports = available.filter(s => s.sport_type === "team");
  const individualSports = available.filter(s => s.sport_type === "individual");

  useEffect(() => {
    // Default metric per sport when tab changes
    if (!activeProfile) return;
    const sport = (activeProfile?.sport || "").toLowerCase();
    if (sport === "cricket") setMetric("strike_rate");
    else if (sport === "football") setMetric("goals");
    else if (sport === "basketball") setMetric("points");
    else if (sport === "running") setMetric("total_distance_km");
    else setMetric("");
  }, [activeSportIndex, activeProfile?.sport]);

  const performancePoints = useMemo(() => {
    const series = activeProfile?.performance?.series || [];
    if (!series.length) return [];
    const values = series.map(s => s.average);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const width = Math.max(320, series.length * 28);
    const height = 140;
    const pad = 16;
    const scaleX = (i) => pad + (i * (width - 2 * pad)) / Math.max(1, series.length - 1);
    const scaleY = (v) => {
      if (maxV === minV) return height / 2;
      // Invert to have higher scores on top
      return pad + (height - 2 * pad) * (1 - (v - minV) / (maxV - minV));
    };
    const points = series.map((s, i) => [scaleX(i), scaleY(s.average)]);
    return { width, height, points, series };
  }, [activeProfile?.performance?.series]);

  function MetricSelector({ profile }) {
    const sport = (profile?.sport || "").toLowerCase();
    const options = React.useMemo(() => {
      if (sport === "cricket") return ["strike_rate", "average", "runs", "wickets"];
      if (sport === "football") return ["goals", "assists", "tackles"];
      if (sport === "basketball") return ["points", "rebounds", "assists"];
      if (sport === "running") return ["total_distance_km", "best_time_seconds"];
      return [];
    }, [sport]);
    
    // Use useEffect to set metric when options change
    React.useEffect(() => {
      if (options.length > 0 && !options.includes(metric)) {
        setMetric(options[0]);
      }
    }, [sport, options, metric]);
    
    return (
      <select
        value={metric}
        onChange={(e) => setMetric(e.target.value)}
        className="border border-[#334155] rounded-md px-2 py-1 text-sm bg-[#0f172a] text-white focus:outline-none focus:ring-2 focus:ring-[#38bdf8]"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o.replaceAll("_", " ")}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#1e293b] border-b border-[#334155]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(v => !v)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#0ea5e9] hover:from-[#0ea5e9] hover:to-[#0284c7] transition-all"
              aria-label="Open profile"
            >
              <span className="font-semibold text-white">{data?.player?.user?.username?.[0]?.toUpperCase() || "P"}</span>
            </button>
            <div>
              <div className="font-semibold text-white">{data?.player?.user?.username || "Player"}</div>
              <div className="text-xs text-[#94a3b8]">ID: {data?.player?.player_id || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-[#94a3b8] hover:text-white transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read_at).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#fbbf24] text-[#0f172a] rounded-full text-xs flex items-center justify-center font-bold">
                  {notifications.filter(n => !n.read_at).length}
                </span>
              )}
            </button>
            <button
              onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
              className="text-sm text-[#ef4444] hover:text-[#dc2626] transition-colors px-3 py-1 rounded border border-[#ef4444] hover:bg-[#ef4444]/10"
            >Logout</button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-20">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-[#1e293b] border-l border-[#334155] shadow-xl p-4 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#0ea5e9] flex items-center justify-center text-lg font-semibold text-white">
                {data?.player?.user?.username?.[0]?.toUpperCase() || "P"}
              </div>
              <div>
                <div className="font-semibold text-white">{data?.player?.user?.username}</div>
                <div className="text-xs text-[#94a3b8]">Player ID: {data?.player?.user?.id}</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="font-semibold text-white">Profile</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-[#94a3b8]">Team</div>
                <div className="text-white">{activeProfile?.team || "-"}</div>
                <div className="text-[#94a3b8]">Coach</div>
                <div className="text-white">{activeProfile?.coach || "-"}</div>
                <div className="text-[#94a3b8]">Primary Sport</div>
                <div className="text-white">{activeProfile?.sport || (profiles[0]?.sport || "-")}</div>
              </div>
              <div className="pt-3 border-t border-[#334155]">
                <div className="font-semibold mb-2 text-white">Settings</div>
                <button className="block w-full text-left py-2 px-2 rounded hover:bg-[#0f172a] text-[#94a3b8] hover:text-white transition-colors">Change password</button>
                <button onClick={() => { localStorage.clear(); window.location.href = "/"; }} className="block w-full text-left py-2 px-2 rounded hover:bg-[#0f172a] text-[#ef4444] hover:text-[#dc2626] transition-colors">Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed top-16 right-4 w-96 bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl z-30 max-h-[80vh] overflow-y-auto">
          <div className="p-4 border-b border-[#334155] flex items-center justify-between">
            <h3 className="font-bold text-white">Notifications</h3>
            <button onClick={() => setShowNotifications(false)} className="text-[#94a3b8] hover:text-white">✕</button>
          </div>
          <div className="p-4 space-y-3">
            {/* Link Requests */}
            {linkRequests.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[#94a3b8] mb-2">Pending Invitations</div>
                {linkRequests.map(link => (
                  <div key={link.id} className="bg-[#0f172a] border border-[#334155] rounded-lg p-3 mb-2">
                    <div className="text-sm text-white mb-2">
                      {link.direction === 'coach_to_player' 
                        ? `Coach ${link.coach?.user?.username || link.coach?.username || 'Unknown'} invited you for ${link.sport?.name || 'sport'}`
                        : `Your application to Coach ${link.coach?.user?.username || link.coach?.username || 'Unknown'} for ${link.sport?.name || 'sport'} is pending`}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await acceptLinkRequest(link.id);
                            setLinkRequests(linkRequests.filter(l => l.id !== link.id));
                            alert('Invitation accepted!');
                            window.location.reload();
                          } catch (e) {
                            alert(e?.response?.data?.detail || 'Failed to accept');
                          }
                        }}
                        className="flex-1 px-3 py-1 bg-[#10b981] hover:bg-[#059669] text-white rounded text-sm transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" /> Accept
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await rejectLinkRequest(link.id);
                            setLinkRequests(linkRequests.filter(l => l.id !== link.id));
                            alert('Invitation rejected');
                          } catch (e) {
                            alert(e?.response?.data?.detail || 'Failed to reject');
                          }
                        }}
                        className="flex-1 px-3 py-1 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded text-sm transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-4 h-4" /> Reject
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
            ) : linkRequests.length === 0 && (
              <div className="text-sm text-[#94a3b8] text-center py-4">No notifications</div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading && <div className="text-center py-10 text-white">Loading...</div>}
        {error && !loading && (
          <div className="text-center py-10 text-[#ef4444]">{error}</div>
        )}
        {!loading && !error && data && (
          <div className="space-y-6">
            {/* Global sport type & sport selection */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-[#334155] rounded-lg p-3 bg-[#0f172a]">
                  <div className="text-sm text-[#94a3b8] mb-2">Game Type</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setGameType("individual");
                        const first = individualSports[0];
                        if (first) setActiveSportName(first.name);
                      }}
                      className={`px-3 py-2 rounded border transition-colors ${gameType==='individual' ? 'bg-[#38bdf8] text-white border-[#38bdf8]':'bg-[#1e293b] text-white border-[#334155] hover:bg-[#334155]'}`}
                    >Individual</button>
                    <button
                      onClick={() => {
                        setGameType("team");
                        const first = teamSports[0];
                        if (first) setActiveSportName(first.name);
                      }}
                      className={`px-3 py-2 rounded border transition-colors ${gameType==='team' ? 'bg-[#38bdf8] text-white border-[#38bdf8]':'bg-[#1e293b] text-white border-[#334155] hover:bg-[#334155]'}`}
                    >Team</button>
                  </div>
                </div>
                <div className="border border-[#334155] rounded-lg p-3 bg-[#0f172a]">
                  <div className="text-sm text-[#94a3b8] mb-2">Select Sport</div>
                  <div className="flex flex-wrap gap-2">
                    {(gameType==='individual' ? individualSports : teamSports).map((s) => {
                      const idx = s.name === activeSportName ? 0 : 1; // dummy for styling
                      return (
                        <button
                          key={s.name}
                          onClick={() => setActiveSportName(s.name)}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${s.name===activeSportName? 'bg-[#fbbf24] text-[#0f172a] border-[#fbbf24] font-semibold':'bg-[#1e293b] text-white border-[#334155] hover:bg-[#334155]'}`}
                        >{s.name}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {/* Apply for Coach button - show when player has no coach for active sport */}
            {activeProfile && !activeProfile.coach && activeSportName && (
              <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">No Coach Assigned</div>
                  <div className="text-xs text-[#94a3b8]">Apply to a coach for {activeSportName}</div>
                </div>
                <div className="flex gap-2">
                  {/* Quick Demo Button - Auto-applies to first available coach */}
                  <button
                    onClick={async () => {
                      try {
                        // Find sport ID
                        let sport = available.find(s => s.name === activeSportName);
                        if (!sport) {
                          sport = sports.find(s => s.name === activeSportName);
                        }
                        if (!sport) {
                          sport = available.find(s => s.name?.toLowerCase() === activeSportName?.toLowerCase()) ||
                                  sports.find(s => s.name?.toLowerCase() === activeSportName?.toLowerCase());
                        }
                        if (sport && sport.id) {
                          // Get coaches for this sport
                          const coachesRes = await getCoachesBySport(sport.id);
                          const coachesData = Array.isArray(coachesRes.data) 
                            ? coachesRes.data 
                            : (coachesRes.data?.results || coachesRes.data?.data || []);
                          
                          if (coachesData.length > 0) {
                            // Auto-apply to first available coach
                            const firstCoach = coachesData[0];
                            await requestCoach({ coachId: firstCoach.coach_id, sportId: sport.id });
                            alert(`✅ Application sent to ${firstCoach.user?.username || 'coach'}!`);
                            window.location.reload();
                          } else {
                            alert('No coaches available for this sport');
                          }
                        } else {
                          alert(`Sport "${activeSportName}" not found.`);
                        }
                      } catch (e) {
                        console.error('Error in quick apply:', e);
                        alert(e?.response?.data?.detail || 'Failed to send application');
                      }
                    }}
                    className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white font-semibold px-4 py-2 rounded-lg transition-colors flex-1"
                  >
                    <UserPlus size={18} />
                    Quick Apply (Demo)
                  </button>
                  
                  {/* Regular Button - Shows modal with coach list */}
                  <button
                    onClick={async () => {
                      setShowApplyCoachModal(true);
                      setLoadingCoaches(true);
                      try {
                        // Try to find sport from available sports first (from dashboard data)
                        let sport = available.find(s => s.name === activeSportName);
                        // If not found, try from the sports list
                        if (!sport) {
                          sport = sports.find(s => s.name === activeSportName);
                        }
                        // If still not found, try case-insensitive match
                        if (!sport) {
                          sport = available.find(s => s.name?.toLowerCase() === activeSportName?.toLowerCase()) ||
                                  sports.find(s => s.name?.toLowerCase() === activeSportName?.toLowerCase());
                        }
                        if (sport && sport.id) {
                          const coachesRes = await getCoachesBySport(sport.id);
                          // Handle different response structures
                          const coachesData = Array.isArray(coachesRes.data) 
                            ? coachesRes.data 
                            : (coachesRes.data?.results || coachesRes.data?.data || []);
                          setAvailableCoaches(coachesData);
                        } else {
                          console.error('Sport not found:', activeSportName, 'Available:', available, 'Sports:', sports);
                          alert(`Sport "${activeSportName}" not found. Please try again.`);
                          setShowApplyCoachModal(false);
                        }
                      } catch (e) {
                        console.error('Error loading coaches:', e);
                        alert(e?.response?.data?.detail || 'Failed to load coaches');
                      } finally {
                        setLoadingCoaches(false);
                      }
                    }}
                    className="flex items-center gap-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-semibold px-4 py-2 rounded-lg transition-colors flex-1"
                  >
                    <UserPlus size={18} />
                    Choose Coach
                  </button>
                </div>
              </div>
            )}

            {/* Header: summary boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
                <div className="text-xs text-[#94a3b8]">Achievements</div>
                <div className="text-2xl font-semibold text-[#fbbf24]">{activeProfile?.achievements?.length || 0}</div>
                <div className="text-xs text-[#94a3b8]">Recent 10
                </div>
              </div>
              <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
                <div className="text-xs text-[#94a3b8]">Attendance</div>
                <div className="text-2xl font-semibold text-[#10b981]">{activeProfile?.attendance?.attended || 0}/{activeProfile?.attendance?.total_sessions || 0}</div>
                <div className="text-xs text-[#94a3b8]">Sessions attended</div>
              </div>
              <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
                <div className="text-xs text-[#94a3b8]">Career Score</div>
                <div className="text-2xl font-semibold text-[#38bdf8]">{Math.round(activeProfile?.career_score || 0)}</div>
                <div className="text-xs text-[#94a3b8]">{activeProfile?.sport || '-'} profile</div>
              </div>
            </div>

            {/* Leaderboard (sport selector moved to top) */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-white">Leaderboard</div>
                {activeProfile && <MetricSelector profile={activeProfile} />}
              </div>
              {activeProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-[#334155] rounded-lg p-3 bg-[#0f172a]">
                    <div className="text-sm text-[#94a3b8] mb-2">Your stats ({activeProfile.sport})</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(activeProfile.stats || {}).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between border border-[#334155] rounded px-2 py-1">
                          <span className="text-[#94a3b8]">{k.replaceAll('_',' ')}</span>
                          <span className="font-medium text-white">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border border-[#334155] rounded-lg p-3 bg-[#0f172a]">
                    <div className="text-sm text-[#94a3b8] mb-2">Your rank: {metric.replaceAll('_',' ')}</div>
                    <div className="text-3xl font-semibold text-[#fbbf24]">#{(activeProfile?.ranks?.[metric]) || '-'}</div>
                    <div className="text-xs text-[#94a3b8]">out of {activeProfile?.ranks?.total_players || '-'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[#94a3b8]">No sport profiles found.</div>
              )}
            </div>

            {/* Performance chart */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-white">Performance (weekly)</div>
                <div className="text-xs text-[#94a3b8]">Last {data?.performance?.series?.length || 0} weeks</div>
              </div>
              {performancePoints?.points?.length ? (
                <div className="overflow-x-auto">
                  <svg width={performancePoints.width} height={performancePoints.height}>
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      points={performancePoints.points.map(p => p.join(",")).join(" ")}
                    />
                    {performancePoints.points.map((p, i) => (
                      <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fbbf24" />
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="text-sm text-[#94a3b8]">No performance data yet.</div>
              )}
            </div>

            {/* Achievements for active sport */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
              <div className="font-semibold mb-2 text-white">Achievements</div>
              {activeProfile?.achievements?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeProfile.achievements.map((a, idx) => (
                    <div key={idx} className="border border-[#334155] rounded-lg p-3 bg-[#0f172a]">
                      <div className="text-sm font-medium text-white">{a.title}</div>
                      <div className="text-xs text-[#94a3b8]">{a.tournament} • {a.date}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[#94a3b8]">No achievements yet.</div>
              )}
            </div>

            {/* AI Actions */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-white">AI Insights</div>
              <div className="text-xs text-[#94a3b8]">Experimental</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={aiLoading}
                onClick={async () => {
                  try {
                    setAiLoading(true); setAiResult("");
                    const res = await api.post('/api/predict-player/', { /* put minimal features here if needed */ });
                    setAiResult(JSON.stringify(res.data));
                  } catch (e) {
                    setAiResult(e?.response?.data?.error || 'Prediction failed');
                  } finally {
                    setAiLoading(false);
                  }
                }}
                className="px-3 py-2 rounded border border-[#334155] bg-[#0f172a] text-white hover:bg-[#1e293b] transition-colors disabled:opacity-50"
              >Predict Start</button>
              <button
                disabled={aiLoading}
                onClick={async () => {
                  try {
                    setAiLoading(true); setAiResult("");
                    const res = await api.post('/api/player-insight/', { player_id: data?.player?.id, context: `sport=${activeSportName}` });
                    setAiResult(res.data?.insight || '');
                  } catch (e) {
                    setAiResult(e?.response?.data?.error || 'Insight failed');
                  } finally {
                    setAiLoading(false);
                  }
                }}
                className="px-3 py-2 rounded border border-[#334155] bg-[#0f172a] text-white hover:bg-[#1e293b] transition-colors disabled:opacity-50"
              >Get Insight</button>
            </div>
            {!!aiResult && (
              <div className="mt-3 text-sm text-white bg-[#0f172a] border border-[#334155] rounded-lg p-3 whitespace-pre-wrap">{aiResult}</div>
            )}
            </div>
          </div>
        )}

        {/* Tournaments Section */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-[#334155] mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy size={24} /> My Tournaments
            </h2>
          </div>
          <div className="space-y-3">
            {tournaments.length > 0 ? (
              tournaments.map(tournament => (
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
                      
                      {/* Leaderboard */}
                      {tournamentDetails[tournament.id].leaderboard && (
                        <div>
                          <h3 className="text-sm font-semibold text-white mb-2">Leaderboard</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {tournamentDetails[tournament.id].leaderboard.top_scorer && (
                              <div className="bg-[#1e293b] p-3 rounded border border-[#334155]">
                                <div className="text-xs text-[#94a3b8] mb-1">Top Scorer</div>
                                <div className="text-sm font-bold text-white">
                                  {tournamentDetails[tournament.id].leaderboard.top_scorer?.player__user__username || 'N/A'}
                                </div>
                              </div>
                            )}
                            {tournamentDetails[tournament.id].leaderboard.most_wickets && (
                              <div className="bg-[#1e293b] p-3 rounded border border-[#334155]">
                                <div className="text-xs text-[#94a3b8] mb-1">Most Wickets</div>
                                <div className="text-sm font-bold text-white">
                                  {tournamentDetails[tournament.id].leaderboard.most_wickets?.player__user__username || 'N/A'}
                                </div>
                              </div>
                            )}
                            {tournamentDetails[tournament.id].leaderboard.most_mom && (
                              <div className="bg-[#1e293b] p-3 rounded border border-[#334155]">
                                <div className="text-xs text-[#94a3b8] mb-1">Most MoM</div>
                                <div className="text-sm font-bold text-white">
                                  {tournamentDetails[tournament.id].leaderboard.most_mom?.man_of_the_match__user__username || 'N/A'}
                                </div>
                              </div>
                            )}
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
              ))
            ) : (
              <div className="text-sm text-[#94a3b8] text-center py-4">No tournaments found for your teams</div>
            )}
          </div>
        </div>
      </div>

      {/* Apply for Coach Modal */}
      {showApplyCoachModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={() => setShowApplyCoachModal(false)}>
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Apply for Coach</h3>
                <button onClick={() => setShowApplyCoachModal(false)} className="text-[#94a3b8] hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="text-sm text-[#94a3b8] mb-4">
                Select a coach to apply for {activeSportName}
              </div>
              {loadingCoaches ? (
                <div className="text-center py-8 text-[#94a3b8]">Loading coaches...</div>
              ) : !Array.isArray(availableCoaches) || availableCoaches.length === 0 ? (
                <div className="text-center py-8 text-[#94a3b8]">No coaches available for this sport</div>
              ) : (
                <div className="space-y-3">
                  {availableCoaches.map((coach) => (
                    <div key={coach.id} className="bg-[#0f172a] border border-[#334155] rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{coach.user?.username || 'Unknown'}</div>
                        <div className="text-xs text-[#94a3b8]">Coach ID: {coach.coach_id}</div>
                        {coach.experience > 0 && (
                          <div className="text-xs text-[#94a3b8]">Experience: {coach.experience} years</div>
                        )}
                        {coach.specialization && (
                          <div className="text-xs text-[#94a3b8]">Specialization: {coach.specialization}</div>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            // Try to find sport from available sports first
                            let sport = available.find(s => s.name === activeSportName);
                            if (!sport) {
                              sport = sports.find(s => s.name === activeSportName);
                            }
                            if (!sport) {
                              sport = available.find(s => s.name?.toLowerCase() === activeSportName?.toLowerCase()) ||
                                      sports.find(s => s.name?.toLowerCase() === activeSportName?.toLowerCase());
                            }
                            if (sport && sport.id) {
                              await requestCoach({ coachId: coach.coach_id, sportId: sport.id });
                              alert('Application sent successfully!');
                              setShowApplyCoachModal(false);
                              window.location.reload();
                            } else {
                              alert('Sport not found. Please try again.');
                            }
                          } catch (e) {
                            alert(e?.response?.data?.detail || 'Failed to send application');
                          }
                        }}
                        className="bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
