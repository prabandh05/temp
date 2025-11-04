// frontend/src/pages/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a]">
      <h1 className="text-3xl font-bold mb-6 text-white">Welcome to Sports Portal</h1>
      <div className="flex space-x-4">
        <button
          onClick={() => navigate("/login")}
          className="bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] text-white px-6 py-2 rounded-lg hover:from-[#0ea5e9] hover:to-[#0284c7] transition-all duration-300"
        >
          Login
        </button>
        <button
          onClick={() => navigate("/signup")}
          className="bg-gradient-to-r from-[#10b981] to-[#059669] text-white px-6 py-2 rounded-lg hover:from-[#059669] hover:to-[#047857] transition-all duration-300"
        >
          Signup
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
