# PROJECT BACKEND SYSTEM GUIDE

This document explains the project end-to-end with a backend-first perspective, so you can:

- rebuild the backend in another repository,
- connect a different frontend safely,
- understand all core flows, contracts, and data dependencies.

## 1. OVERVIEW

### What the project does

TheraSense is a teleconsultation platform for patient-therapist sessions with:

- authentication and role-based access,
- session booking and scheduling,
- live peer-to-peer video calls,
- therapist-side live emotion analysis,
- report generation and PDF export,
- AI chatbot support,
- booking/reminder/emergency email workflows.

### Main components

#### Frontend

- React app (`frontend-react`) handles UI, Firebase client access, WebRTC, and therapist analytics UX.

#### Backend

- Node + Express + Socket.IO (`server.js`) handles signaling, email APIs, cron reminders, static model hosting, and chatbot endpoint.

#### Firebase

- Firebase Auth: identity.
- Firestore: app state and documents (`users`, `sessions`, `reports`, etc.).
- Firebase Admin SDK (backend): privileged reads/writes for server operations.

#### WebRTC

- Browser-to-browser media transport.
- Backend only relays signaling metadata (offer/answer/ICE and peer state).

#### AI

- Emotion detection: face-api.js in therapist client.
- Chatbot: Gemini integration in both frontend helper and backend `/chat` API path.

## 2. SYSTEM ARCHITECTURE

### Frontend to backend connection

In development, Vite proxies requests from frontend to backend (`frontend-react/vite.config.js`):

- `/chat`
- `/send-booking-email`
- `/send-reminder-email`
- `/send-emergency-email`
- `/models`
- `/face-api.js`
- `/socket.io` (WebSocket enabled)

In production, backend serves frontend build (`frontend-react/dist`) directly on port `3000`.

### Backend to Firebase connection

Backend initializes Firebase Admin from env vars:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

If admin credentials are missing, server still starts but Firestore-admin-dependent features (emails/reminders) fail with logged warnings.

### WebRTC architecture: signaling vs media

- Signaling path: Browser <-> Socket.IO server <-> Browser.
- Media path: Browser <-> Browser (direct peer connection).

Backend keeps in-memory session peer map:

- `Map<sessionId, { patient: socketId | null, therapist: socketId | null }>`

Signaling events are routed to opposite role by session context.

### AI integration

- Emotion AI:
  - therapist loads face-api script from backend static route `/face-api.js/dist/face-api.js`,
  - models from `/models`,
  - inference loop runs in therapist browser.
- Chatbot AI:
  - backend `/chat` calls Gemini via server key,
  - frontend also has optional direct Gemini helper path.

## 3. AUTHENTICATION FLOW

Step-by-step:

1. User signs in/up from `Login.jsx`.
2. Firebase Auth creates session (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, Google popup flow).
3. Firestore `users/{uid}` document is created/updated on signup and login.
4. `AuthContext` listens with `onAuthStateChanged`.
5. `AuthContext` fetches role from Firestore (`users/{uid}.role`).
6. Protected routes gate UI by role (`patient`, `therapist`).
7. User is redirected to role-appropriate routes and dashboards.

## 4. FIRESTORE DATA MODEL

### users

Purpose: identity profile and role source of truth.

Typical fields:

- `name: string`
- `email: string`
- `phone: string`
- `age: number | null`
- `role: 'patient' | 'therapist'`
- `createdAt: timestamp`
- `lastLogin: timestamp`

Relationships:

- `users.uid` links to `sessions.patientId` and `sessions.therapistId`.
- `users.uid` links to `reports.patientId` and `reports.therapistId`.

### sessions

Purpose: appointment/call lifecycle entity.

Typical fields:

- `patientId: string`
- `patientName: string`
- `therapistId: string`
- `therapistName: string`
- `status: string` (`pending`, `confirmed`, `active`, `completed`, `cancelled`)
- `roomId: string`
- `scheduledAt: timestamp`
- `startTime: timestamp`
- `createdAt: timestamp`
- `reminderEmailSentAt?: timestamp`

Relationships:

- one session links one patient and one therapist.
- one session can produce one or more report snapshots (by `sessionId`).

### reports

Purpose: therapist-generated post-session report.

Typical fields:

- `sessionId: string`
- `patientId: string`
- `therapistId: string`
- `patientName: string`
- `therapistName: string`
- `summary: string`
- `emotionSummary: string`
- `emotionData: object` (timeline/series/recommendations)
- `createdAt: timestamp`

Relationships:

- linked to `sessions` via `sessionId`.

### therapistPatients

Purpose: assignment bridge enabling therapist-patient association.

Typical fields:

- `therapistId: string`
- `patientId: string`
- `createdAt: timestamp`

Document id convention:

- `${therapistId}_${patientId}`

Relationships:

- used by rules to authorize therapist access to patient journals.

### journals

Purpose: patient written journal entries.

Typical fields:

- `userId: string`
- `role: 'patient'`
- `content: string`
- `mood: number | null`
- `createdAt: timestamp`

Relationships:

- `journals.userId -> users.uid`

### sessionMetadata

Purpose: analytics payload stored at therapist call end.

Typical fields:

- `sessionId`
- `therapistId`
- `patientId`
- `startedAt`
- `endedAt`
- `durationMinutes`
- `averageStressScore`
- `maxStressScore`
- `peakStressMoments[]`
- `moodChanges[]`
- `liveAlerts[]`
- `totalReadings`
- `createdAt`

Relationships:

- same logical key as session (`sessionMetadata/{sessionId}`).

## 5. BOOKING FLOW

1. Patient submits booking form in frontend.
2. `usePatientWorkspaceData.bookAppointment` writes `sessions` doc.
3. Same flow upserts `therapistPatients/{therapistId_patientId}`.
4. Frontend sends `POST /send-booking-email` with `sessionId` and `meetingLink`.
5. Backend fetches session + both user profiles using Firebase Admin.
6. Backend sends confirmation emails to patient and therapist.

Persistence order is important:

- session is written first,
- assignment bridge second,
- email trigger third (best effort, non-blocking from UI perspective).

## 6. VIDEO CALL FLOW

### End-to-end logic

1. User attempts join from session UI.
2. Frontend validates session exists and status is `active`.
3. Frontend stores active session context in sessionStorage and navigates to `/video-call/:roomId`.
4. Role-specific page (`Patient.jsx` or `Therapist.jsx`) initializes socket + peer connection.
5. Both sides emit `join-session` with `{ sessionId, role }`.
6. Backend registers socket in in-memory session map and emits `session-state`.
7. Each side initializes `RTCPeerConnection`, local media, and tracks.
8. Offer/answer exchange over `signal` event.
9. ICE candidates exchange over `signal` event.
10. Media stream becomes direct peer-to-peer.

### Event details

- `join-session`: join and identify role.
- `session-state`: peer presence booleans.
- `signal`: unified signaling payload (description or candidate).
- `join-session-ack`: server acknowledgement.

Legacy compatibility events (`offer`, `answer`, `ice-candidate`) are still handled.

### Clarification

- Backend is signaling only.
- Media does not traverse backend.

## 7. EMOTION DETECTION FLOW

Therapist page performs live detection on remote video:

1. Load face-api script and model manifests from backend static routes.
2. Configure detector (`TinyFaceDetectorOptions`).
3. Run interval loop (about every 200ms).
4. Detect faces + expressions from remote video frames.
5. Derive top emotion and confidence.
6. Compute stress score and mood state.
7. Append timeline samples with timestamp and expression vector.
8. Trigger local alert entries when stress threshold is crossed.
9. Emit lightweight `emotion_update` signal payload (for peer/session context).

Data capture granularity:

- per detection tick, with bounded timeline history (`TIMELINE_LIMIT`).

Storage:

- timeline and derived analytics are persisted at session end in `reports` and `sessionMetadata`.

## 8. GRAPH + ANALYTICS

### Visualization

Two chart paths are used:

- `Graph.jsx` uses Recharts line series for emotion probabilities (`happy`, `neutral`, `sad`, `angry`, `fear`).
- `SessionTimelineReplay.jsx` uses Chart.js line for confidence over time.

### Filtering

- Timeline normalization filters out falsey entries.
- Report lists support search filtering by patient/summary text.
- Session lists filter by status and search text.

### Smoothing

- Recharts uses line type `monotone`.
- Chart.js timeline uses `tension: 0.32`.

There is no separate statistical smoothing pass (like moving average) in current implementation; smoothing is visual interpolation from chart libraries.

## 9. REPORT GENERATION

### Build process

At therapist call end:

1. Build report payload with `buildTheraSenseReport`.
2. Compute stress/mood/session metrics with `buildSessionMetadata`.
3. Save report to Firestore `reports`.
4. Save metadata to `sessionMetadata/{sessionId}`.

### Emotion summary calculation

`reportBuilder.js` computes:

- dominant emotion,
- priority emotion selection,
- stress/risk label,
- AI-style summary string,
- recommendations list,
- emotion breakdown percentages.

### PDF generation

Two methods:

- DOM capture path (`generateReportPDF`) via html2canvas + jsPDF.
- Data-only path (`generateReportPdfFromData`) directly writing values into PDF.

## 10. CHATBOT SYSTEM

### Frontend chat flow

1. User sends message from chatbot component.
2. UI appends user message locally.
3. Frontend invokes Gemini helper (`sendGeminiMessage`) with role mode + short history.
4. Response appended as assistant message.

### Backend `/chat` endpoint

- Accepts message + role.
- Builds role-aware system prompt.
- Calls Gemini model and returns text reply.

### AI API integration

- Backend uses `@google/generative-ai` with `GEMINI_API_KEY`.
- Frontend direct path uses `VITE_GEMINI_API_KEY`.

For strict secret management, prefer only backend path in production.

## 11. BACKEND API ENDPOINTS

Base URL in local production-like mode: `http://localhost:3000`

### POST /send-booking-email

Purpose: send booking confirmation to patient and therapist.

Request body:

```json
{
  "sessionId": "abc123",
  "meetingLink": "http://localhost:3000/patient?sessionId=abc123"
}
```

Success response:

```json
{
  "ok": true
}
```

Common errors:

- `400`: `{ "error": "sessionId is required" }`
- `500`: `{ "error": "Session not found" }` or mail/profile error message.

### POST /send-reminder-email

Purpose: send reminder (typically 10 min before session).

Request body:

```json
{
  "sessionId": "abc123"
}
```

Success responses:

```json
{ "ok": true }
```

or (skip conditions):

```json
{ "skipped": true, "reason": "Already sent" }
```

Possible skip reasons:

- `Session missing`
- `Already sent`
- `Not in reminder window`
- `Missing email address`

### POST /send-emergency-email

Purpose: send emergency alert email.

Request body:

```json
{
  "patientId": "uid_patient",
  "emergencyEmail": "optional@example.com",
  "location": { "latitude": 12.34, "longitude": 56.78 }
}
```

Success response:

```json
{ "ok": true }
```

Common errors:

- patient profile missing,
- emergency email missing (payload and profile),
- SMTP failure.

### POST /chat

Purpose: AI assistant reply generation.

Request body:

```json
{
  "message": "I am feeling anxious before tomorrow's session",
  "role": "patient"
}
```

Success response:

```json
{
  "reply": "...generated text..."
}
```

Common errors:

- `400`: message missing.
- `500`: Gemini key missing or provider failure.

## 12. REAL-TIME FEATURES

### Firestore listeners

Used in specific modules:

- `Reports.jsx`: `onSnapshot` for therapist report stream.
- `TherapistMessenger.jsx`: `onSnapshot` for chat conversation messages.

Other screens often use one-time `getDocs/getDoc` plus manual refresh.

### Socket.IO events

Core server events:

- incoming: `join-session`, `signal`, `emotion_update`, legacy signaling events.
- outgoing: `join-session-ack`, `session-state`, `signal`.

### Session updates

- Session status updates happen through Firestore writes (`updateDoc` in therapist workspace hooks).
- UI reflects updates via refetch or role-specific data hooks.

## 13. ENVIRONMENT SETUP

### Run backend

From project root:

- `npm install`
- `node server.js` or `npm run server`

### Run frontend

From `frontend-react`:

- `npm install`
- `npm run dev`

### Required env variables

Backend critical:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `FROM_EMAIL` or `SMTP_USER`
- `GEMINI_API_KEY`
- `APP_BASE_URL`

Frontend critical:

- `VITE_GEMINI_API_KEY` (if using direct frontend chatbot)
- optional TURN vars for robust NAT traversal.

### Ports

- Backend: `3000`
- Frontend (Vite dev): typically `5173`
- Optional Flask service: `5000`

## 14. COMMON BUGS + FIXES

### Duplicate data issue

Symptoms:

- duplicate socket event processing,
- repeated report/message list updates.

Current mitigations:

- explicit `socket.off(...)` before re-registering listeners,
- cleanup on unmount (`removeAllListeners`, disconnect),
- unsubscribe functions for Firestore `onSnapshot`.

Recommended hardening:

- add idempotency keys for write actions (booking/report save),
- disable booking button while request is in-flight.

### WebRTC connection failure

Symptoms:

- no remote stream,
- ICE disconnected/failed.

Troubleshooting:

- ensure session status is `active`,
- verify both peers joined same `sessionId`,
- verify `/socket.io` connectivity,
- provide TURN server vars in restrictive networks,
- inspect browser permissions for camera/mic.

### Firebase auth issues

Symptoms:

- login works but role missing/redirect fails,
- permission denied on Firestore actions.

Fixes:

- verify `users/{uid}` exists and has `role`,
- verify rules align with collection usage,
- ensure correct Firebase project config in frontend.

### Port conflicts

Symptoms:

- server fails to boot or Vite fails to start.

Fixes:

- free ports `3000`, `5173`, `5000`,
- run backend/frontend separately to isolate failures,
- avoid combined `npm run dev` until basic startup succeeds.

## 15. HOW TO REUSE THIS BACKEND

This section is the integration contract for an external frontend.

### A. Required APIs to integrate

Your new frontend must call:

- `POST /send-booking-email`
- `POST /send-reminder-email`
- `POST /send-emergency-email`
- `POST /chat`

And connect to Socket.IO namespace at backend origin for:

- `join-session`, `signal`, `session-state`, `join-session-ack`.

### B. Required Firestore structure

Minimum required collections for backend-compatible behavior:

- `users` with `role` and email/name fields,
- `sessions` with patient/therapist IDs, status, room/time fields,
- `therapistPatients` for assignment bridge,
- `reports` for call-end outputs,
- `sessionMetadata` for analytics.

### C. Required auth flow

External frontend must:

1. authenticate via Firebase Auth,
2. ensure `users/{uid}` exists with correct `role`,
3. gate routes/actions by role,
4. send authenticated Firestore operations according to rules.

### D. Required session structure and lifecycle

Required session fields to join calls reliably:

- `patientId`
- `therapistId`
- `status`
- `roomId`
- `startTime` or `scheduledAt`

Status contract expected by call join logic:

- call join permitted when `status === 'active'`.

### E. Socket contract for new frontend

Client must implement:

1. emit `join-session` once connected with `{ sessionId, role }`.
2. wait for `session-state` and/or peer availability.
3. exchange SDP/ICE through `signal` event payloads.
4. handle reconnect and re-emit `join-session`.

### F. Backend extraction blueprint (for another project)

If reusing backend in a new repository:

1. Copy `server.js` core modules:
   - express bootstrap,
   - firebase admin init,
   - nodemailer config,
   - endpoint handlers,
   - socket signaling manager.
2. Keep same API contracts and socket event names.
3. Keep same Firestore collection names or create adapter layer.
4. Externalize all secrets into environment variables.
5. Add validation middleware (recommended) before production use.

### G. Minimum integration checklist for separate frontend

1. Firebase config points to same project.
2. Role docs exist under `users/{uid}`.
3. Session CRUD writes required fields.
4. Status transitions include `active` before join.
5. Socket client handles `join-session`, `signal`, `session-state`.
6. Booking flow calls `/send-booking-email` after session write.
7. Therapist end flow writes `reports` and `sessionMetadata`.

---

This file is the backend blueprint and integration reference for the current project implementation.
