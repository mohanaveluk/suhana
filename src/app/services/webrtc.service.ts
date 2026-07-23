import { Injectable } from '@angular/core';

export type CallMediaType = 'audio' | 'video';

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * Thin wrapper around RTCPeerConnection + getUserMedia. Knows nothing about
 * signaling transport — CallingService feeds it remote SDP/ICE payloads and
 * relays the local ones it produces back out over the socket.
 */
@Injectable({ providedIn: 'root' })
export class WebRtcService {
  private peerConnection: RTCPeerConnection | null = null;
  private localMediaStream: MediaStream | null = null;

  onRemoteStream: ((stream: MediaStream) => void) | null = null;
  onIceCandidate: ((candidate: RTCIceCandidate) => void) | null = null;
  onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null;

  async getLocalMedia(type: CallMediaType): Promise<MediaStream> {
    // Release any stream from a previous attempt first — a still-open track can make
    // the browser report the device as busy even within the same tab.
    this.localMediaStream?.getTracks().forEach(track => track.stop());
    this.localMediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
    return this.localMediaStream;
  }

  createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.localMediaStream?.getTracks().forEach(track => {
      pc.addTrack(track, this.localMediaStream!);
    });

    pc.ontrack = event => this.onRemoteStream?.(event.streams[0]);
    pc.onicecandidate = event => {
      if (event.candidate) this.onIceCandidate?.(event.candidate);
    };
    pc.onconnectionstatechange = () => this.onConnectionStateChange?.(pc.connectionState);

    this.peerConnection = pc;
    return pc;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnection ?? this.createPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnection ?? this.createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // A candidate can legitimately arrive before the remote description is set — safe to drop.
    }
  }

  toggleAudio(enabled: boolean): void {
    this.localMediaStream?.getAudioTracks().forEach(t => (t.enabled = enabled));
  }

  toggleVideo(enabled: boolean): void {
    this.localMediaStream?.getVideoTracks().forEach(t => (t.enabled = enabled));
  }

  getLocalStream(): MediaStream | null {
    return this.localMediaStream;
  }

  close(): void {
    this.localMediaStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    this.localMediaStream = null;
    this.onRemoteStream = null;
    this.onIceCandidate = null;
    this.onConnectionStateChange = null;
  }
}
