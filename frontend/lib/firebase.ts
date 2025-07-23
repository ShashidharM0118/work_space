import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from "firebase/auth";
import { getFirestore, doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, setDoc, getDoc, getDocs, limit, Timestamp } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB39qm8EN6MJQqIhKpLUSRLNKDhhTCE8aA",
  authDomain: "typio-57fa9.firebaseapp.com",
  projectId: "typio-57fa9",
  storageBucket: "typio-57fa9.firebasestorage.app",
  messagingSenderId: "172519754508",
  appId: "1:172519754508:web:898f3afc8a28b21094d729",
  measurementId: "G-FZRJ65M4FK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics only on client side
let analytics: any = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('✅ Successfully signed in:', result.user.email);
    
    // Create or update user profile
    await createOrUpdateUserProfile(result.user);
    
    return result;
  } catch (error: any) {
    console.error('❌ Firebase Auth Error:', {
      code: error.code,
      message: error.message,
      details: error
    });
    
    // Enhanced error logging for debugging
    if (error.code === 'auth/unauthorized-domain') {
      console.error('🔧 Fix: Add the following domains to Firebase Console → Authentication → Settings → Authorized domains:');
      console.error('  - localhost');
      console.error('  - 127.0.0.1');
      console.error(`  - ${window.location.hostname}`);
      console.error(`  - ${window.location.origin}`);
    }
    
    throw error;
  }
};

export const signOutUser = () => signOut(auth);

// User Profile Management
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  lastActiveAt: string;
  totalRoomsJoined: number;
  totalOfficesOwned: number;
}

export const createOrUpdateUserProfile = async (user: User) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    const now = new Date().toISOString();
    
    if (userSnap.exists()) {
      // Update existing user
      await updateDoc(userRef, {
        lastActiveAt: now,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
    } else {
      // Create new user profile
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: now,
        lastActiveAt: now,
        totalRoomsJoined: 0,
        totalOfficesOwned: 0
      };
      await setDoc(userRef, newProfile);
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
  }
};

// Room Management
export interface RoomMembership {
  roomId: string;
  roomName: string;
  officeId: string;
  officeName: string;
  joinedAt: string;
  lastActiveAt: string;
  role: 'owner' | 'member' | 'guest';
  isActive: boolean;
}

export interface UserRooms {
  userId: string;
  recentRooms: RoomMembership[];
  ownedOffices: string[];
  memberOffices: string[];
  totalRoomsJoined: number;
  lastUpdatedAt: string;
}

export const joinRoom = async (userId: string, roomId: string, roomName: string, officeId: string, officeName: string, role: 'owner' | 'member' | 'guest' = 'member') => {
  try {
    const now = new Date().toISOString();
    
    // Update user rooms
    const userRoomsRef = doc(db, 'userRooms', userId);
    const userRoomsSnap = await getDoc(userRoomsRef);
    
    let userRooms: UserRooms;
    
    if (userRoomsSnap.exists()) {
      userRooms = userRoomsSnap.data() as UserRooms;
    } else {
      userRooms = {
        userId,
        recentRooms: [],
        ownedOffices: [],
        memberOffices: [],
        totalRoomsJoined: 0,
        lastUpdatedAt: now
      };
    }
    
    // Remove existing entry for this room if exists
    userRooms.recentRooms = userRooms.recentRooms.filter(room => room.roomId !== roomId);
    
    // Add new room to the beginning
    const newMembership: RoomMembership = {
      roomId,
      roomName,
      officeId,
      officeName,
      joinedAt: now,
      lastActiveAt: now,
      role,
      isActive: true
    };
    
    userRooms.recentRooms.unshift(newMembership);
    
    // Keep only last 20 rooms
    userRooms.recentRooms = userRooms.recentRooms.slice(0, 20);
    
    // Update office lists
    if (role === 'owner' && !userRooms.ownedOffices.includes(officeId)) {
      userRooms.ownedOffices.push(officeId);
    } else if (role !== 'owner' && !userRooms.memberOffices.includes(officeId)) {
      userRooms.memberOffices.push(officeId);
    }
    
    userRooms.totalRoomsJoined += 1;
    userRooms.lastUpdatedAt = now;
    
    await setDoc(userRoomsRef, userRooms);
    
    // Update room members
    const roomMembersRef = doc(db, 'roomMembers', roomId);
    const roomMembersSnap = await getDoc(roomMembersRef);
    
    let roomMembers: any = {};
    if (roomMembersSnap.exists()) {
      roomMembers = roomMembersSnap.data();
    }
    
    roomMembers[userId] = {
      userId,
      displayName: auth.currentUser?.displayName || '',
      email: auth.currentUser?.email || '',
      photoURL: auth.currentUser?.photoURL || '',
      joinedAt: now,
      lastActiveAt: now,
      role,
      isActive: true
    };
    
    await setDoc(roomMembersRef, roomMembers);
    
    // Update user profile stats
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      totalRoomsJoined: userRooms.totalRoomsJoined,
      lastActiveAt: now
    });
    
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
};

export const leaveRoom = async (userId: string, roomId: string) => {
  try {
    const now = new Date().toISOString();
    
    // Update user rooms
    const userRoomsRef = doc(db, 'userRooms', userId);
    const userRoomsSnap = await getDoc(userRoomsRef);
    
    if (userRoomsSnap.exists()) {
      const userRooms = userRoomsSnap.data() as UserRooms;
      
      // Mark room as inactive
      userRooms.recentRooms = userRooms.recentRooms.map(room => 
        room.roomId === roomId 
          ? { ...room, isActive: false, lastActiveAt: now }
          : room
      );
      
      userRooms.lastUpdatedAt = now;
      await setDoc(userRoomsRef, userRooms);
    }
    
    // Update room members
    const roomMembersRef = doc(db, 'roomMembers', roomId);
    const roomMembersSnap = await getDoc(roomMembersRef);
    
    if (roomMembersSnap.exists()) {
      const roomMembers = roomMembersSnap.data();
      if (roomMembers[userId]) {
        roomMembers[userId].isActive = false;
        roomMembers[userId].lastActiveAt = now;
        await setDoc(roomMembersRef, roomMembers);
      }
    }
    
  } catch (error) {
    console.error('Error leaving room:', error);
    throw error;
  }
};

export const getUserRooms = async (userId: string): Promise<UserRooms | null> => {
  try {
    const userRoomsRef = doc(db, 'userRooms', userId);
    const userRoomsSnap = await getDoc(userRoomsRef);
    
    if (userRoomsSnap.exists()) {
      return userRoomsSnap.data() as UserRooms;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user rooms:', error);
    return null;
  }
};

export const getRecentRooms = async (userId: string, limit: number = 10): Promise<RoomMembership[]> => {
  try {
    const userRooms = await getUserRooms(userId);
    if (!userRooms) return [];
    
    return userRooms.recentRooms
      .filter(room => room.isActive)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting recent rooms:', error);
    return [];
  }
};

export const getOwnedOffices = async (userId: string): Promise<string[]> => {
  try {
    const userRooms = await getUserRooms(userId);
    if (!userRooms) return [];
    
    return userRooms.ownedOffices;
  } catch (error) {
    console.error('Error getting owned offices:', error);
    return [];
  }
};

export const subscribeToUserRooms = (userId: string, callback: (userRooms: UserRooms | null) => void) => {
  const userRoomsRef = doc(db, 'userRooms', userId);
  
  return onSnapshot(userRoomsRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as UserRooms);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to user rooms:', error);
    callback(null);
  });
};

// Join Request Functions
export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  officeId: string;
  officeName: string;
  ownerId: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  updatedAt: string;
}

export const createJoinRequest = async (request: Omit<JoinRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'joinRequests'), {
      ...request,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating join request:', error);
    throw error;
  }
};

export const updateJoinRequestStatus = async (requestId: string, status: 'approved' | 'denied') => {
  try {
    await updateDoc(doc(db, 'joinRequests', requestId), {
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating join request:', error);
    throw error;
  }
};

export const deleteJoinRequest = async (requestId: string) => {
  try {
    await deleteDoc(doc(db, 'joinRequests', requestId));
  } catch (error) {
    console.error('Error deleting join request:', error);
    throw error;
  }
};

export const subscribeToJoinRequests = (ownerId: string, callback: (requests: JoinRequest[]) => void) => {
  const q = query(
    collection(db, 'joinRequests'),
    where('ownerId', '==', ownerId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const requests: JoinRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() } as JoinRequest);
    });
    callback(requests);
  });
};

export const subscribeToUserJoinRequests = (userId: string, callback: (requests: JoinRequest[]) => void) => {
  const q = query(
    collection(db, 'joinRequests'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const requests: JoinRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() } as JoinRequest);
    });
    callback(requests);
  });
};

export default app; 