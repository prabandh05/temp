import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("access"); // check if logged in

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  return (
    <nav className="bg-[#0F172A] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        <h1
          className="text-xl font-bold tracking-wide cursor-pointer"
          onClick={() => navigate("/")}
        >
          Social Sports
        </h1>

        <div className="space-x-6 flex items-center">
          <Link to="/" className="hover:text-blue-400 transition">
            Home
          </Link>
          <Link to="/players" className="hover:text-blue-400 transition">
            Players
          </Link>
          <Link to="/teams" className="hover:text-blue-400 transition">
            Teams
          </Link>

          {!isLoggedIn ? (
            <>
              <Link to="/login" className="hover:text-blue-400 transition">
                Login
              </Link>
              <Link
                to="/signup"
                className="text-white hover:text-gray-300 ml-4"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="ml-4 bg-red-600 px-3 py-1 rounded-md hover:bg-red-700 transition"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
