import { Injectable, inject, signal, effect } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from './auth.service';
import { WebRtcService } from './webrtc.service';
import { CallType } from '../models/user.model';
import { environment } from '../../environments/environment';

export type CallState = 'idle' | 'outgoing-ringing' | 'incoming-ringing' | 'active';

export interface CallPeerInfo {
  id: string;
  name: string;
  photoUrl?: string | null;
}

export interface IncomingCallInfo {
  callId: string;
  conversationId: string;
  type: CallType;
  caller: CallPeerInfo;
}

export interface ActiveCallSession {
  callId: string | null;
  conversationId: string;
  type: CallType;
  peer: CallPeerInfo;
  isOutgoing: boolean;
}

interface InitiateAck {
  callId?: string;
  error?: string;
}

/**
 * Owns the dedicated /calls Socket.IO connection used purely for call signaling.
 * Kept entirely separate from WebSocketService/ChatService (chat messaging stays
 * on its own raw-WebSocket transport, unchanged).
 */
@Injectable({ providedIn: 'root' })
export class CallingService {
  private readonly auth = inject(AuthService);
  private readonly webrtc = inject(WebRtcService);
  private readonly snackBar = inject(MatSnackBar);

  private socket: Socket | null = null;
  private durationTimer: ReturnType<typeof setInterval> | null = null;

  readonly callState = signal<CallState>('idle');
  readonly incomingCall = signal<IncomingCallInfo | null>(null);
  readonly activeCall = signal<ActiveCallSession | null>(null);
  readonly localStream = signal<MediaStream | null>(null);
  readonly remoteStream = signal<MediaStream | null>(null);
  readonly isMuted = signal(false);
  readonly isCameraOff = signal(false);
  readonly callDurationSeconds = signal(0);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.auth.authenticated()) {
        this.connect();
      } else {
        this.disconnect();
      }
    });

    effect(() => {
      const message = this.errorMessage();
      if (message) {
        this.snackBar.open(message, 'OK', { duration: 4000 });
        this.errorMessage.set(null);
      }
    });

    window.addEventListener('beforeunload', () => {
      const call = this.activeCall();
      if (call?.callId) this.socket?.emit('call:end', { callId: call.callId });
    });
  }

  async initiateCall(conversationId: string, type: CallType, peer: CallPeerInfo): Promise<void> {
    if (!this.socket?.connected) {
      this.errorMessage.set('Not connected — try again in a moment');
      return;
    }
    if (this.activeCall() || this.incomingCall()) return;

    try {
      const stream = await this.webrtc.getLocalMedia(type);
      this.localStream.set(stream);
    } catch (error: unknown) {
      this.errorMessage.set(this.describeMediaError(error));
      return;
    }

    this.activeCall.set({ callId: null, conversationId, type, peer, isOutgoing: true });
    this.callState.set('outgoing-ringing');

    this.socket.emit('call:initiate', { conversationId, type }, (res: InitiateAck) => {
      if (res?.error) {
        this.errorMessage.set(res.error);
        this.teardown();
        return;
      }
      if (res?.callId) {
        this.activeCall.update(c => (c ? { ...c, callId: res.callId! } : c));
        this.wireWebRtcCallbacks(res.callId);
      }
    });
  }

  async acceptIncomingCall(): Promise<void> {
    const incoming = this.incomingCall();
    if (!incoming || !this.socket) return;

    try {
      const stream = await this.webrtc.getLocalMedia(incoming.type);
      this.localStream.set(stream);
    } catch (error: unknown) {
      this.errorMessage.set(this.describeMediaError(error));
      this.declineIncomingCall();
      return;
    }

    this.wireWebRtcCallbacks(incoming.callId);
    this.activeCall.set({
      callId: incoming.callId,
      conversationId: incoming.conversationId,
      type: incoming.type,
      peer: incoming.caller,
      isOutgoing: false,
    });
    this.incomingCall.set(null);
    this.callState.set('active');
    this.socket.emit('call:accept', { callId: incoming.callId });
  }

  declineIncomingCall(): void {
    const incoming = this.incomingCall();
    if (!incoming || !this.socket) return;
    this.socket.emit('call:decline', { callId: incoming.callId });
    this.incomingCall.set(null);
    this.callState.set('idle');
  }

  endCall(): void {
    const call = this.activeCall();
    if (call?.callId && this.socket) {
      this.socket.emit('call:end', { callId: call.callId });
    }
    this.teardown();
  }

  toggleMute(): void {
    const next = !this.isMuted();
    this.webrtc.toggleAudio(!next);
    this.isMuted.set(next);
  }

  toggleCamera(): void {
    const next = !this.isCameraOff();
    this.webrtc.toggleVideo(!next);
    this.isCameraOff.set(next);
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  /** Maps getUserMedia failure reasons to messages a user can actually act on. */
  private describeMediaError(error: unknown): string {
    const name = error instanceof DOMException ? error.name : '';
    switch (name) {
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Camera or microphone is already in use by another app or browser tab';
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Camera/microphone permission was denied';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No camera or microphone was found on this device';
      default:
        return 'Camera/microphone permission is required for this call';
    }
  }

  private connect(): void {
    if (this.socket?.connected) return;
    const token = localStorage.getItem('suhana_token');
    if (!token) return;

    const base = environment.apiUrl.replace(/\/api$/, '');
    this.socket = io(`${base}/calls`, { auth: { token }, transports: ['websocket'] });
    this.registerSocketHandlers();
  }

  private disconnect(): void {
    this.teardown();
    this.socket?.disconnect();
    this.socket = null;
  }

  private registerSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('call:incoming', (data: IncomingCallInfo) => {
      if (this.activeCall() || this.incomingCall()) return; // already on a call — ignore for v1
      this.incomingCall.set(data);
      this.callState.set('incoming-ringing');
    });

    this.socket.on('call:accept', (data: { callId: string }) => {
      const call = this.activeCall();
      if (!call || !call.isOutgoing) return;
      this.activeCall.set({ ...call, callId: data.callId });
      this.wireWebRtcCallbacks(data.callId);
      void this.startWebRtcAsCaller();
    });

    this.socket.on('call:decline', () => {
      if (!this.activeCall()?.isOutgoing) return;
      this.errorMessage.set('Call declined');
      this.teardown();
    });

    this.socket.on('call:end', () => {
      if (!this.activeCall()) return;
      this.teardown();
    });

    this.socket.on('call:missed', () => {
      if (this.activeCall()?.isOutgoing) {
        this.errorMessage.set('No answer');
      }
      this.incomingCall.set(null);
      this.teardown();
    });

    this.socket.on('call:offer', async (data: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      const call = this.activeCall();
      if (!call || call.isOutgoing) return;
      const answer = await this.webrtc.createAnswer(data.sdp);
      this.socket?.emit('call:answer', { callId: data.callId, sdp: answer });
      this.startDurationTimer();
    });

    this.socket.on('call:answer', async (data: { sdp: RTCSessionDescriptionInit }) => {
      await this.webrtc.setRemoteAnswer(data.sdp);
    });

    this.socket.on('call:ice-candidate', (data: { candidate: RTCIceCandidateInit }) => {
      void this.webrtc.addIceCandidate(data.candidate);
    });

    this.socket.on('call:error', (data: { message?: string }) => {
      this.errorMessage.set(data?.message ?? 'Call error');
      if (this.callState() !== 'active') this.teardown();
    });
  }

  private async startWebRtcAsCaller(): Promise<void> {
    const call = this.activeCall();
    if (!call?.callId) return;
    const offer = await this.webrtc.createOffer();
    this.socket?.emit('call:offer', { callId: call.callId, sdp: offer });
    this.callState.set('active');
    this.startDurationTimer();
  }

  private wireWebRtcCallbacks(callId: string): void {
    this.webrtc.onIceCandidate = candidate => this.socket?.emit('call:ice-candidate', { callId, candidate });
    this.webrtc.onRemoteStream = stream => this.remoteStream.set(stream);
  }

  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.callDurationSeconds.set(0);
    this.durationTimer = setInterval(() => this.callDurationSeconds.update(s => s + 1), 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationTimer !== null) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  private teardown(): void {
    this.webrtc.close();
    this.stopDurationTimer();
    this.activeCall.set(null);
    this.incomingCall.set(null);
    this.localStream.set(null);
    this.remoteStream.set(null);
    this.isMuted.set(false);
    this.isCameraOff.set(false);
    this.callDurationSeconds.set(0);
    this.callState.set('idle');
  }
}
