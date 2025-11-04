// frontend/src/services/admin.js
import api from './api';

/**
 * List all users (admin only)
 */
export const listUsers = () => {
  return api.get('/api/users/');
};

/**
 * Get user details by ID
 */
export const getUser = (userId) => {
  return api.get(`/api/users/${userId}/`);
};

/**
 * Delete a user (admin only)
 */
export const deleteUser = (userId) => {
  return api.delete(`/api/users/${userId}/`);
};

/**
 * Create a new user (admin only)
 */
export const createUser = (userData) => {
  return api.post('/api/users/', userData);
};

/**
 * Update user role or details (admin only)
 */
export const updateUser = (userId, userData) => {
  return api.patch(`/api/users/${userId}/`, userData);
};

/**
 * List all managers (filter users by role=manager)
 */
export const listManagers = async () => {
  const response = await api.get('/api/users/');
  // Filter users with manager role
  const managersData = response.data?.results || response.data || [];
  const managers = Array.isArray(managersData) 
    ? managersData.filter(u => u.role === 'manager')
    : [];
  return { data: managers };
};

/**
 * List manager-sport assignments
 */
export const listManagerSportAssignments = () => {
  return api.get('/api/manager-sport-assignments/');
};

/**
 * Assign manager to a sport
 */
export const assignManagerToSport = ({ managerId, sportId }) => {
  return api.post('/api/manager-sport-assignments/', {
    manager_id: managerId,
    sport_id: sportId,
  });
};

/**
 * Remove manager from a sport
 */
export const removeManagerFromSport = (assignmentId) => {
  return api.delete(`/api/manager-sport-assignments/${assignmentId}/`);
};

/**
 * List all promotion requests
 */
export const listPromotionRequests = () => {
  return api.get('/api/promotion/');
};

/**
 * Approve promotion request (admin can bypass manager checks)
 */
export const approvePromotionRequest = (requestId) => {
  return api.post(`/api/promotion/${requestId}/approve/`);
};

/**
 * Reject promotion request
 */
export const rejectPromotionRequest = (requestId, remarks = '') => {
  return api.post(`/api/promotion/${requestId}/reject/`, { remarks });
};

/**
 * List all sports
 */
export const getSports = () => {
  return api.get('/api/sports/');
};

/**
 * Create a new sport
 */
export const createSport = (sportData) => {
  return api.post('/api/sports/', sportData);
};

/**
 * List all tournaments
 */
export const listTournaments = () => {
  return api.get('/api/tournaments/');
};

/**
 * Create a tournament (admin can assign manager)
 */
export const createTournament = (tournamentData) => {
  return api.post('/api/tournaments/', tournamentData);
};

/**
 * List all team proposals
 */
export const listTeamProposals = () => {
  return api.get('/api/team-proposals/');
};

/**
 * Approve team proposal (admin can bypass)
 */
export const approveTeamProposal = (proposalId) => {
  return api.post(`/api/team-proposals/${proposalId}/approve/`);
};

/**
 * Reject team proposal
 */
export const rejectTeamProposal = (proposalId) => {
  return api.post(`/api/team-proposals/${proposalId}/reject/`);
};

/**
 * List all team assignments
 */
export const listTeamAssignments = () => {
  return api.get('/api/team-assignments/');
};

/**
 * Create team assignment (admin can bypass)
 */
export const createTeamAssignment = ({ teamId, coachId }) => {
  return api.post('/api/team-assignments/', {
    team_id: teamId,
    coach_id: coachId,
  });
};

/**
 * List all notifications
 */
export const listNotifications = () => {
  return api.get('/api/notifications/');
};

/**
 * Mark notification as read
 */
export const markNotificationRead = (notificationId) => {
  return api.patch(`/api/notifications/${notificationId}/`, { is_read: true });
};

