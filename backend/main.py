from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

class ConnectionManager:
    """Stores active WebSocket connections grouped by room id"""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(room_id, []).append(websocket)
        logger.info(f"✅ New connection to room {room_id}. Total in room: {len(self.active_connections[room_id])}")

    def disconnect(self, room_id: str, websocket: WebSocket):
        room = self.active_connections.get(room_id)
        if room and websocket in room:
            room.remove(websocket)
            logger.info(f"❌ Disconnection from room {room_id}. Remaining in room: {len(room)}")
            if not room:
                # Clean up empty room bucket
                del self.active_connections[room_id]
                logger.info(f"🧹 Room {room_id} is now empty and removed")

    async def broadcast(self, room_id: str, message: dict):
        logger.info(f"📡 Broadcasting to room {room_id}: {message.get('type', 'unknown')} message")
        for connection in self.active_connections.get(room_id, []):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"❌ Failed to send message to connection: {e}")

manager = ConnectionManager()

@app.get("/")
async def healthcheck():
    logger.info("🏥 Health check requested")
    return {"status": "ok"}


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """Relay any JSON payload received from one participant to all others in the room."""
    logger.info(f"🔗 WebSocket connection attempt for room: {room_id}")
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"📥 Received from room {room_id}: {data}")
            await manager.broadcast(room_id, data)
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected from room: {room_id}")
        manager.disconnect(room_id, websocket) 