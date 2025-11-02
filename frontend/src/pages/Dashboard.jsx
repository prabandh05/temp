import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // For Create React App, env vars must start with REACT_APP_
  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    axios
      .get(`${API_URL}/teams/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTeams(res.data))
      .catch((err) => {
        console.error(err);
        setError("Failed to load teams. You may need to log in again.");
      })
      .finally(() => setLoading(false));
  }, [API_URL]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.location.href = "/login";
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold mb-4 text-blue-600">🏆 Dashboard</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {teams.length > 0 ? (
        <ul className="space-y-2">
          {teams.map((t) => (
            <li
              key={t.id}
              className="border border-gray-300 rounded-lg p-2 shadow-sm"
            >
              {t.name}
            </li>
          ))}
        </ul>
      ) : (
        <p>No teams found.</p>
      )}

      <button
        onClick={handleLogout}
        className="mt-6 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
      >
        Logout
      </button>
    </div>
  );
}
