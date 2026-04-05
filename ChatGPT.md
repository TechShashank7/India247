# India247 - AI Developer Context Matrix 🧠

This document is designed to provide complete, unambiguous context about the **India247** project for any AI assistant continuing development.

> **Note to AI**: Read this entire file carefully. It contains the exact current state of the codebase, including what is real, what is simulated, and known issues.

---

## 1. 🧠 Project Overview
**India247** is a modern, responsive civic complaint platform designed for Indian citizens. 
- **Problem it solves:** Simplifies reporting municipal issues (potholes, garbage, water) and enforces officer accountability.
- **Target users:** 
  1. Citizens (Users) who report and track issues.
  2. Civic Officers who manage and resolve issues within their jurisdiction.
- **Key idea:** "Report. Track. Resolve." Features an AI chat-based reporting interface, real-time map tracking, gamification (rewards for good citizenship), and an SLA-driven officer dashboard.

---

## 2. 🏗️ Current Implementation Status (At a Glance)
The application has transitioned from a mock-data UI prototype to a **Full-Stack Application** with real databases and APIs.

- **FULLY IMPLEMENTED (Frontend + Backend + DB):**
  - Authentication (Firebase Auth synced with MongoDB).
  - Role-based Routing (User vs. Officer).
  - Dynamic Feed & Map pages connected to live complaint data.
  - Tracker timeline updating dynamically when Officer changes status.
  - Officer Dashboard performance metrics and status controls.
  - Gamification & Rewards (Leaderboard, Points logic stored in DB).
  - Reopen Complaint logic with **Gemini AI image/reason validation**.
  - Rate Officer API (1-5 stars) upon resolution.
  
- **PARTIALLY IMPLEMENTED / UI ONLY:**
  - "Trending Tags" sidebar in Feed Page (currently static UI, no backend logic).
  - Rewards redemption (badges exist, but "claiming" a reward has no backend consequence).
  
- **NOT IMPLEMENTED YET:**
  - Language Translation (Hindi/Regional).
  - Push Notifications (Firebase Messaging is configured in `.env` but not actively utilized for alerts).
  - Email Notifications.

---

## 3. 🧩 Features Breakdown

### A. Authentication
- **Purpose:** Secure platform access.
- **Status:** Fully Implemented.
- **How it works:** Firebase authenticates (Email/Password or Google). Upon success, the frontend calls `/api/users/sync` to create or update the user document in MongoDB, storing `uid, email, name, role, city`.

### B. Report Complaint System
- **Purpose:** Allow users to file context-rich complaints easily.
- **Status:** Fully Implemented.
- **How it works:** Uses an interactive 6-step state machine simulating an AI dialog. Connected to `gemini-2.5-flash-lite` for text and `gemini-2.5-flash` for image verification. Posts the final JSON payload to `/api/complaints`.

### C. Map Integration
- **Purpose:** Visualize complaint density and locations.
- **Status:** Fully Implemented.
- **How it works:** **Google Maps API** fetching from `/api/complaints`. Custom colored markers and clustering represent issue categories/priorities. Includes basic `<0.1` distance logic roughly equal to a 10km radius for "Near Me".

### D. Community Feed
- **Purpose:** Social-media-like scroll of issues in the city.
- **Status:** Fully Implemented.
- **How it works:** Fetches from `/api/complaints/feed`. Users can sort by "latest", "upvotes", and "trending" (custom scoring). Supports upvoting and commenting via distinct API endpoints.

### E. Complaint Tracker & Reopen logic
- **Purpose:** Transparency in resolution.
- **Status:** Fully Implemented.
- **How it works:** Visual timeline. If status is "Resolved", User can Reopen it ONCE. The `/api/complaints/:id/reopen` route intercepts with Gemini AI to validate the text reason and uploaded image via Cloudinary before allowing it back to "Pending".

### F. Officer Dashboard
- **Purpose:** Dedicated portal for civic workers.
- **Status:** Fully Implemented.
- **How it works:** Real-time metrics based on assigned official. Shows SLA escalation warnings based on `createdAt`. Officers update status sequentially (Sent to Department -> Under Inspection -> Work Started -> Mark Resolved). 

### G. Rewards & Gamification
- **Purpose:** Encourage civic participation.
- **Status:** Fully Implemented (Metrics side).
- **How it works:** Fetches user points dynamically (`10` for filing, `25` for resolved, `2` per upvote received, `1` per comment). Leaderboard limits to Top 10 citizens.

---

## 4. 🔐 Authentication & Roles (CRITICAL)

- **How Login Works:** Separated into two tabs in `AuthPage.jsx`: **Citizen** and **Officer**. MongoDB schema (`User.js`) holds `role: ['user', 'officer']`.
- **Pages accessible by User:** `/report`, `/map`, `/feed`, `/tracker`, `/rewards`, `/` (landing page).
- **Pages accessible by Officer:** `/map`, `/officer` (Officer Dashboard), `/` (landing page).
- **Current Router Status:** 
  - `App.jsx` handles role-based guarding via `<ProtectedRoute allowedRoles={[...]} />`. 
  - If an Officer tries to access `/report`, they are redirected to `/`.
  - **Note:** `AuthContext.jsx` provides role state globally. Wait for `loading` to be false before redirecting.

---

## 5. 🗄️ Backend & Database Status

- **Stack:** Node.js, Express, MongoDB Atlas, Mongoose.
- **Deployed:** Yes (assumed via Render/Vercel split, CORS handled).
- **APIs Existing:**
  - `POST /api/users/sync`, `GET /api/users/:uid`
  - `POST /api/complaints`
  - `GET /api/complaints`, `GET /api/complaints/:id`, `GET /api/complaints/feed`
  - `PUT /api/complaints/:id/status`
  - `POST /api/complaints/:id/upvote`, `comment`, `share`, `rate`
  - `POST /api/complaints/:id/reopen` (Uses `multer-storage-cloudinary` and Gemini)
  - `GET /api/complaints/officer/performance/:name`
  - `GET /api/complaints/user/points/:name`, `/leaderboard`
- **Missing/Mocked logic:** Actual email/SMS generation when status changes.

---

## 6. 🔄 Complaint Workflow Logic
The lifecycle stages for a complaint must follow this precise order:

1. **Complaint Filed** (Status: `Pending`) - Initiated by user.
2. **Sent to Department** (Status: `In Progress`) - Officer clicks "Accept Issue".
3. **Under Inspection** (Status: `In Progress`) - Officer updates status.
4. **Work Started** (Status: `In Progress`) - Officer updates status.
5. **Resolved** (Status: `Resolved`) - Officer marks resolved. Rate UI appears for Citizen.
6. **Reopened by User** (Status returns to `Pending`) - Allowed only if AI validates the reason/image. Updates `reopen.isReopened = true`.

*Warning:* `OfficerDashboard` uses `<select>` tags to manage mid-stages. Moving backward in stages is not restricted by backend rules, which is technically a logical flaw.

---

## 7. 🧪 Known Issues & Bugs

1. **Missing Real-time refresh:** When a user comments or upvotes a complaint on the Feed, the UI might need manual refresh to see changes globally (unless Redux/Zustand or React Query is implemented later). Currently relies on standard React state updates per component.
2. **Escalation Time Bug:** Over weekends/holidays, the Officer Dashboard `getRemainingTime` countdown does not pause. It assumes linear 24/7 SLAs.
3. **Offline support:** PWA `manifest.json` exists, but there's no Service Worker actively caching dynamic API requests yet.

---

## 8. 🎨 UI/UX Status
- **Styling:** Tailwind CSS v4.
- **Design Language:** Highly polished, premium glassmorphism, dynamic animations (`framer-motion` / CSS transitions).
- **Colors:** Saffron (`#f97316`), India Green (`#22c55e`), Navy (`#1e293b`).
- **Incomplete UI:** "Trending Tags" sidebar in `FeedPage` is hardcoded. Reward badges claim buttons don't do anything. 

---

## 9. 🔌 Integrations
- **Firebase:** Authentication explicitly. Project: `india247-f82ef`.
- **MongoDB:** Primary datastore (Clusters for Users, Complaints).
- **Cloudinary:** Used exclusively for uploading image proofs during the Reopen Complaint flow.
- **Gemini API:** Used in Report AI dialog generation, and for verifying Reopen requests (Text + Vision).
- **Google Maps API:** Used for dynamic map rendering, location searches, and marker clustering on the Map page.

---

## 10. 🚀 Immediate Next Tasks (Priority Order)

1. **Global State Management:** Implement Zustand / React Query to keep Feed, Map, and Tracker states universally synced without over-fetching APIs.
2. **Connect Trending Tags:** Parse the actual tags from active complaints in MongoDB and render them in the Feed sidebar.
3. **Enhance Officer Routing:** Strictly validate state transitions in Backend (`Sent to Department` cannot jump back to `Pending` unless reopened).
4. **Push Notifications:** Tie Firebase FCM to status changes so citizens know instantly when work starts.

---

## 11. 🧠 Architecture Summary

- **Frontend:** React + Vite SPA. Standard component tree. `AuthContext` wraps the `<App>` to provide global user session. Pages rely heavily on `useEffect` to fetch data from Express backend endpoints via `axios`.
- **Backend:** Node.js + Express. Stateless REST API architecture.
- **Data Flow:**
  - `User logs in` -> Firebase gives JWT -> `Frontend sends email/uid to /api/users/sync` -> MongoDB returns Full User Profile.
  - `User files complaint` -> Gemini AI structures JSON -> POSTs to Node -> Saved in MongoDB mapped to User UID.
  - `Complaint renders` -> Fetched dynamically into Feed/Map -> Officer fetches same data filtered by jurisdiction -> Updates status -> MongoDB updates document timeline -> User sees update in Tracker.
