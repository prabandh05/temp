import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { listNotifications, acceptLinkRequest, rejectLinkRequest, listLinkRequests } from "../services/coach";
import { Bell, CheckCircle, XCircle } from "lucide-react";

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

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const [resp, notifsRes, linksRes] = await Promise.all([
          api.get("/api/dashboard/player/"),
          listNotifications().catch(() => ({ data: [] })),
          listLinkRequests().catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;
        const payload = resp.data;
        setData(payload);
        setNotifications(notifsRes.data || []);
        setLinkRequests(linksRes.data || []);
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
                        : `Player ${link.player?.user?.username || link.player?.username || 'Unknown'} requested you for ${link.sport?.name || 'sport'}`}
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
      </div>
    </div>
  );
}
