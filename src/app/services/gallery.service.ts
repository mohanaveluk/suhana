import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  GalleryImage,
  GalleryApiResponse,
  UploadProgress,
  UploadStatus,
} from '../models/gallery.model';

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // ── Gallery CRUD ─────────────────────────────────────────────────────────

  /** Fetch all gallery images for a profile */
  getProfileGallery(profileId: string): Observable<GalleryApiResponse> {
    return this.http.get<GalleryApiResponse>(
      `${this.baseUrl}/v1/gallery/profile/${profileId}`,
    );
  }

  /** Fetch all gallery images for a profile */
  getProfileGalleryView(profileId: string): Observable<GalleryApiResponse> {
    return this.http.get<GalleryApiResponse>(
      `${this.baseUrl}/v1/gallery/profile/view/${profileId}`,
    );
  }

  /**
   * Upload a single image with per-byte progress reporting.
   * Emits `UploadProgress` events; completes or errors when done.
   */
  uploadImage(profileId: string, file: File, itemId: string): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const req = new HttpRequest(
      'POST',
      `${this.baseUrl}/v1/gallery/upload/${profileId}`,
      formData,
      { reportProgress: true },
    );

    const subject = new Subject<UploadProgress>();

    this.http.request(req).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress) {
          const total    = event.total ?? file.size;
          const progress = Math.round((event.loaded / total) * 100);
          subject.next({ itemId, progress, status: 'uploading' });
        } else if (event.type === HttpEventType.Response) {
          const body          = event.body as { data?: GalleryImage } | GalleryImage;
          const uploadedImage = (body as any)?.data ?? (body as GalleryImage);
          subject.next({ itemId, progress: 100, status: 'success', uploadedImage });
          subject.complete();
        }
      },
      error: err => {
        const message =
          err?.error?.message ?? err?.message ?? 'Upload failed. Please try again.';
        subject.next({ itemId, progress: 0, status: 'error', errorMessage: message });
        subject.complete();
      },
    });

    return subject.asObservable();
  }

  /** Delete an image from the gallery */
  deleteGalleryImage(imageId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/v1/gallery/${imageId}`);
  }

  /** Set a gallery image as the primary profile photo */
  setPrimaryImage(imageId: string, profileId: string): Observable<GalleryImage> {
    return this.http.patch<GalleryImage>(
      `${this.baseUrl}/v1/gallery/${imageId}/primary`,
      { profileId },
    );
  }

  // ── Mock helpers (used when API is unavailable) ──────────────────────────

  generateMockGallery(profileId: string): GalleryApiResponse {
    const base = 'https://picsum.photos/seed';
    const images: GalleryImage[] = [
      { id: '1', imageUrl: `${base}/p${profileId}1/600/800`,  isPrimary: true,  isVerified: true,  createdAt: new Date().toISOString() },
      { id: '2', imageUrl: `${base}/p${profileId}2/600/800`,  isPrimary: false, isVerified: false, createdAt: new Date().toISOString() },
      { id: '3', imageUrl: `${base}/p${profileId}3/600/800`,  isPrimary: false, isVerified: false, createdAt: new Date().toISOString() },
      { id: '4', imageUrl: `${base}/p${profileId}4/600/800`,  isPrimary: false, isVerified: false, createdAt: new Date().toISOString() },
      { id: '5', imageUrl: `${base}/p${profileId}5/600/800`,  isPrimary: false, isVerified: false, createdAt: new Date().toISOString() },
    ];
    return { data: images, totalCount: images.length, profileId };
  }
}
