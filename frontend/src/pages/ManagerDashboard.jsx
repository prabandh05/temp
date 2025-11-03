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

  useEffect(() => {
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
        const t = await listTeams();
        setTeams(t.data || []);
      } catch {}
      try {
        const tt = await listTournaments();
        setTournaments(tt.data || []);
      } catch {}
      try {
        const pr = await listPromotionRequests();
        setPromotions(pr.data || []);
      } catch {}
    })();
  }, []);

  const sportOptions = useMemo(() => sports.map(s => ({ value: s.id, label: s.name })), [sports]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Manager Dashboard</h1>
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        </div>

        {/* Team Proposals */}
        <section className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Team Proposals</div>
          </div>
          <div className="space-y-3">
            {proposals.length ? proposals.map(pr => (
              <div key={pr.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{pr.team_name}</div>
                  <div className="text-xs text-gray-500">{pr.sport?.name || "Sport"} • Coach: {pr.coach?.user?.username || pr.coach?.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">{pr.status}</span>
                  {pr.status === 'pending' && (
                    <>
                      <button
                        onClick={async () => {
                          try {
                            await approveTeamProposal(pr.id);
                            const p = await listTeamProposals();
                            setProposals(p.data || []);
                          } catch (e) {
                            setError(e?.response?.data?.detail || 'Failed to approve');
                          }
                        }}
                        className="px-3 py-1 text-sm rounded bg-gray-900 text-white"
                      >Approve</button>
                      <button
                        onClick={async () => {
                          try {
                            await rejectTeamProposal(pr.id, 'Not suitable');
                            const p = await listTeamProposals();
                            setProposals(p.data || []);
                          } catch (e) {
                            setError(e?.response?.data?.detail || 'Failed to reject');
                          }
                        }}
                        className="px-3 py-1 text-sm rounded border"
                      >Reject</button>
                    </>
                  )}
                </div>
              </div>
            )) : (
              <div className="text-sm text-gray-500">No proposals</div>
            )}
          </div>
        </section>

        {/* Assign Coach to Team */}
        <section className="bg-white border rounded-xl p-4">
          <div className="font-semibold mb-3">Assign Coach to Team</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={assignment.teamId}
              onChange={(e) => setAssignment(v => ({ ...v, teamId: e.target.value }))}
              className="p-2 border rounded"
            >
              <option value="">Select team</option>
              {teams.map(tm => (
                <option key={tm.id} value={tm.id}>{tm.name}</option>
              ))}
            </select>
            <input
              placeholder="Coach ID (e.g., C2500001)"
              value={assignment.coachId}
              onChange={(e) => setAssignment(v => ({ ...v, coachId: e.target.value }))}
              className="p-2 border rounded"
            />
            <button
              onClick={async () => {
                try {
                  await createTeamAssignment({ teamId: Number(assignment.teamId), coachId: assignment.coachId });
                  alert('Assignment request sent');
                  setAssignment({ teamId: "", coachId: "" });
                } catch (e) {
                  setError(e?.response?.data?.detail || 'Failed to assign coach');
                }
              }}
              className="px-4 py-2 rounded bg-gray-900 text-white"
            >Assign</button>
          </div>
        </section>

        {/* Promotion Requests */}
        <section className="bg-white border rounded-xl p-4">
          <div className="font-semibold mb-3">Promotion Requests</div>
          <div className="space-y-3">
            {promotions.length ? promotions.map(p => (
              <div key={p.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.user}</div>
                  <div className="text-xs text-gray-500">Sport: {p.sport} • Status: {p.status}</div>
                </div>
                {p.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await approvePromotionRequest(p.id);
                          const pr = await listPromotionRequests();
                          setPromotions(pr.data || []);
                        } catch (e) {
                          setError(e?.response?.data?.detail || 'Failed to approve promotion');
                        }
                      }}
                      className="px-3 py-1 text-sm rounded bg-gray-900 text-white"
                    >Approve</button>
                    <button
                      onClick={async () => {
                        try {
                          await rejectPromotionRequest(p.id, 'Not approved');
                          const pr = await listPromotionRequests();
                          setPromotions(pr.data || []);
                        } catch (e) {
                          setError(e?.response?.data?.detail || 'Failed to reject promotion');
                        }
                      }}
                      className="px-3 py-1 text-sm rounded border"
                    >Reject</button>
                  </div>
                )}
              </div>
            )) : (
              <div className="text-sm text-gray-500">No promotion requests</div>
            )}
          </div>
        </section>

        {/* Create Tournament */}
        <section className="bg-white border rounded-xl p-4">
          <div className="font-semibold mb-3">Create Tournament</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              placeholder="Tournament name"
              value={form.name}
              onChange={(e) => setForm(v => ({ ...v, name: e.target.value }))}
              className="p-2 border rounded"
            />
            <select
              value={form.sportId}
              onChange={(e) => setForm(v => ({ ...v, sportId: e.target.value }))}
              className="p-2 border rounded"
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
              className="p-2 border rounded"
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
              className="px-4 py-2 rounded bg-gray-900 text-white"
            >{creating ? 'Creating...' : 'Create'}</button>
          </div>
        </section>

        {/* Tournaments */}
        <section className="bg-white border rounded-xl p-4">
          <div className="font-semibold mb-3">Tournaments</div>
          <div className="space-y-3">
            {tournaments.length ? tournaments.map(t => (
              <div key={t.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.sport?.name || 'Sport'} • {t.location || '-'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={assignForm.tournamentId === String(t.id) ? assignForm.teamId : ''}
                      onChange={(e) => setAssignForm({ tournamentId: String(t.id), teamId: e.target.value })}
                      className="p-1 border rounded text-sm"
                    >
                      <option value="">Add team...</option>
                      {teams.filter(tm => tm.sport === t.sport?.id).map(tm => (
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
                        } catch (e) {
                          setError(e?.response?.data?.detail || 'Failed to add team');
                        }
                      }}
                      className="px-3 py-1 text-sm border rounded"
                    >Add</button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-sm text-gray-500">No tournaments</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
