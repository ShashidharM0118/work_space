# Ngrok Setup Instructions for WebSocket Fix

The WebSocket connection error occurs because ngrok needs separate tunnels for frontend and backend.

## Problem
The error shows WebSocket trying to connect to:
`wss://c5a9b4cb6872.ngrok-free.app/ws/office-mdg73h8m-jmowk8-room-mdg73h8m-7bm7lo`

But your backend only has endpoint `/ws/{room_id}` and expects simple room IDs.

## Solution: Set up two ngrok tunnels

### Step 1: Start your backend server
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 2: Start your frontend server
```bash
cd frontend
npm run dev
```

### Step 3: Create TWO ngrok tunnels

#### Terminal 1 - Backend tunnel:
```bash
ngrok http 8000
```
This will give you something like: `https://def456.ngrok-free.app`

#### Terminal 2 - Frontend tunnel:
```bash
ngrok http 3000
```
This will give you something like: `https://abc123.ngrok-free.app`

### Step 4: Set environment variable

Create a `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_BACKEND_WS_URL=wss://def456.ngrok-free.app
```

Replace `def456.ngrok-free.app` with your actual backend ngrok URL (from step 3).

### Step 5: Restart frontend
```bash
cd frontend
npm run dev
```

### Step 6: Access your app
Open `https://abc123.ngrok-free.app` (your frontend ngrok URL) in your browser.

## Alternative: Use the same tunnel (if possible)

If you want to use a single ngrok tunnel, you need to:

1. Set up a reverse proxy (like nginx) 
2. Or modify your setup to serve both frontend and backend from the same port

## Troubleshooting

1. **Check WebSocket logs**: Open browser console and look for the debug logs showing the constructed WebSocket URL
2. **Verify backend is running**: Visit `https://def456.ngrok-free.app` (your backend tunnel) - you should see the FastAPI docs
3. **Check room ID**: Make sure the room ID being passed is simple (like `main-hall`) not complex 