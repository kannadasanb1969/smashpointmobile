// ======================================================
// SMASHPOINT MOBILE API CONFIGURATION
// IMPORTANT: ONLY ONE URL MUST BE UNCOMMENTED BELOW.
// This is the ONLY place the mobile app's API base URL is set.
// ======================================================

// ---------------- LOCAL ----------------

// Android Emulator (reaches the Mac's own localhost). ACTIVE for emulator testing:
export const API_BASE_URL = "http://10.0.2.2:8787";

// Physical Android Phone (same Wi-Fi network as this Mac).
// 10.0.2.2 does NOT work on a real phone - use this Mac's current LAN IP, and add it
// to plugins/withLanCleartext.js so Android allows plain HTTP to it:
// export const API_BASE_URL = "http://<MAC_LAN_IP>:8787";

// ---------------- PRODUCTION ----------------

// export const API_BASE_URL = "https://badminton-api.kannadasanb1969.workers.dev";
