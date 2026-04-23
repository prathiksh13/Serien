// api.js

// Node backend (models + socket + APIs)
const NODE_BASE_URL = import.meta.env.VITE_NODE_API_URL?.replace(/\/$/, '') || "https://serien-model.onrender.com";

// Flask backend (emotion graph)
const FLASK_BASE_URL = import.meta.env.VITE_FLASK_API_URL?.replace(/\/$/, '') || "";

// Helper for Node API
export function apiUrl(path) {
  if (!path) return NODE_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${NODE_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

// Helper for Flask API
export function flaskUrl(path) {
  if (!path) return FLASK_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${FLASK_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

// Socket URL (Node backend only)
export function socketUrl() {
  return NODE_BASE_URL;
}

// ===== Example API functions =====

// Chat (Node)
export const sendChat = async (data) => {
  const res = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return res.json();
};

// Assignment generation (Node)
export const generateAssignment = async () => {
  const res = await fetch(apiUrl("/api/assignments/generate"), {
    method: "POST",
  });
  return res.json();
};

// Emotion update (Flask)
export const sendEmotion = async (data) => {
  const res = await fetch(flaskUrl("/update-emotion"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return res;
};

// Emotion graph (Flask)
export const getEmotionGraph = () => {
  return flaskUrl("/emotion-graph");
};
