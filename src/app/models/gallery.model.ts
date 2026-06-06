// ─── Gallery Domain Models ─────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** 2 MB in bytes */
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface GalleryImageData {
  Image: GalleryImage[];
  currentIndex: number; // Used for dialog navigation
  profileName?: string;  // Used for alt text and ARIA labels
}

export interface GalleryImage {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  isPrimary: boolean;
  isVerified: boolean;
  caption?: string;
  createdAt: string;   // ISO date string
  imageSize?: number;    // bytes
  mimeType?: string;
}

export interface GalleryApiResponse {
  data: GalleryImage[];
  totalCount: number;
  profileId: string;
}

/** Represents one file the user has staged for upload */
export interface UploadItem {
  /** Unique key for tracking */
  id: string;
  file: File;
  /** Object URL for local preview (revoke after use) */
  previewUrl: string;
  status: UploadStatus;
  /** 0–100 */
  progress: number;
  /** Populated on error */
  errorMessage?: string;
  /** Populated on success */
  uploadedImage?: GalleryImage;
}

/** Used internally by GalleryService to emit granular progress */
export interface UploadProgress {
  itemId: string;
  progress: number;
  status: UploadStatus;
  uploadedImage?: GalleryImage;
  errorMessage?: string;
}
