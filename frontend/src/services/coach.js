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

/** Get manager's assigned sports */
export const getManagerSports = () => {
  return api.get('/api/manager-sport-assignments/');
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

  // Don't set Content-Type - let axios set it automatically with boundary for FormData
  // The interceptor will automatically add the Authorization header
  return api.post(`/api/sessions/${sessionId}/upload-csv/`, formData);
};

/** List coaching sessions */
export const listSessions = () => {
  return api.get('/api/sessions/');
};

/** End a session (mark as inactive and optionally upload final attendance CSV) */
export const endSession = (sessionId, file = null) => {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  
  // Don't set Content-Type - let axios set it automatically with boundary for FormData
  // The interceptor will automatically add the Authorization header
  return api.post(`/api/sessions/${sessionId}/end-session/`, formData);
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

/** List matches for a tournament. */
export const listTournamentMatches = (tournamentId) => {
  return api.get(`/api/tournaments/${tournamentId}/matches/`);
};

/** Create a tournament match. */
export const createTournamentMatch = (payload) => {
  return api.post('/api/tournament-matches/', payload);
};

/** Update a tournament match. */
export const updateTournamentMatch = (matchId, payload) => {
  return api.patch(`/api/tournament-matches/${matchId}/`, payload);
};

/** List all tournament matches. */
export const listAllTournamentMatches = () => {
  return api.get('/api/tournament-matches/');
};

/** Start tournament (change status to ongoing) */
export const startTournament = (tournamentId) => {
  return api.post(`/api/tournaments/${tournamentId}/start/`);
};

/** End tournament (update status, create achievements) */
export const endTournament = (tournamentId) => {
  return api.post(`/api/tournaments/${tournamentId}/end/`);
};

/** Get points table for tournament */
export const getPointsTable = (tournamentId) => {
  return api.get(`/api/tournaments/${tournamentId}/points-table/`);
};

/** Get tournament leaderboard */
export const getTournamentLeaderboard = (tournamentId) => {
  return api.get(`/api/tournaments/${tournamentId}/leaderboard/`);
};

/** Start a cricket match */
export const startMatch = (matchId, { toss_won_by_team_id, batting_first_team_id }) => {
  return api.post(`/api/tournament-matches/${matchId}/start/`, {
    toss_won_by_team_id,
    batting_first_team_id
  });
};

/** Set batsmen for match */
export const setBatsmen = (matchId, { batsman1_id, batsman2_id, current_striker_id }) => {
  return api.post(`/api/tournament-matches/${matchId}/set-batsmen/`, {
    batsman1_id,
    batsman2_id,
    current_striker_id
  });
};

/** Set bowler for match */
export const setBowler = (matchId, { bowler_id }) => {
  return api.post(`/api/tournament-matches/${matchId}/set-bowler/`, {
    bowler_id
  });
};

/** Add runs to match score */
export const addScore = (matchId, { runs }) => {
  return api.post(`/api/tournament-matches/${matchId}/score/`, { runs });
};

/** Add wicket to match */
export const addWicket = (matchId, { next_batsman_id }) => {
  return api.post(`/api/tournament-matches/${matchId}/wicket/`, { next_batsman_id });
};

/** Switch innings */
export const switchInnings = (matchId) => {
  return api.post(`/api/tournament-matches/${matchId}/switch-innings/`);
};

/** Complete match */
export const completeMatch = (matchId, { man_of_the_match_player_id }) => {
  return api.post(`/api/tournament-matches/${matchId}/complete/`, { man_of_the_match_player_id });
};

/** Cancel match */
export const cancelMatch = (matchId) => {
  return api.post(`/api/tournament-matches/${matchId}/cancel/`);
};

/** Get match state */
export const getMatchState = (matchId) => {
  return api.get(`/api/tournament-matches/${matchId}/state/`);
};

/** Get player stats for match */
export const getMatchPlayerStats = (matchId) => {
  return api.get(`/api/tournament-matches/${matchId}/player-stats/`);
};

/** List team assignment requests */
export const listTeamAssignments = () => {
  return api.get('/api/team-assignments/');
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

/** Accept coach-player link request */
export const acceptLinkRequest = (linkId) => {
  return api.post(`/api/coach-player-links/${linkId}/accept/`);
};

/** Reject coach-player link request */
export const rejectLinkRequest = (linkId) => {
  return api.post(`/api/coach-player-links/${linkId}/reject/`);
};

/** List coach-player link requests */
export const listLinkRequests = () => {
  return api.get('/api/coach-player-links/');
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

/** Manager Team Management */
export const createTeam = ({ name, sport_id, sportId, coach_id, coachId, managerId }) => {
  // Accept both sport_id and sportId for compatibility
  const sportIdValue = sport_id || sportId;
  const coachIdValue = coach_id || coachId;
  return api.post('/api/teams/', {
    name,
    sport_id: sportIdValue, // Backend expects sport_id
    coach_id: coachIdValue, // Backend expects coach_id
    // managerId is handled automatically by backend based on logged-in user
  });
};

export const getTeamDetails = (teamId) => {
  return api.get(`/api/teams/${teamId}/`);
};

export const updateTeam = (teamId, data) => {
  return api.patch(`/api/teams/${teamId}/`, data);
};

export const deleteTeam = (teamId) => {
  return api.delete(`/api/teams/${teamId}/`);
};

export const listPlayers = () => {
  return api.get('/api/players/');
};

/** Get all PlayerSportProfiles (filtered by backend based on role) */
export const listPlayerSportProfiles = () => {
  return api.get('/api/player-sport-profiles/');
};

/** Get specific PlayerSportProfile */
export const getPlayerSportProfile = (profileId) => {
  return api.get(`/api/player-sport-profiles/${profileId}/`);
};

/** Update PlayerSportProfile (assign/remove team) */
export const updatePlayerSportProfile = (profileId, data) => {
  return api.patch(`/api/player-sport-profiles/${profileId}/`, data);
};

/** Get available coaches by sport (for players to apply) */
export const getCoachesBySport = (sportId) => {
  return api.get(`/api/coaches/?sport_id=${sportId}`);
};

/** Player requests to apply to a coach */
export const requestCoach = ({ coachId, sportId }) => {
  return api.post('/api/coach-player-links/request/', { coach_id: coachId, sport_id: sportId });
};