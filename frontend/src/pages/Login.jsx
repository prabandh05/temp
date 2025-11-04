// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginService } from "../services/auth";
import { ShieldCheck, AlertTriangle } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { role } = await loginService(username, password);

      // Redirect based on the role returned from the auth service
      switch (role) {
        case "admin":
          navigate("/admin-dashboard");
          break;
        case "player":
          navigate("/player-dashboard");
          break;
        case "coach":
          navigate("/coach-dashboard");
          break;
        case "manager":
          navigate("/manager-dashboard");
          break;
        default:
          // Fallback to a generic dashboard or home page
          navigate("/");
          break;
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-2xl shadow-2xl shadow-[#fbbf24]/20 overflow-hidden border border-[#334155]">
        {/* Left Panel: Visual */}
        <div className="hidden md:block relative">
          <img
            src="https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
            alt="Abstract sports background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#fbbf24]/20 to-transparent"></div>
          <div className="absolute bottom-8 left-8 text-white">
            <h1 className="text-4xl font-bold leading-tight">
              Unlock Your
              <br />
              Full Potential.
            </h1>
            <p className="text-lg mt-2 text-[#94a3b8]">
              The next generation of sports management.
            </p>
          </div>
        </div>

        {/* Right Panel: Form */}
        <div className="bg-[#1e293b] p-8 sm:p-12 flex flex-col justify-center">
          <div className="w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-lg">
                <ShieldCheck className="w-6 h-6 text-[#0f172a]" />
              </div>
              <h2 className="text-3xl font-bold text-white">
                Sign In
              </h2>
            </div>
            <p className="text-[#94a3b8] mb-8">
              Enter your credentials to access your dashboard.
            </p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-[#94a3b8] mb-2"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="e.g., john.doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all duration-300"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#94a3b8] mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] focus:border-[#38bdf8] transition-all duration-300"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-[#ef4444] bg-red-900/30 border border-red-500/50 p-3 rounded-lg">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] text-white font-bold p-3 rounded-lg hover:from-[#0ea5e9] hover:to-[#0284c7] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1e293b] focus:ring-[#38bdf8] transition-all duration-300 disabled:bg-[#334155] disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
            <p className="text-center text-sm mt-8 text-[#94a3b8]">
              Don't have an account?{" "}
              <a href="/signup" className="font-medium text-[#38bdf8] hover:text-[#0ea5e9] hover:underline">
                Sign Up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
