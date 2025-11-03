// frontend/src/services/coach.js
import api from './api';

/**
 * Fetches the initial data for the coach dashboard.
 */
export const getDashboardData = () => {
  return api.get('/api/dashboard/coach/');
};

/**
 * Fetches a list of all available sports.
 */
export const getSports = () => {
  return api.get('/api/sports/');
};

/**
 * Creates a new coaching session.
 * @param {{sport: number, title: string, notes: string}} sessionData - The data for the new session.
 */
export const createSession = (sessionData) => {
  return api.post('/api/sessions/', sessionData);
};

/**
 * Downloads the CSV template for a given session.
 * @param {number} sessionId - The ID of the session.
 */
export const getSessionCsvTemplate = async (sessionId) => {
  const response = await api.get(`/api/sessions/${sessionId}/csv-template/`, {
    responseType: 'blob', // Important to handle file download
  });
  return response.data;
};

/**
 * Uploads a CSV file with attendance data for a session.
 * @param {number} sessionId - The ID of the session.
 * @param {File} file - The CSV file to upload.
 */
export const uploadSessionCsv = (sessionId, file) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(`/api/sessions/${sessionId}/upload-csv/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Fetches the coach's own profile data.
 */
export const getCoachProfile = () => {
  return api.get('/api/coach/profile/');
};

/**
 * Updates the coach's profile data.
 * @param {object} profileData - The updated profile data.
 */
export const updateCoachProfile = (profileData) => {
  return api.patch('/api/coach/profile/', profileData);
};

/**
 * Sends an invitation to a player (by player_id) for a specific sport (sport_id).
 * Backend requires: { player_id, sport_id }
 */
export const invitePlayer = ({ playerId, sportId }) => {
  return api.post('/api/coach-player-links/invite/', { player_id: playerId, sport_id: sportId });
};

/**
 * Create a team proposal with selected player IDs under a manager for a sport.
 * Body: { manager_id, sport_id, team_name, player_ids: number[] }
 */
export const createTeamProposal = ({ managerId, sportId, teamName, playerIds }) => {
  return api.post('/api/team-proposals/', {
    manager_id: managerId,
    sport_id: sportId,
    team_name: teamName,
    player_ids: playerIds,
  });
};

/**
 * List team proposals (manager sees own; admin sees all; coach can fetch but will be unauthorized for list here).
 */
export const listTeamProposals = () => {
  return api.get('/api/team-proposals/');
};

/** Approve a team proposal (manager). */
export const approveTeamProposal = (proposalId) => {
  return api.post(`/api/team-proposals/${proposalId}/approve/`);
};

/** Reject a team proposal (manager). */
export const rejectTeamProposal = (proposalId, remarks) => {
  return api.post(`/api/team-proposals/${proposalId}/reject/`, { remarks });
};

/** List all teams (manager can filter client-side). */
export const listTeams = () => {
  return api.get('/api/teams/');
};

/** Create a tournament (manager). Body: { name, sport, start_date?, end_date?, location?, description? } */
export const createTournament = (payload) => {
  return api.post('/api/tournaments/', payload);
};

/** List tournaments (manager sees own). */
export const listTournaments = () => {
  return api.get('/api/tournaments/');
};

/** Add a team to a tournament. */
export const addTeamToTournament = (tournamentId, teamId) => {
  return api.post(`/api/tournaments/${tournamentId}/add-team/`, { team_id: teamId });
};

/** Create team assignment request (manager) */
export const createTeamAssignment = ({ coachId, teamId }) => {
  return api.post('/api/team-assignments/', { coach_id: coachId, team_id: teamId });
};

/** Coach accepts or rejects an assignment */
export const acceptTeamAssignment = (assignmentId) => {
  return api.post(`/api/team-assignments/${assignmentId}/accept/`);
};
export const rejectTeamAssignment = (assignmentId, remarks) => {
  return api.post(`/api/team-assignments/${assignmentId}/reject/`, { remarks });
};

/** List notifications for current user */
export const listNotifications = () => {
  return api.get('/api/notifications/');
};

/** Promotion requests (manager/admin) */
export const listPromotionRequests = () => {
  return api.get('/api/promotion/');
};
export const approvePromotionRequest = (id) => {
  return api.post(`/api/promotion/${id}/approve/`);
};
export const rejectPromotionRequest = (id, remarks) => {
  return api.post(`/api/promotion/${id}/reject/`, { remarks });
};
