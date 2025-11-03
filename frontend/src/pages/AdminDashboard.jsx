import React from "react";

function AdminDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">
        Welcome, Admin 👑
      </h1>
      <p className="text-gray-600">
        Here you can manage users, coaches, and managers.
      </p>
    </div>
  );
}

export default AdminDashboard;
