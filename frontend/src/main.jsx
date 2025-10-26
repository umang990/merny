// src/main.jsx - DISABLE STRICT MODE (TEMPORARY FIX)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/main.css";

// TEMPORARY: Disable StrictMode to prevent double mounting during development
// This fixes the streaming issue where component unmounts/remounts rapidly
// You can re-enable StrictMode once the issue is fully resolved

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);

// Original code with StrictMode (causes double mount in React 18):
// ReactDOM.createRoot(document.getElementById("root")).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );