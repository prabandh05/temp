import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Users, ClipboardList, Download, Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { getSports, createSession, getSessionCsvTemplate, uploadSessionCsv } from '../../services/coach';

// Modal Component (re-used from original dashboard)
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

export default function DashboardOverview({ initialData }) {
  const [dashboardData, setDashboardData] = useState(initialData);
  const [sessions, setSessions] = useState([]);
  const [sports, setSports] = useState([]);
  
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchSportsData = useCallback(async () => {
    try {
      const sportsRes = await getSports().catch(() => ({ data: [] }));
      setSports(sportsRes.data);
    } catch (err) {
      console.error("Could not fetch sports", err);
    }
  }, []);

  useEffect(() => {
    fetchSportsData();
  }, [fetchSportsData]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const res = await createSession({
        sport: parseInt(data.sport, 10),
        title: data.title,
        notes: data.notes,
      });
      setSessions(prev => [{ id: res.data.id, ...data, sport: sports.find(s => s.id === parseInt(data.sport))?.name || 'Unknown Sport' }, ...prev]);
      setCreateModalOpen(false);
    } catch (err) {
      console.error("Failed to create session:", err);
      alert("Error: Could not create session.");
    }
  };

  const handleDownloadTemplate = async (sessionId) => {
    try {
      const blob = await getSessionCsvTemplate(sessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${sessionId}_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download template:", err);
      alert("Error: Could not download template.");
    }
  };

  const handleUploadCsv = async () => {
    if (!uploadFile || !selectedSession) return;
    setIsUploading(true);
    setUploadResult(null);
    try {
      const res = await uploadSessionCsv(selectedSession.id, uploadFile);
      setUploadResult({ success: true, data: res.data });
    } catch (err) {
      setUploadResult({ success: false, data: err.response?.data || { detail: "An unknown error occurred." } });
    } finally {
      setIsUploading(false);
    }
  };

  const openUploadModal = (session) => {
    setSelectedSession(session);
    setUploadFile(null);
    setUploadResult(null);
    setUploadModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Coach Dashboard</h1>
          <p className="text-[#A3A3A3] mt-1">Here's your overview for today.</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="mt-4 sm:mt-0 flex items-center gap-2 bg-[#9E7FFF] text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-600 transition-all duration-300"
        >
          <PlusCircle size={20} />
          Create Session
        </button>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#262626] p-6 rounded-2xl border border-[#2F2F2F] flex items-center gap-4">
          <div className="bg-purple-900/50 p-3 rounded-lg"><Users className="text-[#9E7FFF]" size={28} /></div>
          <div>
            <p className="text-[#A3A3A3] text-sm">Total Players</p>
            <p className="text-2xl font-bold">{dashboardData.players.length}</p>
          </div>
        </div>
        <div className="bg-[#262626] p-6 rounded-2xl border border-[#2F2F2F] flex items-center gap-4">
          <div className="bg-sky-900/50 p-3 rounded-lg"><ClipboardList className="text-[#38bdf8]" size={28} /></div>
          <div>
            <p className="text-[#A3A3A3] text-sm">Managed Teams</p>
            <p className="text-2xl font-bold">{dashboardData.teams.length}</p>
          </div>
        </div>
         <div className="bg-[#262626] p-6 rounded-2xl border border-[#2F2F2F] flex items-center gap-4">
          <div className="bg-pink-900/50 p-3 rounded-lg"><FileText className="text-[#f472b6]" size={28} /></div>
          <div>
            <p className="text-[#A3A3A3] text-sm">Sessions Created</p>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-[#262626] p-6 rounded-2xl border border-[#2F2F2F]">
        <h2 className="text-2xl font-bold mb-4">Recent Sessions</h2>
        <div className="space-y-4">
          {sessions.length > 0 ? (
            sessions.map(session => (
              <div key={session.id} className="bg-[#171717] p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-lg">{session.title}</h3>
                  <p className="text-sm text-[#A3A3A3]">{session.sport} - Notes: {session.notes || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleDownloadTemplate(session.id)} className="flex items-center gap-2 text-sm bg-[#2F2F2F] py-2 px-3 rounded-md hover:bg-gray-700 transition-colors">
                    <Download size={16} /> Template
                  </button>
                  <button onClick={() => openUploadModal(session)} className="flex items-center gap-2 text-sm bg-[#9E7FFF] py-2 px-3 rounded-md hover:bg-purple-600 transition-colors">
                    <Upload size={16} /> Attendance
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[#A3A3A3] py-8">No sessions created yet. Click "Create Session" to get started.</p>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Session">
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[#A3A3A3] mb-1">Title</label>
            <input type="text" name="title" id="title" required className="w-full p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]" />
          </div>
          <div>
            <label htmlFor="sport" className="block text-sm font-medium text-[#A3A3A3] mb-1">Sport</label>
            <select name="sport" id="sport" required className="w-full p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]">
              {sports.length > 0 ? sports.map(sport => (
                <option key={sport.id} value={sport.id}>{sport.name}</option>
              )) : <option disabled>No sports available</option>}
            </select>
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-[#A3A3A3] mb-1">Notes (Optional)</label>
            <textarea name="notes" id="notes" rows="3" className="w-full p-2 bg-[#171717] border border-[#2F2F2F] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E7FFF]"></textarea>
          </div>
          <button type="submit" className="w-full bg-[#9E7FFF] text-white font-bold p-2 rounded-lg hover:bg-purple-600 transition-colors">Create</button>
        </form>
      </Modal>

      <Modal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} title={`Upload Attendance for "${selectedSession?.title}"`}>
        <div className="space-y-4">
          <p className="text-sm text-[#A3A3A3]">Upload the completed CSV file. Ensure it follows the template format: <code className="bg-[#171717] px-1 rounded">player_id,attended,score</code>.</p>
          <div>
            <label htmlFor="csvFile" className="w-full cursor-pointer border-2 border-dashed border-[#2F2F2F] rounded-lg p-6 flex flex-col items-center justify-center hover:border-[#9E7FFF] transition-colors">
              <Upload size={32} className="text-[#A3A3A3] mb-2" />
              <span className="text-white font-semibold">{uploadFile ? uploadFile.name : 'Click to select a file'}</span>
              <span className="text-xs text-[#A3A3A3]">CSV up to 5MB</span>
            </label>
            <input type="file" id="csvFile" accept=".csv" onChange={(e) => setUploadFile(e.target.files[0])} className="hidden" />
          </div>
          
          {uploadResult && (
            <div className={`p-3 rounded-lg text-sm ${uploadResult.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
              {uploadResult.success ? (
                <div className="flex gap-2">
                  <CheckCircle className="flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Success!</strong> {uploadResult.data.updated} records updated.
                    {uploadResult.data.errors?.length > 0 && <span className="ml-2">({uploadResult.data.errors.length} errors)</span>}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <AlertCircle className="flex-shrink-0 mt-0.5" />
                  <strong>Upload Failed.</strong>
                </div>
              )}
              {uploadResult.data.errors?.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-xs space-y-1 max-h-32 overflow-y-auto">
                  {uploadResult.data.errors.map((err, i) => <li key={i}>Row {err.row}: {err.error} (Player ID: {err.player_id})</li>)}
                </ul>
              )}
            </div>
          )}

          <button onClick={handleUploadCsv} disabled={!uploadFile || isUploading} className="w-full bg-[#9E7FFF] text-white font-bold p-2 rounded-lg hover:bg-purple-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center">
            {isUploading ? 'Processing...' : 'Upload & Process File'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
