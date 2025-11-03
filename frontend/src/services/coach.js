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
 * Sends an invitation to a player to be coached.
 * @param {string} playerEmail - The email of the player to invite.
 */
export const invitePlayer = (playerEmail) => {
  return api.post('/api/coach-player-links/invite/', { player_email: playerEmail });
};
