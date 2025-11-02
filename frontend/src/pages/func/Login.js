// pages/Login.js
export default function Login() {
  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>
        <input type="email" placeholder="Email" className="border p-2 w-full mb-3 rounded" />
        <input type="password" placeholder="Password" className="border p-2 w-full mb-4 rounded" />
        <button className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700">Login</button>
      </div>
    </div>
  );
}
