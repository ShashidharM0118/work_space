# NexOffice - Next Generation Virtual Office Platform

NexOffice is a premium virtual office platform that transforms remote work experiences through immersive virtual spaces, seamless communication, and enterprise-grade collaboration tools. Built with **FastAPI**, **Next.js**, **Firebase**, and **WebRTC**.

## ✨ Features

- **🎥 4K Video Conferencing** - Crystal clear video calls with advanced quality optimization
- **🖥️ Advanced Screen Sharing** - Share your screen with real-time collaboration tools
- **🎨 Collaborative Whiteboard** - Interactive whiteboard for brainstorming and planning
- **💬 Real-time Messaging** - Instant chat with rich media support
- **🏢 Virtual Office Spaces** - Customizable virtual environments for teams
- **🔐 OAuth Integrated** - Seamless authentication with popular OAuth providers
- **📊 Activity Analytics** - Track team productivity and engagement
- **📧 Email Invitations** - Seamless team member onboarding
- **🌐 Cross-platform Support** - Works on desktop, tablet, and mobile devices

## Prerequisites

* **Node.js** (v18+ recommended)
* **Python 3.9+**
* **Firebase Account** (for authentication and database)

## Setup

### 1. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Google provider
3. Create a Firestore database
4. Copy your Firebase config to `frontend/.env.local`:

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your Firebase configuration
```

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` to access NexOffice.

## 🚀 Getting Started

1. **Sign In**: Use your Google account to sign in to NexOffice
2. **Create Office**: Set up your virtual office workspace
3. **Invite Team**: Send email invitations to team members
4. **Collaborate**: Start video calls, share screens, and work together

## Architecture

### Frontend (Next.js + TypeScript)
- **Authentication**: Firebase Auth with Google OAuth
- **Database**: Firestore for real-time data synchronization
- **WebRTC**: Peer-to-peer video/audio communication
- **UI**: Modern, responsive design with smooth animations

### Backend (FastAPI + Python)
- **WebSocket Signaling**: Real-time message relay for WebRTC
- **API Endpoints**: RESTful APIs for additional functionality
- **Scalable Architecture**: Designed for enterprise deployment

### Key Technologies
- **WebRTC**: Direct peer-to-peer communication
- **Firebase**: Authentication, database, and real-time updates
- **TypeScript**: Type-safe development
- **Responsive Design**: Mobile-first approach

## 🏢 Virtual Office Concept

NexOffice creates immersive virtual office environments where team members can:
- Navigate between different rooms (Meeting Room, Dev Space, Creative Hub)
- See who's currently online and in which rooms
- Join spontaneous conversations
- Maintain team presence and culture in remote settings

## Production Deployment

For production deployment:
1. Set up Firebase security rules
2. Configure HTTPS/WSS endpoints
3. Implement TURN servers for NAT traversal
4. Set up monitoring and analytics
5. Configure CDN for global performance

## Contributing

We welcome contributions! Please see our contributing guidelines for more information.

## License

This project is licensed under the MIT License. 