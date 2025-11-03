import React, { useEffect, useState } from "react";
import axios from "axios";

const Players = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/players/")
      .then((response) => {
        setPlayers(response.data.results || response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching players:", error);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading players...</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Players</h2>
      <ul className="space-y-3">
        {players.map((player) => (
          <li key={player.id} className="p-4 border rounded-md shadow">
            <h3 className="text-lg font-medium">{player.user}</h3>
            <p>Team: {player.team || "Unassigned"}</p>
            <p>Joined: {new Date(player.joined_at).toLocaleDateString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Players;
