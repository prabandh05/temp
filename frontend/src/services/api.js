// import axios from "axios";
// import API_BASE_URL from "../config/api";

// const api = axios.create({
//   baseURL: API_BASE_URL,
// });

// export default api;

import axios from "axios";
import API_BASE_URL from "../config/api";


const api = axios.create({
baseURL: API_BASE_URL,
headers: {
"Content-Type": "application/json",
},
});


// attach JWT access token from localStorage automatically if present
api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});



export default api;