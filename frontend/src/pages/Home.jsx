import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, BarChart } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#171717] text-white">
      <div className="container mx-auto px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="relative inline-block mb-8">
            <Trophy className="text-[#9E7FFF] w-24 h-24" strokeWidth={1.5} />
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-pink-500 rounded-full animate-ping"></div>
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-pink-500 rounded-full opacity-75"></div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            Social Sports Platform
          </h1>
          <p className="text-lg md:text-xl text-[#A3A3A3] mb-12 max-w-2xl mx-auto">
            Connect with your team, track your progress, and climb the leaderboards. Your central hub for all things sports.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/login"
              className="bg-[#9E7FFF] text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-600 transition-all duration-300 transform hover:scale-105"
            >
              Get Started
            </Link>
            <Link
              to="/about"
              className="bg-[#262626] border border-[#2F2F2F] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#3f3f46] transition-all duration-300"
            >
              Learn More
            </Link>
          </div>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-12 text-left">
          <div className="bg-[#262626] p-8 rounded-2xl border border-[#2F2F2F] transform hover:-translate-y-2 transition-transform duration-300">
            <div className="p-3 inline-block bg-purple-900/50 rounded-lg mb-4">
              <Users className="text-[#9E7FFF]" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-2">Team Management</h3>
            <p className="text-[#A3A3A3]">
              Easily manage rosters, schedules, and communication for all your teams in one place.
            </p>
          </div>
          <div className="bg-[#262626] p-8 rounded-2xl border border-[#2F2F2F] transform hover:-translate-y-2 transition-transform duration-300">
            <div className="p-3 inline-block bg-sky-900/50 rounded-lg mb-4">
              <BarChart className="text-[#38bdf8]" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-2">Performance Tracking</h3>
            <p className="text-[#A3A3A3]">
              Log attendance, track scores, and view detailed analytics to monitor player and team performance.
            </p>
          </div>
          <div className="bg-[#262626] p-8 rounded-2xl border border-[#2F2F2F] transform hover:-translate-y-2 transition-transform duration-300">
            <div className="p-3 inline-block bg-pink-900/50 rounded-lg mb-4">
              <Trophy className="text-[#f472b6]" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-2">AI-Powered Leaderboards</h3>
            <p className="text-[#A3A3A3]">
              Our smart leaderboards rank players based on comprehensive metrics, giving a true measure of skill.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
