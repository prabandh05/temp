// src/services/auth.js
import api from "../config/api";

export async function login(username, password, selectedRole) {
  try {
    const resp = await api.post("/api/auth/login/", {
      username,
      password,
    });

    const data = resp.data;

    // expected shape:
    // { token: "...", user_id: 1, username: "admin", email: "...", role: "player", verified: true? }

    // Basic role check: ensure backend role matches selected role
    if (!data.role) {
      throw new Error("Server did not return role information.");
    }

    if (data.role !== selectedRole) {
      throw new Error("Role mismatch — the account role does not match the selected role.");
    }

    // Optional: check verified (if backend provides a boolean like 'is_verified' or 'verified')
    // For player accounts, assume verified by default
    if ((data.role === "coach" || data.role === "manager") && data.verified === false) {
      // If backend returns `verified: false`, prevent login on frontend
      throw new Error("Your account is not verified by the admin yet.");
    }

    // Save token and user info
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("username", data.username);
    localStorage.setItem("user_id", data.user_id);

    return data;
  } catch (err) {
    // Normalize error for UI
    if (err.response && err.response.data) {
      // Try common DRF error formats
      return Promise.reject(err.response.data.detail || err.response.data || err.response.data.non_field_errors || JSON.stringify(err.response.data));
    }
    return Promise.reject(err.message || "Login failed");
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
  localStorage.removeItem("user_id");
}
