# Debug Room Navigation Issue

## Problem Identified
The room ID is showing as `office-mdg73h8m-jmowk8-room-mdg73h8m-7bm7lo` instead of simple IDs like `main-hall`.

## Steps to Debug

### 1. Check the URL in your browser
When you visit a room, the URL should be something like:
- `https://your-ngrok-url/room/main-hall`
- NOT `https://your-ngrok-url/room/office-abc-room-def`

### 2. Check console logs
Open browser console and look for these logs:
- `🆔 Room ID from router: [value]`
- `🆔 Current URL: [url]`
- `🔧 Extracted room ID: [value]`
- `🔗 Using room ID for WebSocket: [value]`

### 3. Check office navigation
In the office page, when you click a room, it should navigate to `/room/main-hall` not a complex URL.

## Likely Causes

### Cause 1: Wrong navigation in office page
Check if the office page is constructing the wrong URL when joining rooms.

### Cause 2: Next.js routing issue
The dynamic route `[roomId].tsx` might be receiving the wrong parameter.

### Cause 3: URL rewriting
There might be URL rewriting happening that's changing the room ID.

## Quick Fix Test

1. Navigate directly to: `https://your-ngrok-url/room/main-hall`
2. Check if the room ID is correctly extracted as `main-hall`
3. If it works, the issue is in the office navigation logic

## Additional Logs Added

I've added debug logs to show:
- What room ID is received from Next.js router
- The current browser URL
- Room ID extraction logic
- WebSocket URL construction

Check these logs to identify where the complex room ID is coming from. 