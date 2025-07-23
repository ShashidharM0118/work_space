# Realtime Video / Audio / Chat App

This project is a minimal proof-of-concept multi-party video conference and chat application built with **FastAPI**, **Next.js**, and **WebRTC (simple-peer)**.

## Prerequisites

* **Node.js** (v18+ recommended)
* **Python 3.9+**

## Setup

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
# Ensure the backend is reachable at ws://localhost:8000 or set a custom URL:
# echo "NEXT_PUBLIC_SIGNALING_URL=ws://your-domain-or-ip:8000" > .env.local
npm run dev
```

Open `http://localhost:3000` in multiple browser tabs or devices to test.

## How it Works

1. **Signaling**: A lightweight FastAPI WebSocket endpoint relays JSON messages between all participants in a room.
2. **WebRTC**: Each browser establishes peer-to-peer connections using [`simple-peer`](https://github.com/feross/simple-peer). The first peer in a lexicographical comparison initiates the handshake to avoid duplicate connections.
3. **Chat**: Chat messages share the same signaling channel and are displayed in real-time.

## Caveats / Next Steps

* This is a mesh topology: each participant connects to every other participant. Performance may degrade beyond ~6-8 people.
* For production, consider deploying a SFU (e.g. [mediasoup](https://mediasoup.org/) or [LiveKit](https://livekit.io/)) instead of mesh.
* Add authentication, persistence, TURN servers for NAT traversal, and HTTPS/WSS in production. 