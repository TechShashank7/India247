# 🚀 India247
**A modern, AI-powered civic issue reporting and tracking platform for Indian citizens.**
*Report. Track. Resolve.*

----

## 🌍 Problem Statement
In fast-growing cities, citizens constantly face everyday civic issues—potholes, water supply disruptions, uncollected garbage, and broken streetlights. Traditional reporting systems are tedious, opaque, and hard to track. On the other side, civic officers struggle with unstructured complaints and a lack of tools to easily prioritize and manage resolutions. Current systems fail because they lack transparency, are highly inconvenient to use, and offer absolutely no accountability or incentive for active citizen participation.

---

## 💡 Solution (India247)
India247 bridges the gap between citizens and civic authorities by providing a **transparent, highly-responsive, and AI-driven ecosystem**. 

Instead of filling out long, confusing forms, citizens can simply chat with our AI assistant, **Meera**, to intuitively report issues. Through interactive map-based tracking, gamification (reward points for active citizenship), and dedicated officer dashboards enforcing strict SLAs, India247 brings speed, absolute accountability, and clarity to civic maintenance.

---

## ✨ Features

### 🧑‍🤝‍🧑 Citizen Features
- **Conversational AI Reporting:** Submit complaints effortlessly through an interactive, multi-step chat interface simulating a real conversation.
- **Real-Time Tracking & Timeline:** Monitor exact complaint status (`Pending` → `Under Inspection` → `Resolved`) visually via a live tracker.
- **Interactive Map Exploration:** Discover nearby civic issues and their current statuses dynamically linked via the Google Maps API.
- **Community Feed:** A social-media-style scroll of city-wide issues. Features optimistic UI updates (instant upvoting & commenting) and seamless Map-to-Feed deep linking.
- **Gamification & Rewards:** Earn reward points for filing legitimate complaints, upvoting, and engaging in the community. Dominate the city Leaderboard.

### 👮 Officer Features
- **Dedicated Dashboard:** A specialized, data-rich portal providing an overview of assigned civic duties.
- **SLA & Escalation Warnings:** Real-time metrics and countdowns ensuring issues are handled efficiently based on creation timestamps to prevent SLA breaches.
- **Streamlined Workflow Status:** Simple controls to move complaints intuitively through stages: `Sent to Department` → `Under Inspection` → `Work Started` → `Resolved`.

### 🤖 AI Capabilities
- **Meera - Intent Detection AI:** Utilizes Gemini 2.5 Flash-Lite to dynamically parse natural language intent (`[INTENT: "..."]`), replacing rigid category dropdowns entirely.
- **Visual AI Verification (Reopen Logic):** Employs Gemini 2.5 Flash Vision to automatically validate citizen-uploaded images and text reasons when requesting to reopen a complaint, avoiding system abuse.

### ⚡ Platform Capabilities
- **Role-based Authentication:** Secure Firebase Auth synced seamlessly with MongoDB for granular 'Citizen' vs 'Officer' access routing.
- **Modern UI/UX:** Responsive, mobile-first design featuring premium glassmorphism, dynamic animations, and persistent device keyboard control.
- **Optimistic UI:** Instant fluid visual feedback without cumbersome page reloads.

---

## 🧠 System Architecture

- **Frontend:** React + Vite SPA using Context API for global session states. Styled with Tailwind CSS v4 and a bespoke glassmorphism design system.
- **Backend:** Node.js + Express. Stateless, high-performance REST API architecture.
- **Database:** MongoDB Atlas utilizing Mongoose ODM, storing hierarchical unstructured data sets dynamically.
- **Authentication:** Firebase Authentication, securely synced with MongoDB for centralized system-wide user management.
- **AI Integration:** Google Gemini API (2.5 Flash & Flash-Lite) for structured intent extraction and multimodal vision verification.
- **Cloud Storage:** Cloudinary integration for scalable, secure image proof handling.
- **Maps:** Google Maps API paired with React Leaflet for an interactive reporting overlay and marker clustering.

### 🔄 Data Flow
1. **Auth:** User logs in via Firebase → Frontend pings sync API → MongoDB populates user session profile.
2. **Report:** User chats with AI → AI structures JSON payload → POST to Express → Saved in MongoDB.
3. **Display:** Real-time location and timeline data fetched onto Map / Feed.
4. **Resolution:** Officer logs in, filters jurisdiction data → Updates status sequentially → MongoDB updates lifecycle timeline → Citizen Tracker mirrors update instantly.

---

## 🛠️ Tech Stack

| Domain | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Lucide React, Axios |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas, Mongoose |
| **Authentication** | Firebase Auth |
| **Artificial Intelligence**| Google Gemini (2.5 Flash & Flash-Lite) |
| **Cloud Storage** | Cloudinary |
| **Mapping & Location** | Google Maps API |

---

## 🔄 Workflow

1. **Complaint Filing:** The Citizen intuitively chats with **Meera AI**, which understands the issue, extracts intent, and packages the data.
2. **Database & Mapping:** The structured report is saved in MongoDB and instantly mapped to the Google Maps interface and Citizen Feed.
3. **Officer Review:** The Civic Officer logs into their specialized dashboard, evaluating pending complaints based on strict timeline SLA metrics.
4. **Resolution Tracking:** The Officer updates the task sequentially (*Sent to Department → Under Inspection → Work Started → Resolved*).
5. **Real-time Updates:** The Citizen's tracking timeline updates automatically.
6. **Reopening Loop:** If the issue is unsatisfactorily marked as 'Resolved', the Citizen can request a 'Reopen' by uploading an image proof. This image and reason are rigorously **validated by Gemini AI** to prevent misuse before pushing it back to 'Pending' status.

---

## 🚀 Deployment

- **Frontend:** Deployed smoothly on **Vercel** with optimized build pipelines.
- **Backend:** Deployed on **Render** (Node.js REST API).
- **Database:** Hosted securely on **MongoDB Atlas** for scalable NoSQL storage.
- **Storage:** **Cloudinary** for image blobs.

---

## ❤️ Fueling a Better Tomorrow
Built with purpose for real-world impact. Because a clean, functioning city is everyone's right and everyone's responsibility. 

**India247 — Your City, In Your Hands.**
