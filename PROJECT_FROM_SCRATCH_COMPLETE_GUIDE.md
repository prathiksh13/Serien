# TheraSense Complete Project Guide (From Scratch)

This document explains how the full project works from zero setup to runtime behavior, including frontend, backend, Firebase data model, video calls, emotion analysis, reporting, and troubleshooting.

## 1. What This Project Is

TheraSense is a teleconsultation platform for patient-therapist sessions.

It includes:

- Authentication and role-based dashboards (patient and therapist).
- Appointment/session booking and management.
- Live video calls using WebRTC.
- Therapist-side live emotion analysis from incoming video stream.
- Session report generation (including PDF export).
- Journals and therapist journal access for assigned patients.
- In-app AI chatbot support.
- Backend email workflows (booking confirmation, reminders, emergency alerts).

## 2. Tech Stack

### Frontend

- React + Vite
- React Router
- Firebase client SDK (Auth + Firestore)
- Socket.IO client
- Chart libraries for analytics
- html2canvas + jsPDF for PDF report export

### Backend

- Node.js + Express
- Socket.IO server (signaling)
- Firebase Admin SDK
- Nodemailer
- node-cron
- Gemini API integration for chat endpoint

### Optional Python service

- Flask + matplotlib
- Receives emotion updates and returns/generated PNG graph

### Data + Infra

- Firebase Authentication
- Cloud Firestore

## 3. Repository Structure and Purpose

Root level:

- `server.js`: main backend API + socket signaling + static serving.
- `app.py`: optional Flask graph microservice.
- `firestore.rules`: Firestore security rules.
- `firebase.json`: Firebase config reference (rules file binding).
- `package.json`: root scripts to run server/frontend/ngrok together.
- `requirements.txt`: Python requirements for `app.py`.

Frontend app:

- `frontend-react/src/main.jsx`: React entry with Theme/Auth providers + router.
- `frontend-react/src/App.jsx`: route table and access protection.
- `frontend-react/src/lib/firebase.js`: Firebase initialization.
- `frontend-react/src/context/AuthContext.jsx`: auth listener + role hydration.
- `frontend-react/src/hooks/*`: workspace/business data loading by role.
- `frontend-react/src/pages/*`: route-level UI screens.
- `frontend-react/src/components/*`: reusable visual/business components.
- `frontend-react/src/utils/*`: report analytics, call navigation, auth helpers, PDF export.

ML and model assets:

- `models/`: frontend-served model files for face-api and keras artifacts.
- `Face_Emotion_Recognition_Machine_Learning/`: separate Python/TensorFlow scripts.
- `face-api.js/`: vendored face-api.js project and source.

## 4. Environment and Prerequisites

Install:

1. Node.js 18+ and npm.
2. Python 3.10+ if using Flask/ML scripts.
3. Firebase project with Firestore and Auth enabled.

Install dependencies:

1. At root: `npm install`
2. Frontend: `cd frontend-react && npm install`
3. Python (optional): `pip install -r requirements.txt`

### Environment variables used

Backend (`server.js`) expects variables like:

- `GEMINI_API_KEY`
- `APP_BASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`

Frontend expects:

- `VITE_GEMINI_API_KEY` (for direct client chatbot path)
- Optional TURN vars for stronger WebRTC networking:
  - `VITE_TURN_URL`
  - `VITE_TURN_USERNAME`
  - `VITE_TURN_CREDENTIAL`

Important:

- Do not commit real keys/secrets.
- If keys were exposed previously, rotate them in Firebase/Google/SMTP.

## 5. How to Run (From Scratch)

### Recommended dev mode

From root:

1. `npm run server` (starts Express + Socket.IO at port 3000)
2. `cd frontend-react && npm run dev` (starts Vite dev server)

Or from root combined script:

- `npm run dev`

Note:

- Root `dev` also starts ngrok (`npm run ngrok`), so if ngrok is not installed/configured this script can fail.

### Production-like mode

1. Build frontend: `cd frontend-react && npm run build`
2. Run backend from root: `node server.js`
3. Open: `http://localhost:3000`

### Optional Python graph service

From root:

- `py app.py`

It serves:

- `POST /update-emotion`
- `GET /emotion-graph`
- `GET /health`

## 6. End-to-End Runtime Architecture

At runtime there are three active channels:

1. Frontend <-> Firestore/Auth (direct Firebase SDK calls).
2. Frontend <-> Node backend REST endpoints (booking/reminder/emergency/chat, static assets).
3. Frontend <-> Node backend Socket.IO for signaling; media remains browser-to-browser over WebRTC.

## 7. Authentication and Role Resolution Flow

1. User signs in/up in `frontend-react/src/pages/Login.jsx`.
2. Firebase Auth authenticates user.
3. User profile doc is created/updated in `users/{uid}`.
4. `AuthContext` (`onAuthStateChanged`) loads role from Firestore.
5. Route protection in `ProtectedRoute` uses role and auth state.

## 8. Firestore Collections and How They Link

### `users`

Contains identity profile and role.

Common fields:

- `name`, `email`, `phone`, `age`, `role`, `createdAt`, `lastLogin`

### `sessions`

Appointment records linking patient and therapist.

Common fields:

- `patientId`, `patientName`
- `therapistId`, `therapistName`
- `status` (`pending`, `confirmed`, `active`, `completed`, `cancelled`)
- `roomId`
- `scheduledAt`, `startTime`, `createdAt`

### `reports`

Saved by therapist at call end.

Contains:

- session IDs
- patient/therapist identifiers
- emotion summary and timeline data
- analytical payload used by reports/PDF

### `therapistPatients`

Bridge assignment doc created at booking time.

- Doc id pattern: `therapistId_patientId`
- Used by rules to gate therapist access to patient journals.

### `journals`

Patient journal entries.

- `userId`, `role`, `content`, `mood`, `createdAt`

### `sessionMetadata`

Therapist call-end metadata.

- Duration
- stress metrics
- peak moments
- mood transitions
- alert events

### Other collections referenced by UI

- `patientJournals`
- `sessionPreparations`
- `patientTherapistMessages`
- `therapistNotes`

If these are needed in production, ensure rules permit them.

## 9. Security Rules Model

Rules in `firestore.rules` enforce:

- Signed-in ownership constraints on `users`.
- Patient-only session creation for self.
- Session read/update/delete for involved patient/therapist.
- Therapist-only report creation/update/delete for own reports.
- Journal access by owner patient or assigned therapist.
- Deny-by-default fallback for everything else.

## 10. Booking Workflow

Patient booking path (`usePatientWorkspaceData.bookAppointment`):

1. Creates a session doc in `sessions`.
2. Creates/merges `therapistPatients` assignment.
3. Calls backend `POST /send-booking-email` with session id.
4. Backend reads session + user profiles via Firebase Admin.
5. Backend sends confirmation email to patient and therapist.

## 11. Session Management Workflow

Therapist workspace (`useTherapistWorkspaceData`) can:

- accept -> `confirmed`
- start -> `active`
- end -> `completed`

Session start/join checks happen in `sessionCall.js`:

- Validates session exists.
- Validates status is `active` before entering call.
- Sets active session context in sessionStorage.
- Navigates to `/video-call/:roomId`.

## 12. Video Call System (How It Actually Works)

### Route and role switch

- `VideoCall.jsx` loads either `Patient.jsx` or `Therapist.jsx` by user role.

### Signaling server behavior

In `server.js`:

- Maintains in-memory `Map` keyed by session id:
  - `{ patient: socketId | null, therapist: socketId | null }`
- Handles `join-session` events.
- Emits `session-state` presence to room.
- Routes `signal` payloads to opposite role.

### WebRTC behavior in frontend

Both `Patient.jsx` and `Therapist.jsx`:

- Create `RTCPeerConnection` with STUN and optional TURN.
- Open camera/mic via `getUserMedia`.
- Add tracks.
- Exchange SDP offer/answer and ICE candidates through socket signaling.
- Render local and remote streams.
- Handle reconnect/restart when connection becomes unstable.

Important:

- Video/audio data does not pass through Node server; only signaling does.

## 13. Emotion Detection and Analytics Workflow

Therapist side (`Therapist.jsx`):

1. Loads face-api.js script and models from `/face-api.js` and `/models`.
2. Runs periodic face expression inference on remote video.
3. Computes top emotion + confidence + stress score.
4. Appends timeline entries.
5. Raises live stress alerts over threshold.
6. Sends lightweight emotion updates over socket.

Analytics logic is split into:

- `sessionAnalytics.js` for stress/mood metrics.
- `reportBuilder.js` for report composition and recommendations.

## 14. Report and PDF Flow

At therapist call end:

1. Build report preview from timeline + notes.
2. Save report to `reports` collection.
3. Save computed metadata to `sessionMetadata/{sessionId}`.
4. Optional PDF generation uses `generatePDF.js` (html2canvas + jsPDF).

## 15. Journal and Communication Features

### Patient journal

- Patient writes entries in `Journal.jsx` to `journals`.

### Therapist journal view

- `TherapistJournal.jsx` loads assigned patients from sessions.
- Loads selected patient journals from `journals`.

### Notifications bell

- Polls recent sessions/reports relevant to current role.
- Shows upcoming sessions and new reports.

### Therapist messenger/chat components

- Present in dashboard/components and store/retrieve message data from Firestore collections.

## 16. AI Chat Paths

There are two AI interaction patterns in codebase:

1. Client-direct Gemini call (`frontend-react/src/lib/geminiApi.js`) via `VITE_GEMINI_API_KEY`.
2. Backend `/chat` endpoint in `server.js` using server-side `GEMINI_API_KEY`.

If standardizing for production, prefer backend-mediated chat for key protection and policy control.

## 17. Email and Reminder Backend Logic

Backend endpoints:

- `POST /send-booking-email`
- `POST /send-reminder-email`
- `POST /send-emergency-email`

Cron job:

- Runs every minute.
- Scans sessions.
- Sends reminder when session time is ~10 minutes away.
- Marks reminder timestamp in session doc to avoid duplicate sends.

## 18. Optional Python Service Explained

`app.py` is a lightweight graph microservice:

- Stores rolling in-memory emotion history (last 30 points).
- Returns a generated PNG graph after each update.
- Useful if you want a separate Python-based visualization path.

It is not required for core Node + React + Firebase call workflow.

## 19. Why `npm run dev` or `py app.py` May Fail

Common causes for exit code 1:

1. Missing dependencies (`npm install` not completed in root or frontend).
2. Ngrok not installed/configured while using root `npm run dev` script.
3. Missing env variables (Firebase Admin, SMTP, Gemini).
4. Port conflicts on `3000` or `5173` or `5000`.
5. Python packages missing (`Flask`, `matplotlib`) for `app.py`.

Quick recovery:

1. Install root deps and frontend deps.
2. Start backend and frontend separately first.
3. Add minimum env vars needed by your chosen features.
4. Test in this order:
   - frontend loads
   - login works
   - session list loads
   - call join works
   - report save works

## 20. Suggested From-Scratch Bring-Up Order

If you were onboarding a new machine/team member:

1. Install Node/Python tools.
2. Install npm deps in root + frontend.
3. Configure Firebase project and Firestore rules.
4. Configure env vars (Firebase Admin + SMTP + Gemini).
5. Run backend (`node server.js`).
6. Run frontend (`npm run dev` inside `frontend-react`).
7. Create test patient and therapist accounts.
8. Book session, move status to `active`, join call.
9. End call and verify report/sessionMetadata writes.
10. Verify reminder/emergency email endpoints.

## 21. Important Notes for Production Hardening

- Remove hardcoded secrets and rotate any exposed keys.
- Keep all generative AI calls behind backend where possible.
- Add stricter validation for API payloads.
- Add integration tests for booking and call lifecycle.
- Expand Firestore rules for all collections you actively use.
- Replace in-memory socket session map with shared state if scaling to multiple backend instances.

---

If you want, the next step can be a second markdown file with architecture diagrams (sequence diagrams + data model tables) to make this even easier for handoff to new developers.
