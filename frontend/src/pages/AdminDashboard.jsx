import React, { useEffect, useState } from "react";
import {
  Shield, Users, UserPlus, UserMinus, Trophy, TrendingUp, Settings,
  CheckCircle, XCircle, AlertCircle, Clock, X, Plus, Trash2, Award
} from "lucide-react";
import {
  listUsers,
  deleteUser,
  createUser,
  updateUser,
  listManagers,
  listManagerSportAssignments,
  assignManagerToSport,
  removeManagerFromSport,
  listPromotionRequests,
  approvePromotionRequest,
  rejectPromotionRequest,
  getSports,
  listTournaments,
  createTournament,
  listTeamProposals,
  approveTeamProposal,
  rejectTeamProposal,
  listTeamAssignments,
  createTeamAssignment,
  listNotifications,
} from "../services/admin";

// Modal Component
const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-2xl border border-[#334155] p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [sports, setSports] = useState([]);
  const [managerAssignments, setManagerAssignments] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showManagerAssignModal, setShowManagerAssignModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  
  // Form states
  const [userForm, setUserForm] = useState({ username: "", email: "", password: "", role: "player" });
  const [managerAssignForm, setManagerAssignForm] = useState({ managerId: "", sportId: "" });
  const [tournamentForm, setTournamentForm] = useState({ name: "", sport_id: "", manager_id: "", start_date: "", end_date: "" });

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [
        usersRes,
        managersRes,
        sportsRes,
        assignmentsRes,
        promotionsRes,
        tournamentsRes,
        proposalsRes,
        teamAssignmentsRes,
        notificationsRes,
      ] = await Promise.all([
        listUsers().catch(() => ({ data: { results: [] } })),
        listManagers().catch(() => ({ data: [] })),
        getSports().catch(() => ({ data: [] })),
        listManagerSportAssignments().catch(() => ({ data: [] })),
        listPromotionRequests().catch(() => ({ data: [] })),
        listTournaments().catch(() => ({ data: [] })),
        listTeamProposals().catch(() => ({ data: [] })),
        listTeamAssignments().catch(() => ({ data: [] })),
        listNotifications().catch(() => ({ data: [] })),
      ]);

      const usersData = usersRes.data?.results || usersRes.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
      setManagers(managersRes.data || []);
      setSports(sportsRes.data || []);
      setManagerAssignments(assignmentsRes.data || []);
      setPromotions(promotionsRes.data || []);
      setTournaments(tournamentsRes.data || []);
      setProposals(proposalsRes.data || []);
      setAssignments(teamAssignmentsRes.data || []);
      setNotifications(notificationsRes.data || []);
      setError("");
    } catch (err) {
      setError("Failed to load admin data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createUser(userForm);
      setShowUserModal(false);
      setUserForm({ username: "", email: "", password: "", role: "player" });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create user");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(userId);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete user");
    }
  };

  const handleAssignManager = async (e) => {
    e.preventDefault();
    try {
      await assignManagerToSport(managerAssignForm);
      setShowManagerAssignModal(false);
      setManagerAssignForm({ managerId: "", sportId: "" });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to assign manager");
    }
  };

  const handleRemoveManagerAssignment = async (assignmentId) => {
    if (!window.confirm("Remove manager from this sport?")) return;
    try {
      await removeManagerFromSport(assignmentId);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to remove assignment");
    }
  };


  const handleCreateTournament = async (e) => {
    e.preventDefault();
    try {
      await createTournament(tournamentForm);
      setShowTournamentModal(false);
      setTournamentForm({ name: "", sport_id: "", manager_id: "", start_date: "", end_date: "" });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create tournament");
    }
  };

  const handleApprovePromotion = async (promotionId) => {
    try {
      await approvePromotionRequest(promotionId);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to approve promotion");
    }
  };

  const handleRejectPromotion = async (promotionId) => {
    const remarks = prompt("Rejection remarks (optional):");
    try {
      await rejectPromotionRequest(promotionId, remarks || "");
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reject promotion");
    }
  };

  const handleApproveProposal = async (proposalId) => {
    try {
      await approveTeamProposal(proposalId);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to approve proposal");
    }
  };

  const handleRejectProposal = async (proposalId) => {
    try {
      await rejectTeamProposal(proposalId);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reject proposal");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <div className="bg-[#1e293b] border-b border-[#334155] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-lg">
                <Shield className="w-6 h-6 text-[#0f172a]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-[#94a3b8]">Manage users, managers, and tournaments</p>
              </div>
            </div>
            <button
              onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
              className="px-4 py-2 bg-[#dc2626] hover:bg-[#b91c1c] rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-[#38bdf8]" />
              <span className="text-2xl font-bold text-[#fbbf24]">{users.length}</span>
            </div>
            <div className="text-sm text-[#94a3b8]">Total Users</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-8 h-8 text-[#10b981]" />
              <span className="text-2xl font-bold text-[#fbbf24]">{managers.length}</span>
            </div>
            <div className="text-sm text-[#94a3b8]">Managers</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-8 h-8 text-[#fbbf24]" />
              <span className="text-2xl font-bold text-[#fbbf24]">{tournaments.length}</span>
            </div>
            <div className="text-sm text-[#94a3b8]">Tournaments</div>
          </div>
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-[#8b5cf6]" />
              <span className="text-2xl font-bold text-[#fbbf24]">{promotions.length}</span>
            </div>
            <div className="text-sm text-[#94a3b8]">Pending Promotions</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Management */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-[#38bdf8]" />
                User Management
              </h2>
              <button
                onClick={() => setShowUserModal(true)}
                className="px-4 py-2 bg-[#38bdf8] hover:bg-[#0ea5e9] rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create User
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.slice(0, 10).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                  <div>
                    <div className="font-medium">{user.username}</div>
                    <div className="text-xs text-[#94a3b8]">{user.email} • {user.role}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Manager-Sport Assignments */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#10b981]" />
                Manager-Sport Assignments
              </h2>
              <button
                onClick={() => setShowManagerAssignModal(true)}
                className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Assign
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {managerAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                  <div>
                    <div className="font-medium">{assignment.manager?.user?.username || "Unknown"}</div>
                    <div className="text-xs text-[#94a3b8]">{assignment.sport?.name || "Unknown Sport"}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveManagerAssignment(assignment.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Promotion Requests */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#fbbf24]" />
                Promotion Requests
              </h2>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {promotions.filter(p => p.status === "pending").map((promo) => (
                <div key={promo.id} className="p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{promo.player?.user?.username || "Unknown"}</div>
                      <div className="text-xs text-[#94a3b8]">Sport: {promo.sport?.name || "Unknown"}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprovePromotion(promo.id)}
                        className="p-2 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectPromotion(promo.id)}
                        className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Proposals */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-[#8b5cf6]" />
                Team Proposals
              </h2>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {proposals.filter(p => p.status === "pending").map((proposal) => (
                <div key={proposal.id} className="p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{proposal.team_name}</div>
                      <div className="text-xs text-[#94a3b8]">Coach: {proposal.coach?.user?.username || "Unknown"}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveProposal(proposal.id)}
                        className="p-2 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectProposal(proposal.id)}
                        className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sports Management (Read-only) */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#fbbf24]" />
                Sports
              </h2>
              <div className="text-xs text-[#94a3b8]">(Sports are managed manually in database)</div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sports.length > 0 ? sports.map((sport) => (
                <div key={sport.id} className="p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                  <div className="font-medium">{sport.name}</div>
                  <div className="text-xs text-[#94a3b8]">Type: {sport.sport_type}</div>
                </div>
              )) : (
                <div className="text-sm text-[#94a3b8] text-center py-4">No sports found</div>
              )}
            </div>
          </div>

          {/* Tournaments */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#fbbf24]" />
                Tournaments
              </h2>
              <button
                onClick={() => setShowTournamentModal(true)}
                className="px-4 py-2 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Tournament
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                  <div className="font-medium">{tournament.name}</div>
                  <div className="text-xs text-[#94a3b8]">{tournament.sport?.name || "Unknown Sport"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Create User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">Username</label>
            <input
              type="text"
              required
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#38bdf8]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">Email</label>
            <input
              type="email"
              required
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#38bdf8]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">Password</label>
            <input
              type="password"
              required
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#38bdf8]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">Role</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#38bdf8]"
            >
              <option value="player">Player</option>
              <option value="coach">Coach</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-[#38bdf8] hover:bg-[#0ea5e9] rounded-lg transition-colors font-medium"
          >
            Create User
          </button>
        </form>
      </Modal>

      {/* Assign Manager Modal */}
      <Modal isOpen={showManagerAssignModal} onClose={() => setShowManagerAssignModal(false)} title="Assign Manager to Sport">
        <form onSubmit={handleAssignManager} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">Manager</label>
            <select
              required
              value={managerAssignForm.managerId}
              onChange={(e) => setManagerAssignForm({ ...managerAssignForm, managerId: e.target.value })}
              className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
            >
              <option value="">Select Manager</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.username} ({m.manager_id || "N/A"})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">Sport</label>
            <select
              required
              value={managerAssignForm.sportId}
              onChange={(e) => setManagerAssignForm({ ...managerAssignForm, sportId: e.target.value })}
              className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#10b981]"
            >
              <option value="">Select Sport</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-[#10b981] hover:bg-[#059669] rounded-lg transition-colors font-medium"
          >
            Assign Manager
          </button>
        </form>
      </Modal>


      {/* Create Tournament Modal */}
      <Modal isOpen={showTournamentModal} onClose={() => setShowTournamentModal(false)} title="Create Tournament">
        <form onSubmit={handleCreateTournament} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">Tournament Name</label>
            <input
              type="text"
              required
              value={tournamentForm.name}
              onChange={(e) => setTournamentForm({ ...tournamentForm, name: e.target.value })}
              className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#fbbf24]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">Sport</label>
            <select
              required
              value={tournamentForm.sport_id}
              onChange={(e) => setTournamentForm({ ...tournamentForm, sport_id: e.target.value })}
              className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#fbbf24]"
            >
              <option value="">Select Sport</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">Manager (Optional)</label>
            <select
              value={tournamentForm.manager_id}
              onChange={(e) => setTournamentForm({ ...tournamentForm, manager_id: e.target.value })}
              className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#fbbf24]"
            >
              <option value="">No Manager (Admin will manage)</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.username}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-2">Start Date</label>
              <input
                type="date"
                value={tournamentForm.start_date}
                onChange={(e) => setTournamentForm({ ...tournamentForm, start_date: e.target.value })}
                className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#fbbf24]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-2">End Date</label>
              <input
                type="date"
                value={tournamentForm.end_date}
                onChange={(e) => setTournamentForm({ ...tournamentForm, end_date: e.target.value })}
                className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#fbbf24]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f172a] rounded-lg transition-colors font-medium"
          >
            Create Tournament
          </button>
        </form>
      </Modal>
    </div>
  );
}
