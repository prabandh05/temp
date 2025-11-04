import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PlayerDashboard from "./pages/PlayerDashboard";
import CoachDashboard from "./pages/CoachDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Home from "./pages/Home";
import TournamentManagement from "./pages/TournamentManagement";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Home />} />
        
        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/player-dashboard" element={<PlayerDashboard />} />
          <Route path="/coach-dashboard" element={<CoachDashboard />} />
          <Route path="/manager-dashboard" element={<ManagerDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/tournaments" element={<TournamentManagement />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
