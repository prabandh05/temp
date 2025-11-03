<<<<<<< HEAD
function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-blue-300">
      <h1 className="text-4xl font-bold text-blue-800 mb-4">
        Welcome to Social Sports 🏆
      </h1>
      <p className="text-gray-700 text-lg text-center max-w-md">
        Track matches, stats, and players — all in one place.
      </p>
      <button className="mt-6 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
        Get Started
=======
import React, { useEffect, useState } from "react";

function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (token) {
      fetch("http://127.0.0.1:8000/api/users/", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setUser(data[0])) // adjust if needed
        .catch((err) => console.error(err));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.location.href = "/login";
  };

  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold mb-4 text-blue-600">Welcome!</h1>
      {user && <p className="text-lg">Logged in as <strong>{user.username}</strong></p>}
      <button
        onClick={handleLogout}
        className="mt-4 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
      >
        Logout
>>>>>>> b5bb251 (Removed nested git repo and re-added backend folder correctly)
      </button>
    </div>
  );
}

<<<<<<< HEAD
export default Home;
=======
export default Dashboard;
>>>>>>> b5bb251 (Removed nested git repo and re-added backend folder correctly)
