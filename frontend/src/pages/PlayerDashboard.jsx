import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

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

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const resp = await api.get("/api/dashboard/player/");
        if (!mounted) return;
        const payload = resp.data;
        setData(payload);
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
    let options = [];
    if (sport === "cricket") options = ["strike_rate", "average", "runs", "wickets"];
    if (sport === "football") options = ["goals", "assists", "tackles"];
    if (sport === "basketball") options = ["points", "rebounds", "assists"];
    if (sport === "running") options = ["total_distance_km", "best_time_seconds"];
    if (!options.includes(metric) && options.length) setMetric(options[0]);
    return (
      <select
        value={metric}
        onChange={(e) => setMetric(e.target.value)}
        className="border rounded-md px-2 py-1 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o.replaceAll("_", " ")}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(v => !v)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200"
              aria-label="Open profile"
            >
              <span className="font-semibold">{data?.player?.user?.username?.[0]?.toUpperCase() || "P"}</span>
            </button>
            <div>
              <div className="font-semibold">{data?.player?.user?.username || "Player"}</div>
              <div className="text-xs text-gray-500">ID: {data?.player?.player_id || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { localStorage.clear(); window.location.href = "/"; }}
              className="text-sm text-red-600 hover:text-red-700"
            >Logout</button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-20">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl p-4 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold">
                {data?.player?.user?.username?.[0]?.toUpperCase() || "P"}
              </div>
              <div>
                <div className="font-semibold">{data?.player?.user?.username}</div>
                <div className="text-xs text-gray-500">Player ID: {data?.player?.user?.id}</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="font-semibold">Profile</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">Team</div>
                <div>{activeProfile?.team || "-"}</div>
                <div className="text-gray-500">Coach</div>
                <div>{activeProfile?.coach || "-"}</div>
                <div className="text-gray-500">Primary Sport</div>
                <div>{activeProfile?.sport || (profiles[0]?.sport || "-")}</div>
              </div>
              <div className="pt-3 border-t">
                <div className="font-semibold mb-2">Settings</div>
                <button className="block w-full text-left py-2 px-2 rounded hover:bg-gray-50">Change password</button>
                <button onClick={() => { localStorage.clear(); window.location.href = "/"; }} className="block w-full text-left py-2 px-2 rounded hover:bg-gray-50 text-red-600">Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading && <div className="text-center py-10">Loading...</div>}
        {error && !loading && (
          <div className="text-center py-10 text-red-600">{error}</div>
        )}
        {!loading && !error && data && (
          <div className="space-y-6">
            {/* Global sport type & sport selection */}
            <div className="bg-white border rounded-xl p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-2">Game Type</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setGameType("individual");
                        const first = individualSports[0];
                        if (first) setActiveSportName(first.name);
                      }}
                      className={`px-3 py-2 rounded border ${gameType==='individual' ? 'bg-gray-900 text-white border-gray-900':'bg-white'}`}
                    >Individual</button>
                    <button
                      onClick={() => {
                        setGameType("team");
                        const first = teamSports[0];
                        if (first) setActiveSportName(first.name);
                      }}
                      className={`px-3 py-2 rounded border ${gameType==='team' ? 'bg-gray-900 text-white border-gray-900':'bg-white'}`}
                    >Team</button>
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-2">Select Sport</div>
                  <div className="flex flex-wrap gap-2">
                    {(gameType==='individual' ? individualSports : teamSports).map((s) => {
                      const idx = s.name === activeSportName ? 0 : 1; // dummy for styling
                      return (
                        <button
                          key={s.name}
                          onClick={() => setActiveSportName(s.name)}
                          className={`px-3 py-1 rounded-full text-sm border ${s.name===activeSportName? 'bg-gray-900 text-white border-gray-900':'bg-white hover:bg-gray-50'}`}
                        >{s.name}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {/* Header: summary boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border rounded-xl p-4">
                <div className="text-xs text-gray-500">Achievements</div>
                <div className="text-2xl font-semibold">{activeProfile?.achievements?.length || 0}</div>
                <div className="text-xs text-gray-500">Recent 10
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="text-xs text-gray-500">Attendance</div>
                <div className="text-2xl font-semibold">{activeProfile?.attendance?.attended || 0}/{activeProfile?.attendance?.total_sessions || 0}</div>
                <div className="text-xs text-gray-500">Sessions attended</div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="text-xs text-gray-500">Career Score</div>
                <div className="text-2xl font-semibold">{Math.round(activeProfile?.career_score || 0)}</div>
                <div className="text-xs text-gray-500">{activeProfile?.sport || '-'} profile</div>
              </div>
            </div>

            {/* Leaderboard (sport selector moved to top) */}
            <div className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Leaderboard</div>
                {activeProfile && <MetricSelector profile={activeProfile} />}
              </div>
              {activeProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-gray-500 mb-2">Your stats ({activeProfile.sport})</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(activeProfile.stats || {}).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between border rounded px-2 py-1">
                          <span className="text-gray-500">{k.replaceAll('_',' ')}</span>
                          <span className="font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-gray-500 mb-2">Your rank: {metric.replaceAll('_',' ')}</div>
                    <div className="text-3xl font-semibold">#{(activeProfile?.ranks?.[metric]) || '-'}</div>
                    <div className="text-xs text-gray-500">out of {activeProfile?.ranks?.total_players || '-'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No sport profiles found.</div>
              )}
            </div>

            {/* Performance chart */}
            <div className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Performance (weekly)</div>
                <div className="text-xs text-gray-500">Last {data?.performance?.series?.length || 0} weeks</div>
              </div>
              {performancePoints?.points?.length ? (
                <div className="overflow-x-auto">
                  <svg width={performancePoints.width} height={performancePoints.height}>
                    <polyline
                      fill="none"
                      stroke="#111827"
                      strokeWidth="2"
                      points={performancePoints.points.map(p => p.join(",")).join(" ")}
                    />
                    {performancePoints.points.map((p, i) => (
                      <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#111827" />
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No performance data yet.</div>
              )}
            </div>

            {/* Achievements for active sport */}
            <div className="bg-white border rounded-xl p-4">
              <div className="font-semibold mb-2">Achievements</div>
              {activeProfile?.achievements?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeProfile.achievements.map((a, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-gray-500">{a.tournament} • {a.date}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No achievements yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
