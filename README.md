# Aura — MERN Speech Recognition Voice Assistant

A clean, Siri/Google-Assistant-style voice assistant. Speak in English, Tamil,
Hindi, or one of several other languages, watch your words appear in real
time, and get a natural, conversational reply from Google Gemini — spoken
back to you and saved to MongoDB.

## How it works

1. Tap the orb (or just start talking once you've granted mic access) — the
   browser's Web Speech API transcribes your voice to text in real time.
2. The recognizer automatically stops once it detects you've stopped
   speaking (no "stop recording" button needed).
3. The transcribed text is sent to the Express backend, which calls the
   Gemini API with a voice-assistant system prompt and returns a short,
   natural-language reply.
4. The reply is shown as a chat bubble, spoken aloud with the
   SpeechSynthesis API, and (if MongoDB is connected) saved to your history.
5. A ChatGPT-style **sidebar** lists every past conversation, pulled live
   from MongoDB — click one to reopen it, or hit **New chat** to start a
   fresh thread. Hover a chat to delete it.

## Project structure

```
speech-assistant-mern/
├── render.yaml                  Render Blueprint (one-click backend deploy)
├── DEPLOYMENT.md                 Full Atlas + Render + Vercel deployment guide
├── backend/                     Express + MongoDB + Gemini API
│   ├── server.js                App entry point
│   ├── Procfile                 For Railway/Heroku-style hosts
│   ├── config/db.js             MongoDB connection
│   ├── models/Conversation.js   Mongoose schema (query, response, language)
│   ├── controllers/             Request handlers
│   ├── routes/                  /api/chat routes
│   ├── utils/geminiService.js   Gemini API call + prompt
│   └── .env.example             Environment variable template
│
└── frontend/                    React (Vite)
    ├── index.html
    └── src/
        ├── App.jsx               Orchestrates speech, chat, and TTS
        ├── index.css             Theme tokens, glassmorphism, animations
        ├── api/chatApi.js        Axios calls to the backend
        ├── hooks/
        │   ├── useSpeechRecognition.js   Speech-to-text
        │   ├── useTextToSpeech.js        Text-to-speech
        │   └── useAudioLevel.js          Live mic volume (for the wave animation)
        ├── components/
        │   ├── MicButton.jsx      The orb (idle / listening / thinking / speaking)
        │   ├── WaveAnimation.jsx  Audio-reactive waveform bars
        │   ├── Sidebar.jsx        Chat history (from MongoDB), New chat, delete
        │   ├── ChatWindow.jsx     Scrollable transcript
        │   ├── MessageBubble.jsx  Chat bubble (with replay button)
        │   ├── TopBar.jsx         Brand, language picker, mute, theme
        │   ├── LanguageSelector.jsx
        │   ├── ThemeToggle.jsx
        │   └── Toast.jsx          Error banner
        ├── context/ThemeContext.jsx
        ├── utils/
        │   ├── session.js         Per-thread chat id generation/persistence
        │   └── formatTime.js      Relative timestamps for the sidebar
        └── constants/languages.js
```

## 1. Prerequisites

- Node.js 18+
- A free Gemini API key
- A free [MongoDB Atlas](https://cloud.mongodb.com) cluster (optional — the
  app works without it, it just won't save history)

> **Deploying this to the internet?** See **[DEPLOYMENT.md](./DEPLOYMENT.md)**
> for the full walkthrough (MongoDB Atlas → Render → Vercel), and
> **[SECURITY.md](./SECURITY.md)** for how the Gemini key and MongoDB
> connection stay protected. The steps below are for running it locally.

## 2. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in and click **Create API key**.
3. Copy the key — you'll paste it into `backend/.env` in the next step.

## 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and fill in:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/speech-assistant?retryWrites=true&w=majority
GEMINI_API_KEY=paste_your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

- **Setting up MongoDB Atlas (the username/password connection string)** —
  full step-by-step detail is in
  [DEPLOYMENT.md → Part 1](./DEPLOYMENT.md#part-1--mongodb-atlas), but the
  short version: create a free M0 cluster → **Database Access** → add a
  database user (this is the username/password in the URI) → **Network
  Access** → allow `0.0.0.0/0` → **Connect → Drivers** → copy the
  connection string and swap in your user's credentials plus a database
  name (e.g. `/speech-assistant`). Atlas creates that database and its
  collections automatically the first time the app writes to it — there's
  nothing to create by hand.
- **No MongoDB yet?** Leave `MONGO_URI` as a local placeholder
  (`mongodb://127.0.0.1:27017/speech-assistant`) or remove it — the server
  logs a warning and runs fine without persistence.

Start the API:

```bash
npm run dev      # with nodemon, auto-restarts on changes
# or
npm start
```

You should see:
```
🚀 Speech Assistant API running on port 5000
✅ MongoDB connected (db: "speech-assistant", host: cluster0-shard-00-01.xxxxx.mongodb.net)
```

## 4. Frontend setup

In a new terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

`frontend/.env` just needs to point at your backend:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the dev server:

```bash
npm run dev
```

Open the printed URL (usually `http://localhost:5173`). Allow microphone
access when the browser prompts you, then tap the orb and start talking.

## 5. Browser support

Speech recognition uses the Web Speech API, which currently has the best
support in **Chrome, Edge, and Safari**. Firefox does not yet support
`SpeechRecognition`; the app will detect this and show a clear
"not supported" message on the orb instead of failing silently.

## 6. Deploying

```bash
cd frontend
npm run build      # outputs static files to frontend/dist
```

Serve `frontend/dist` with any static host (Vercel, Netlify, nginx, or
Express's `express.static`), and deploy `backend/` to any Node host (Render,
Railway, Fly.io, an EC2 box, etc.) with the same environment variables set.
Remember to update `CLIENT_ORIGIN` (backend) and `VITE_API_URL` (frontend)
to your real domains.

**For the full step-by-step (MongoDB Atlas → Render → Vercel), see
[DEPLOYMENT.md](./DEPLOYMENT.md). Before you go live, also read
[SECURITY.md](./SECURITY.md) for how to lock down the Gemini key and
MongoDB connection.**

## API endpoints

| Method | Route                          | Purpose                                                |
|--------|---------------------------------|---------------------------------------------------------|
| POST   | `/api/chat`                     | Send transcribed text, get a Gemini reply, save it      |
| GET    | `/api/chat/sessions`            | List all past conversations (for the sidebar)            |
| GET    | `/api/chat/history/:sessionId`  | Get all messages in one conversation thread              |
| DELETE | `/api/chat/history/:sessionId`  | Delete one conversation thread                            |

## Notes on design choices

- **Backend-mediated Gemini calls.** The frontend never sees your Gemini API
  key — it only talks to your own Express server, which holds the key in
  `.env`. This is the secure pattern for any key you don't want exposed in
  browser code.
- **Graceful degradation.** If MongoDB isn't configured, chat still works —
  it just isn't saved. If the browser doesn't support speech recognition or
  speech synthesis, the rest of the UI still renders with a clear status
  message instead of crashing.
- **One environment variable controls the Gemini model** (`GEMINI_MODEL`),
  so you can upgrade to a newer model later without touching code.
- **No login system.** The sidebar lists every conversation stored in
  MongoDB, not just "your" conversations — there's no user account to scope
  them to. That's fine for a personal assistant or a single-user demo, but
  if multiple people will use the same deployment, you'd want to add
  authentication and filter `/api/chat/sessions` by user id.
"# mern_project" 
