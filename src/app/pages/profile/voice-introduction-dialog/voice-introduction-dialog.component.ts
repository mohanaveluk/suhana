import {
  Component, ChangeDetectionStrategy, inject, signal, OnDestroy, ElementRef, ViewChild,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VoiceIntroductionService } from '../../../services/voice-introduction.service';

export interface VoiceIntroductionDialogData {
  existingUrl?: string;
}

export interface VoiceIntroductionDialogResult {
  url: string;
}

const MAX_RECORD_SECONDS = 30;
const ALLOWED_AUDIO_TYPES = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/x-m4a'];
const MAX_AUDIO_MB = 5;

@Component({
  selector: 'app-voice-introduction-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatDialogModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTabsModule, MatTooltipModule,
  ],
  templateUrl: './voice-introduction-dialog.component.html',
  styleUrl: './voice-introduction-dialog.component.scss',
})
export class VoiceIntroductionDialogComponent implements OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<VoiceIntroductionDialogComponent>);
  protected readonly data = inject<VoiceIntroductionDialogData>(MAT_DIALOG_DATA);
  private readonly svc = inject(VoiceIntroductionService);

  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;

  // Recording state
  protected recording = signal(false);
  protected recordingSeconds = signal(0);
  protected recordedBlobUrl = signal<string | null>(null);
  protected recordedBlob = signal<Blob | null>(null);
  protected isPlaying = signal(false);

  // Upload state
  protected uploading = signal(false);
  protected uploadError = signal<string | null>(null);
  protected fileError = signal<string | null>(null);
  protected uploadedFile = signal<File | null>(null);
  protected uploadedFileUrl = signal<string | null>(null);

  private mediaRecorder: MediaRecorder | null = null;
  private recordingTimer: ReturnType<typeof setInterval> | null = null;
  private chunks: Blob[] = [];

  readonly maxSeconds = MAX_RECORD_SECONDS;

  // ── Recording ─────────────────────────────────────────────────────────────

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        this.recordedBlob.set(blob);
        this.recordedBlobUrl.set(url);
        stream.getTracks().forEach(t => t.stop());
      };

      this.mediaRecorder.start();
      this.recording.set(true);
      this.recordingSeconds.set(0);
      this.recordedBlobUrl.set(null);
      this.recordedBlob.set(null);

      this.recordingTimer = setInterval(() => {
        this.recordingSeconds.update(s => {
          if (s + 1 >= MAX_RECORD_SECONDS) {
            this.stopRecording();
            return MAX_RECORD_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      this.uploadError.set('Microphone access denied. Please allow microphone access and try again.');
    }
  }

  stopRecording(): void {
    this.mediaRecorder?.stop();
    this.recording.set(false);
    this.clearTimer();
  }

  deleteRecording(): void {
    const url = this.recordedBlobUrl();
    if (url) URL.revokeObjectURL(url);
    this.recordedBlobUrl.set(null);
    this.recordedBlob.set(null);
    this.recordingSeconds.set(0);
    this.isPlaying.set(false);
  }

  togglePlayback(): void {
    const el = this.audioPlayerRef?.nativeElement;
    if (!el) return;
    if (this.isPlaying()) { el.pause(); } else { el.play(); }
    this.isPlaying.set(!this.isPlaying());
  }

  onAudioEnded(): void { this.isPlaying.set(false); }

  // ── File Upload ────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.fileError.set(null);

    const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type) || file.name.match(/\.(mp3|wav|m4a|ogg)$/i);
    if (!isAudio) {
      this.fileError.set('Please select an MP3, WAV, M4A or OGG audio file.');
      return;
    }
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      this.fileError.set(`File must be smaller than ${MAX_AUDIO_MB} MB.`);
      return;
    }

    this.uploadedFile.set(file);
    const url = URL.createObjectURL(file);
    this.uploadedFileUrl.set(url);
  }

  removeUploadedFile(): void {
    const url = this.uploadedFileUrl();
    if (url) URL.revokeObjectURL(url);
    this.uploadedFile.set(null);
    this.uploadedFileUrl.set(null);
    this.fileError.set(null);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async saveRecording(): Promise<void> {
    const blob = this.recordedBlob();
    if (!blob) return;
    const file = new File([blob], `voice-intro-${Date.now()}.webm`, { type: blob.type });
    await this.uploadAndClose(file);
  }

  async saveUploadedFile(): Promise<void> {
    const file = this.uploadedFile();
    if (!file) return;
    await this.uploadAndClose(file);
  }

  private async uploadAndClose(file: File): Promise<void> {
    this.uploading.set(true);
    this.uploadError.set(null);
    try {
      const url = await this.svc.upload(file);
      this.dialogRef.close({ url } satisfies VoiceIntroductionDialogResult);
    } catch (e: any) {
      this.uploadError.set(e?.error?.message ?? 'Upload failed. Please try again.');
    } finally {
      this.uploading.set(false);
    }
  }

  cancel(): void { this.dialogRef.close(null); }

  protected formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  private clearTimer(): void {
    if (this.recordingTimer) { clearInterval(this.recordingTimer); this.recordingTimer = null; }
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.mediaRecorder?.stop();
    const bUrl = this.recordedBlobUrl();
    if (bUrl) URL.revokeObjectURL(bUrl);
    const fUrl = this.uploadedFileUrl();
    if (fUrl) URL.revokeObjectURL(fUrl);
  }
}
