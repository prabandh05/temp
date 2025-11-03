import React, { useEffect, useState } from "react";
import axios from "axios";

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/teams/")
      .then((response) => {
        setTeams(response.data.results || response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching teams:", error);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading teams...</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Teams</h2>
      <div className="grid grid-cols-2 gap-4">
        {teams.map((team) => (
          <div key={team.id} className="p-4 border rounded-md shadow">
            <h3 className="text-lg font-medium">{team.name}</h3>
            <p>Coach: {team.coach || "No coach assigned"}</p>
            <p>Created: {new Date(team.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Teams;
