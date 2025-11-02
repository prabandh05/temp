import React from "react";
import Navbar from "./Navbar";

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <main className="p-8 max-w-6xl mx-auto">{children}</main>
    </div>
  );
};

export default Layout;
