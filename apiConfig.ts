// ======================================================
// SMASHPOINT MOBILE API CONFIGURATION
// IMPORTANT: ONLY ONE URL MUST BE UNCOMMENTED BELOW.
// This is the ONLY place the mobile app's API base URL is set.
// ======================================================

// ---------------- LOCAL ----------------

// Android Emulator (reaches the Mac's own localhost):
export const API_BASE_URL = "http://10.0.2.2:8787";

// Physical Android Phone (same Wi-Fi network as this Mac).
// This is this machine's actual LAN IP, observed working this session —
// update it if the Mac's network address changes:
// export const API_BASE_URL = "http://192.168.0.100:8787";

// ---------------- PRODUCTION ----------------

// export const API_BASE_URL =
//   "https://badminton-api.kannadasanb1969.workers.dev";
