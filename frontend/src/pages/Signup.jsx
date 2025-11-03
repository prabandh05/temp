// frontend/src/pages/Signup.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, Mail, Lock, Briefcase, BarChart2, CheckCircle, AlertTriangle } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

// FIX: Moved component definitions outside the main component to prevent re-rendering on state change, which fixes the focus loss issue.
const InputField = ({ icon, type, placeholder, value, onChange, required = true }) => (
  <div className="relative flex items-center">
    <span className="absolute left-4 text-textSecondary">{icon}</span>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 placeholder-textSecondary"
    />
  </div>
);

const SelectField = ({ icon, value, onChange, options }) => (
  <div className="relative flex items-center">
    <span className="absolute left-4 text-textSecondary">{icon}</span>
    <select
      value={value}
      onChange={onChange}
      className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 appearance-none"
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);


const Signup = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("player");
  const [sportName, setSportName] = useState("Cricket");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const payload = {
      username,
      email,
      password,
      role,
    };

    if (role === "player") {
      payload.sport_name = sportName;
    }

    try {
      await axios.post(`${API_URL}/api/auth/signup/`, payload);

      setSuccess("Account created successfully! Redirecting to login...");
      setError("");
      setUsername("");
      setEmail("");
      setPassword("");

      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      console.error("Signup failed:", err.response?.data || err.message);
      let errorMessage = "An unknown error occurred during signup.";
      
      // FIX: Robust error handling to prevent crashes on non-JSON responses (like 500 errors).
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (typeof errorData === 'object' && errorData !== null && !Array.isArray(errorData)) {
          const messages = Object.entries(errorData).map(([field, fieldErrors]) => {
            const formattedField = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
            const errorText = Array.isArray(fieldErrors) ? fieldErrors.join(' ') : String(fieldErrors);
            return `${formattedField}: ${errorText}`;
          });
          
          if (messages.length > 0) {
            errorMessage = messages.join(' | ');
          }
        } else if (typeof errorData === 'string') {
          if (errorData.toLowerCase().includes('<html>')) {
              errorMessage = "A server error occurred. Please try again later.";
          } else {
              errorMessage = errorData;
          }
        }
      } else if (err.message) {
          errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-text p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Join the Arena
          </h1>
          <p className="text-textSecondary mt-2">Create your account and start your journey.</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-[0_0_30px_rgba(158,127,255,0.1)]">
          <form onSubmit={handleSignup} className="space-y-6">
            <InputField icon={<UserPlus size={20} />} type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <InputField icon={<Mail size={20} />} type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
            <InputField icon={<Lock size={20} />} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            
            <SelectField 
              icon={<Briefcase size={20} />} 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: "player", label: "Player" },
                { value: "coach", label: "Coach" },
                { value: "manager", label: "Manager" },
              ]}
            />

            {role === 'player' && (
              <SelectField 
                icon={<BarChart2 size={20} />} 
                value={sportName} 
                onChange={(e) => setSportName(e.target.value)}
                options={[
                  { value: "Cricket", label: "Primary Sport: Cricket" },
                  { value: "Football", label: "Primary Sport: Football" },
                  { value: "Basketball", label: "Primary Sport: Basketball" },
                  { value: "Running", label: "Primary Sport: Running" },
                ]}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:bg-opacity-90 transition-all duration-300 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Register"}
            </button>
          </form>

          {error && (
            <div className="flex items-center text-sm mt-6 text-error bg-error/10 p-3 rounded-lg">
              <AlertTriangle size={20} className="mr-3 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center text-sm mt-6 text-success bg-success/10 p-3 rounded-lg">
              <CheckCircle size={20} className="mr-3 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}
          
          <p className="text-center text-sm text-textSecondary mt-8">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
