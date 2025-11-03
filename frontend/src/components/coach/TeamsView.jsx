import React from 'react';
import { Shield, Users, Trophy } from 'lucide-react';

export default function TeamsView({ teams }) {
  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">My Teams</h1>
        <p className="text-[#A3A3A3] mt-1">An overview of the teams you manage.</p>
      </header>

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => (
            <div key={team.id} className="bg-[#262626] p-6 rounded-2xl border border-[#2F2F2F] hover:border-[#9E7FFF] transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-purple-900/50 p-3 rounded-lg">
                  <Shield className="text-[#9E7FFF]" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{team.name}</h2>
                  <p className="text-sm text-[#A3A3A3]">{team.sport_name}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-[#A3A3A3]">
                  <Users size={16} />
                  <span>{team.player_count} Players</span>
                </div>
                <div className="flex items-center gap-2 text-[#A3A3A3]">
                  <Trophy size={16} />
                  <span>{team.matches_won} Wins / {team.matches_lost} Losses</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#262626] rounded-2xl border border-dashed border-[#2F2F2F]">
          <Shield size={48} className="mx-auto text-[#A3A3A3]" />
          <h3 className="mt-4 text-xl font-semibold">No Teams Found</h3>
          <p className="mt-1 text-[#A3A3A3]">You are not currently assigned to manage any teams.</p>
        </div>
      )}
    </div>
  );
}
