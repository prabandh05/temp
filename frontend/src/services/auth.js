// src/services/auth.js
import api from "../services/api";

export async function login(username, password) {
  try {
    // Obtain JWT tokens
    const tokenResp = await api.post("/api/token/", { username, password });
    const tokens = tokenResp.data; // { access, refresh }

    localStorage.setItem("access", tokens.access);
    localStorage.setItem("refresh", tokens.refresh);

    // Fetch profile to get role and user info
    const me = await api.get("/api/profile/");
    const user = me.data.user;

    localStorage.setItem("role", user.role);
    localStorage.setItem("username", user.username);
    localStorage.setItem("user_id", user.id);

    return { ...tokens, role: user.role };
  } catch (err) {
    if (err.response && err.response.data) {
      return Promise.reject(
        err.response.data.detail || err.response.data || err.response.data.non_field_errors || JSON.stringify(err.response.data)
      );
    }
    return Promise.reject(err.message || "Login failed");
  }
}

export function logout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
  localStorage.removeItem("user_id");
}
