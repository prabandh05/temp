// frontend/src/services/auth.js
import api from "./api";

/**
 * Logs in the user by first obtaining a JWT token pair and then fetching
 * the user's profile to determine their role and store their details.
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @returns {Promise<{role: string}>} - An object containing the user's role.
 */
export async function login(username, password) {
  try {
    // Step 1: Obtain JWT tokens
    const tokenResponse = await api.post("/api/token/", { username, password });
    const { access, refresh } = tokenResponse.data;

    // Store tokens immediately to be used in the next request
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);

    // Step 2: Fetch profile to get role and user info
    // The axios interceptor in `api.js` will automatically add the auth header
    const profileResponse = await api.get("/api/profile/");
    const { user } = profileResponse.data;

    // Store user details for session persistence and use across the app
    localStorage.setItem("role", user.role);
    localStorage.setItem("username", user.username);
    localStorage.setItem("user_id", user.id);

    // Return the role for immediate redirection in the UI component
    return { role: user.role };
  } catch (err) {
    // Clear any partial login data on failure
    logout();
    // Re-throw the error to be handled by the calling component
    console.error("Authentication failed:", err.response?.data || err.message);
    throw new Error(
      err.response?.data?.detail || "Invalid credentials or server error."
    );
  }
}

/**
 * Logs out the user by clearing all authentication-related data
 * from localStorage.
 */
export function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
  localStorage.removeItem("user_id");
  // Optionally, redirect to the login page
  // window.location.href = '/login';
}
