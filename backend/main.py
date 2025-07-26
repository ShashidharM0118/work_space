from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import logging
import uuid
import asyncio

from app.core import manager, firebase_participants, FIREBASE_INITIALIZED

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Virtual Office WebSocket Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "firebase": FIREBASE_INITIALIZED}


class InviteRequest(BaseModel):
    office_id: str
    room_id: str
    inviter_name: str
    inviter_email: str
    invitee_email: str
    message: Optional[str] = None


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
    participants = manager.get_room_participants(room_id)
    return {
        "room_id": room_id,
        "participants": participants,
        "count": len(participants)
    }


@app.get("/offices/{office_id}/participants")
async def get_office_participants(office_id: str):
    rooms_with_participants = await firebase_participants.get_office_participants(office_id)
    total_participants = sum(len(p) for p in rooms_with_participants.values())
    return {
        "office_id": office_id,
        "rooms": rooms_with_participants,
        "total_participants": total_participants,
        "active_rooms": len([room for room, participants in rooms_with_participants.items() if participants])
    }


@app.post("/invite")
async def send_invitation(invite: InviteRequest):
    try:
        logger.info(f"📧 Invitation sent from {invite.inviter_email} to {invite.invitee_email}")
        logger.info(f"   Office: {invite.office_id}, Room: {invite.room_id}")
        invitation_link = f"https://your-app.com/office/{invite.office_id}?room={invite.room_id}&invited=true"
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
    logger.info(f"🔗 WebSocket connection attempt for room: {room_id}")
    await websocket.accept()
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
                'office_id': initial_data.get('office_id', 'default'),
                'role': initial_data.get('role', 'member'),
            }
            logger.info(f"👤 User {user_info['name']} joining room {room_id}")
    except Exception as e:
        logger.error(f"❌ Failed to receive initial data: {e}")
        await websocket.close()
        return

    await manager.connect(room_id, websocket, user_info)

    if user_info:
        await websocket.send_json({
            'type': 'participants_list',
            'participants': manager.get_room_participants(room_id)
        })

    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"📥 Received from room {room_id}: {data.get('type', 'unknown')} message")
            if user_info and 'sender' not in data:
                data['sender'] = user_info['id']
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
