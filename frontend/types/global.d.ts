declare module 'simple-peer' {
  interface SimplePeerData {
    type: string;
    sdp?: string;
    candidate?: RTCIceCandidate;
  }

  interface SimplePeerOptions {
    initiator?: boolean;
    trickle?: boolean;
    config?: RTCConfiguration;
  }

  interface SimplePeerInstance {
    signal(data: SimplePeerData): void;
    addStream(stream: MediaStream): void;
    on(event: 'signal', handler: (data: SimplePeerData) => void): void;
    on(event: 'stream', handler: (stream: MediaStream) => void): void;
    on(event: 'data', handler: (data: Buffer | string) => void): void;
    on(event: 'connect', handler: () => void): void;
    on(event: 'close', handler: () => void): void;
    on(event: 'error', handler: (err: Error) => void): void;
    destroy(): void;
    connected: boolean;
    destroyed: boolean;
    initiator: boolean;
    remoteStream?: MediaStream;
    _pc: RTCPeerConnection;
  }

  class SimplePeer {
    constructor(options?: SimplePeerOptions);
    static WEBRTC_SUPPORT: boolean;
    signal(data: SimplePeerData): void;
    addStream(stream: MediaStream): void;
    on(event: 'signal', handler: (data: SimplePeerData) => void): void;
    on(event: 'stream', handler: (stream: MediaStream) => void): void;
    on(event: 'data', handler: (data: Buffer | string) => void): void;
    on(event: 'connect', handler: () => void): void;
    on(event: 'close', handler: () => void): void;
    on(event: 'error', handler: (err: Error) => void): void;
    destroy(): void;
    connected: boolean;
    destroyed: boolean;
    initiator: boolean;
    remoteStream?: MediaStream;
    _pc: RTCPeerConnection;
  }

  namespace SimplePeer {
    interface Instance extends SimplePeerInstance {}
  }

  export = SimplePeer;
}

declare module 'uuid' {
  export function v4(): string;
  export function v1(): string;
  export function v3(name: string, namespace: string): string;
  export function v5(name: string, namespace: string): string;
}

// Extend MediaDevices interface for screen sharing
interface MediaDevices {
  getDisplayMedia(constraints?: DisplayMediaStreamConstraints): Promise<MediaStream>;
}

interface DisplayMediaStreamConstraints {
  video?: MediaTrackConstraints | boolean;
  audio?: MediaTrackConstraints | boolean;
}

interface MediaTrackConstraints {
  cursor?: string;
  displaySurface?: string;
  [key: string]: any;
} 