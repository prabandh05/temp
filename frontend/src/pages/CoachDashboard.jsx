import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Shield, UserCircle, LogOut, Loader2 } from 'lucide-react';
import { getDashboardData } from '../services/coach';

// Import new view components
import DashboardOverview from '../components/coach/DashboardOverview';
import TeamsView from '../components/coach/TeamsView';
import PlayersView from '../components/coach/PlayersView';
import ProfileView from '../components/coach/ProfileView';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'teams', label: 'My Teams', icon: Shield },
  { id: 'players', label: 'My Players', icon: Users },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

export default function CoachDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({ teams: [], players: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const dashRes = await getDashboardData();
      setDashboardData(dashRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#9E7FFF]" />
        </div>
      );
    }
    if (error) {
        return <div className="bg-red-900/30 border border-red-500 text-red-300 p-4 rounded-lg m-8">{error}</div>;
    }
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview initialData={dashboardData} />;
      case 'teams':
        return <TeamsView teams={dashboardData?.teams || []} />;
      case 'players':
        return <PlayersView players={dashboardData?.players || []} onPlayersUpdate={fetchData} />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardOverview initialData={dashboardData} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#171717] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#262626] border-r border-[#2F2F2F] flex flex-col p-4">
        <div className="text-2xl font-bold text-white mb-10 px-2">Social Sports</div>
        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-[#9E7FFF] text-white'
                  : 'text-[#A3A3A3] hover:bg-[#3f3f46] hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto">
           <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#A3A3A3] hover:bg-[#3f3f46] hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}
