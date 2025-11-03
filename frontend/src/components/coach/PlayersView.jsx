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
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [sports, setSports] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSports();
        setSports(res.data || []);
      } catch {}
    })();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setInviteResult(null);
    try {
      const res = await invitePlayer({ playerId, sportId: Number(selectedSportId) });
      setInviteResult({ success: true, message: res.data.detail || 'Invitation sent successfully!' });
      onPlayersUpdate(); // Refresh player list
    } catch (err) {
      setInviteResult({ success: false, message: err.response?.data?.detail || 'Failed to send invitation.' });
    } finally {
      setIsSending(false);
      setPlayerId('');
    }
  };

  const openInviteModal = () => {
    setPlayerId('');
    setInviteResult(null);
    setInviteModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">My Players</h1>
          <p className="text-[#A3A3A3] mt-1">Manage and invite players to your roster.</p>
        </div>
        <button
          onClick={openInviteModal}
          className="mt-4 sm:mt-0 flex items-center gap-2 bg-[#9E7FFF] text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-600 transition-all duration-300"
        >
          <UserPlus size={20} />
          Invite Player
        </button>
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

      <Modal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite a New Player (by Player ID)">
        <form onSubmit={handleInvite} className="space-y-4">
          <p className="text-sm text-[#A3A3A3]">Enter the player's ID and select the sport to send a coaching invitation.</p>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="sport" className="block text-xs text-[#A3A3A3] mb-1">Sport</label>
              <select
                id="sport"
                value={selectedSportId}
                onChange={(e) => setSelectedSportId(e.target.value)}
                required
                className="w-full p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]"
              >
                <option value="" disabled>Select sport</option>
                {sports.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="playerId" className="block text-xs text-[#A3A3A3] mb-1">Player ID</label>
              <input
                type="text"
                id="playerId"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="e.g., P2500001"
                required
                className="w-full p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]"
              />
            </div>
          </div>

          {inviteResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${inviteResult.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
              {inviteResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <p>{inviteResult.message}</p>
            </div>
          )}

          <button type="submit" disabled={isSending} className="w-full flex items-center justify-center gap-2 bg-[#9E7FFF] text-white font-bold p-2 rounded-lg hover:bg-purple-600 transition-colors disabled:bg-gray-600">
            {isSending ? 'Sending...' : 'Send Invitation'}
            <Send size={16} />
          </button>
        </form>
      </Modal>
    </div>
  );
}
