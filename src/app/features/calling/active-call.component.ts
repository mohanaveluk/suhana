import { Component, ChangeDetectionStrategy, inject, ViewChild, ElementRef, effect, computed } from '@angular/core';
import { MaterialModule } from '../../shared/modules/material.module';
import { CallingService } from '../../services/calling.service';

@Component({
  selector: 'app-active-call',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule],
  templateUrl: './active-call.component.html',
  styleUrl: './active-call.component.scss',
})
export class ActiveCallComponent {
  protected readonly callingService = inject(CallingService);

  @ViewChild('localVideo') private localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') private remoteVideoRef?: ElementRef<HTMLVideoElement>;

  protected readonly isVisible = computed(() => {
    const state = this.callingService.callState();
    return state === 'active' || state === 'outgoing-ringing';
  });
  protected readonly isVideoCall = computed(() => this.callingService.activeCall()?.type === 'video');
  protected readonly peer = computed(() => this.callingService.activeCall()?.peer ?? null);

  protected readonly statusLabel = computed(() => {
    const state = this.callingService.callState();
    if (state === 'outgoing-ringing') return 'Calling…';
    if (!this.callingService.remoteStream()) return 'Connecting…';
    const total = this.callingService.callDurationSeconds();
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  constructor() {
    effect(() => {
      const stream = this.callingService.localStream();
      if (this.localVideoRef?.nativeElement) this.localVideoRef.nativeElement.srcObject = stream;
    });
    effect(() => {
      const stream = this.callingService.remoteStream();
      if (this.remoteVideoRef?.nativeElement) this.remoteVideoRef.nativeElement.srcObject = stream;
    });
  }

  protected end(): void {
    this.callingService.endCall();
  }

  protected toggleMute(): void {
    this.callingService.toggleMute();
  }

  protected toggleCamera(): void {
    this.callingService.toggleCamera();
  }
}
