from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import json
import logging
import uuid
from datetime import datetime
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    firebase_admin = None
    credentials = None
    firestore = None
    FIREBASE_AVAILABLE = False
    print("⚠️  Firebase not available - running without Firebase integration")
import os
import asyncio
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Virtual Office WebSocket Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase (optional, for future database integration)
if FIREBASE_AVAILABLE:
    try:
        if not firebase_admin._apps:
            # You can add Firebase credentials here if needed
            # cred = credentials.Certificate("path/to/serviceAccountKey.json")
            # firebase_admin.initialize_app(cred)
            pass
    except Exception as e:
        logger.warning(f"Firebase not initialized: {e}")
else:
    logger.info("Firebase integration disabled - running in standalone mode")

class ConnectionManager:
    """Stores active WebSocket connections grouped by room id"""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.room_participants: Dict[str, Dict[str, dict]] = {}  # room_id -> {user_id: user_info}

    async def connect(self, room_id: str, websocket: WebSocket, user_info: dict = None):
        await websocket.accept()
        self.active_connections.setdefault(room_id, []).append(websocket)
        
        # Store user info
        if user_info:
            user_id = user_info.get('id', str(uuid.uuid4()))
            self.room_participants.setdefault(room_id, {})[user_id] = {
                **user_info,
                'websocket': websocket,
                'joined_at': datetime.now().isoformat()
            }
        
        logger.info(f"✅ New connection to room {room_id}. Total in room: {len(self.active_connections[room_id])}")
        
        # Notify other participants about the new user
        if user_info:
            await self.broadcast(room_id, {
                'type': 'user_joined',
                'user': user_info,
                'participants_count': len(self.room_participants.get(room_id, {}))
            }, exclude_websocket=websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        room = self.active_connections.get(room_id)
        if room and websocket in room:
            room.remove(websocket)
            
            # Remove user from participants
            participants = self.room_participants.get(room_id, {})
            user_to_remove = None
            for user_id, user_data in participants.items():
                if user_data.get('websocket') == websocket:
                    user_to_remove = user_id
                    break
            
            if user_to_remove:
                user_info = participants.pop(user_to_remove, {})
                # Notify other participants about user leaving
                if room:  # If there are still connections
                    asyncio.create_task(self.broadcast(room_id, {
                        'type': 'user_left',
                        'user_id': user_to_remove,
                        'participants_count': len(participants)
                    }))
            
            logger.info(f"❌ Disconnection from room {room_id}. Remaining in room: {len(room)}")
            
            if not room:
                # Clean up empty room
                del self.active_connections[room_id]
                if room_id in self.room_participants:
                    del self.room_participants[room_id]
                logger.info(f"🧹 Room {room_id} is now empty and removed")

    async def broadcast(self, room_id: str, message: dict, exclude_websocket: WebSocket = None):
        logger.info(f"📡 Broadcasting to room {room_id}: {message.get('type', 'unknown')} message")
        connections = self.active_connections.get(room_id, [])
        
        for connection in connections:
            if exclude_websocket and connection == exclude_websocket:
                continue
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"❌ Failed to send message to connection: {e}")
                # Remove broken connection
                if connection in connections:
                    connections.remove(connection)

    def get_room_participants(self, room_id: str) -> List[dict]:
        participants = self.room_participants.get(room_id, {})
        return [
            {k: v for k, v in user_data.items() if k != 'websocket'}
            for user_data in participants.values()
        ]

manager = ConnectionManager()

# Pydantic models
class InviteRequest(BaseModel):
    office_id: str
    room_id: str
    inviter_name: str
    inviter_email: str
    invitee_email: str
    message: Optional[str] = None

class OfficeInfo(BaseModel):
    office_id: str
    name: str
    description: str
    created_at: str
    owner_id: str

@app.get("/")
async def healthcheck():
    logger.info("🏥 Health check requested")
    return {
        "status": "ok",
        "service": "Virtual Office WebSocket Server",
        "version": "1.0.0",
        "active_rooms": len(manager.active_connections),
        "total_connections": sum(len(conns) for conns in manager.active_connections.values())
    }

@app.get("/rooms/{room_id}/participants")
async def get_room_participants(room_id: str):
    """Get list of participants in a room"""
    participants = manager.get_room_participants(room_id)
    return {
        "room_id": room_id,
        "participants": participants,
        "count": len(participants)
    }

@app.post("/invite")
async def send_invitation(invite: InviteRequest):
    """Send email invitation to join a room"""
    try:
        # Here you would integrate with your email service
        # For now, we'll just log the invitation
        logger.info(f"📧 Invitation sent from {invite.inviter_email} to {invite.invitee_email}")
        logger.info(f"   Office: {invite.office_id}, Room: {invite.room_id}")
        
        # In a real implementation, you would:
        # 1. Generate a unique invitation link
        # 2. Send email using SendGrid, Firebase, or another service
        # 3. Store invitation in database for tracking
        
        invitation_link = f"https://your-app.com/office/{invite.office_id}?room={invite.room_id}&invited=true"
        
        # TODO: Implement actual email sending
        # send_email(
        #     to=invite.invitee_email,
        #     subject=f"Join {invite.inviter_name}'s virtual office",
        #     template="invitation",
        #     data={
        #         "inviter_name": invite.inviter_name,
        #         "invitation_link": invitation_link,
        #         "message": invite.message
        #     }
        # )
        
        return {
            "success": True,
            "message": "Invitation sent successfully",
            "invitation_link": invitation_link
        }
    except Exception as e:
        logger.error(f"❌ Failed to send invitation: {e}")
        raise HTTPException(status_code=500, detail="Failed to send invitation")

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """Handle WebSocket connections for real-time communication in rooms"""
    logger.info(f"🔗 WebSocket connection attempt for room: {room_id}")
    
    # Accept connection first
    await websocket.accept()
    
    # Wait for initial user info
    try:
        initial_data = await websocket.receive_json()
        user_info = None
        
        if initial_data.get('type') == 'join':
            user_info = {
                'id': initial_data.get('id', str(uuid.uuid4())),
                'name': initial_data.get('name', 'Anonymous'),
                'email': initial_data.get('email', ''),
                'avatar': initial_data.get('avatar', ''),
                'firebaseUid': initial_data.get('firebaseUid', ''),
                'displayName': initial_data.get('displayName', ''),
            }
            logger.info(f"👤 User {user_info['name']} (Firebase: {user_info['firebaseUid']}) joining room {room_id}")
    except Exception as e:
        logger.error(f"❌ Failed to receive initial data: {e}")
        await websocket.close()
        return
    
    # Add to connection manager
    if room_id not in manager.active_connections:
        manager.active_connections[room_id] = []
    manager.active_connections[room_id].append(websocket)
    
    if user_info:
        manager.room_participants.setdefault(room_id, {})[user_info['id']] = {
            **user_info,
            'websocket': websocket,
            'joined_at': datetime.now().isoformat()
        }
        
        # Send current participants to new user
        await websocket.send_json({
            'type': 'participants_list',
            'participants': manager.get_room_participants(room_id)
        })
        
        # Notify others about new user
        await manager.broadcast(room_id, {
            'type': 'user_joined',
            'user': user_info,
            'participants_count': len(manager.room_participants.get(room_id, {}))
        }, exclude_websocket=websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"📥 Received from room {room_id}: {data.get('type', 'unknown')} message")
            
            # Add sender info if not present
            if user_info and 'sender' not in data:
                data['sender'] = user_info['id']
            
            # Broadcast to all other participants
            await manager.broadcast(room_id, data, exclude_websocket=websocket)
            
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected from room: {room_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket error in room {room_id}: {e}")
    finally:
        manager.disconnect(room_id, websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 