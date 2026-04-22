# TheraSense Architecture Diagram Prompt

Use this prompt with ChatGPT/Copilot/Claude to generate architecture diagrams for this repository.

---

You are a senior solutions architect. Generate architecture diagrams for the TheraSense telehealth platform from the project structure below.

Project context:
- Root backend files: `server.js` (Node.js/Express API), `app.py` (Python ML/service endpoint), `firebase.json`, `firestore.rules`, `requirements.txt`, `package.json`.
- Frontend app: `frontend-react/` (React + Vite, Tailwind, route-based pages for landing/login/patient/therapist/dashboard/reports/video call/chatbot).
- ML module: `Face_Emotion_Recognition_Machine_Learning/` (training/testing/realtime detection scripts).
- In-browser face stack: `face-api.js/` (local source and examples).
- Model assets: `models/` and `weights/` (face detection + expression models).
- Firebase usage: Auth + Firestore for user/session/report data.
- Real-time features: video consultation and signaling/socket flows (if inferred from code paths and dependencies).
- AI assistant integration: backend `/api/chat` endpoint calling Groq LLaMA model with server-side key.

What to produce:
1. A **high-level system architecture diagram** (client, APIs, ML, Firebase, external AI provider).
2. A **container/component diagram** showing major modules and data flows.
3. A **sequence diagram** for this flow:
   - User logs in
   - Joins therapy/video session
   - Emotion detection runs
   - Results stored/retrieved
   - User sends chatbot message
   - Backend calls Groq LLaMA
   - Response returns to UI

Output format requirements:
- Use **Mermaid** syntax.
- Provide exactly 3 diagrams in this order:
  1) flowchart (system context)
  2) flowchart (container/component)
  3) sequenceDiagram (runtime flow)
- Keep node names practical and repo-aligned (e.g., `frontend-react`, `server.js`, `app.py`, `Firebase Auth`, `Firestore`, `Groq API`, `face-api.js`, `models/weights`).
- Label arrows with protocols/payloads when possible (`HTTPS JSON`, `WebSocket`, `model inference`, `Firestore read/write`).
- Include trust boundaries:
  - Browser/client boundary
  - Backend/server boundary
  - Third-party cloud boundary
- Include a brief assumptions section before diagrams.

Quality constraints:
- Reflect this specific repo, not a generic telehealth app.
- If something is uncertain, mark it as "assumed" in labels instead of inventing facts.
- Keep diagrams readable (avoid too many tiny nodes).

Return only:
- Assumptions section
- Mermaid diagrams
- No extra commentary.

---

Optional enhancement prompt (run after first output):
"Now generate an AWS/Azure deployment architecture variant for the same system, including CDN, WAF, load balancer, autoscaling app service, managed database alternative to Firestore, object storage for model files, secrets manager, observability stack, and CI/CD pipeline. Use Mermaid and keep mapping from current repo components explicit."