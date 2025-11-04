import React, { useEffect, useState } from 'react';
import { UserPlus, Send, X, CheckCircle, AlertCircle } from 'lucide-react';
import { invitePlayer, getSports } from '../../services/coach';

const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-[#262626] rounded-2xl shadow-xl w-full max-w-md border border-[#2F2F2F] p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function PlayersView({ players = [], onPlayersUpdate }) {

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">My Players</h1>
          <p className="text-[#A3A3A3] mt-1">Manage your student roster. Players can apply to become your students.</p>
        </div>
      </header>

      <div className="bg-[#262626] rounded-2xl border border-[#2F2F2F]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#2F2F2F]">
              <tr>
                <th className="p-4 text-sm font-semibold text-[#A3A3A3]">Name</th>
                <th className="p-4 text-sm font-semibold text-[#A3A3A3]">Email</th>
                <th className="p-4 text-sm font-semibold text-[#A3A3A3]">Primary Sport</th>
                <th className="p-4 text-sm font-semibold text-[#A3A3A3]">Status</th>
              </tr>
            </thead>
            <tbody>
              {players.length > 0 ? (
                players.map(player => (
                  <tr key={player.id} className="border-b border-[#2F2F2F] last:border-b-0 hover:bg-[#171717]">
                    <td className="p-4 font-medium">{player.user.first_name} {player.user.last_name}</td>
                    <td className="p-4 text-[#A3A3A3]">{player.user.email}</td>
                    <td className="p-4 text-[#A3A3A3]">{player.primary_sport_name || 'N/A'}</td>
                    <td className="p-4">
                      <span className="bg-green-900/50 text-green-300 text-xs font-medium px-2.5 py-1 rounded-full">Active</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-16 text-[#A3A3A3]">
                    You have no players linked to your profile yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
