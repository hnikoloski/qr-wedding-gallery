import { create } from "zustand";
// import { persist } from "zustand/middleware"; // Temporarily disabled

interface Photo {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  url: string;
  thumbnailUrl: string | null; // Allow null for videos that need thumbnails generated
  tempBlobUrl?: string; // For immediate video playback before Google Drive processing
  isProcessing?: boolean; // Track if Google Drive is still processing
  blobCreatedAt?: number; // Timestamp when blob was created
  needsThumbnail?: boolean; // Track if video needs thumbnail generation
  uploadedBy?: string; // Track who uploaded the file
}

interface PhotoStore {
  photos: Photo[];
  addPhotos: (newPhotos: Photo[]) => void;
  addPhotoUrls: (urls: string[]) => void; // For backward compatibility with camera/upload
  removePhoto: (index: number) => void;
  clearPhotos: () => void;
  getPhotoUrls: () => string[];
  markVideoAsProcessed: (videoId: string) => void; // Mark video as processed by Google Drive
  clearStaleBlobUrls: () => void; // Clear stale blob URLs after page refresh
  clearOldBlobUrls: (maxAgeMinutes?: number) => void; // Clear blob URLs older than specified time
}

export const usePhotoStore = create<PhotoStore>()(
  // Temporarily disable persistence to ensure fresh data
  // persist(
  (set, get) => ({
      photos: [],
    addPhotos: (newPhotos: Photo[]) => {
      // Filter out photos that already exist (based on URL)
      const existingUrls = new Set(get().photos.map(p => p.url));
      const uniqueNewPhotos = newPhotos.filter(photo => !existingUrls.has(photo.url));
      
      // Only add if we have new photos
      if (uniqueNewPhotos.length > 0) {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Adding ${uniqueNewPhotos.length} unique photos out of ${newPhotos.length} total`);
        }

        set((state) => {
          // Sort all photos by createdTime desc (newest first)
          const allPhotos = [...state.photos, ...uniqueNewPhotos];
          allPhotos.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
          
          return { photos: allPhotos };
        });
      }
    },
    addPhotoUrls: (urls: string[]) =>
      set((state) => {
        // For backward compatibility - convert URLs to Photo objects
        const urlPhotos: Photo[] = urls.map((url, index) => ({
          id: `local-${Date.now()}-${index}`,
          name: `Photo ${Date.now()}-${index}`,
          mimeType: 'image/jpeg',
          createdTime: new Date().toISOString(),
          url: url,
          thumbnailUrl: url,
        }));

        // Add to the beginning since these are new uploads
          return { 
          photos: [...urlPhotos, ...state.photos]
          };
        }),
      removePhoto: (index: number) => 
        set((state) => ({
          photos: state.photos.filter((_, i) => i !== index),
        })),
      clearPhotos: () => set({ photos: [] }),
    getPhotoUrls: () => get().photos.map(photo => photo.url),
    markVideoAsProcessed: (videoId: string) =>
      set((state) => ({
        photos: state.photos.map(photo =>
          photo.id === videoId ? { ...photo, isProcessing: false } : photo
        ),
      })),
    clearStaleBlobUrls: () =>
      set((state) => ({
        photos: state.photos.map(photo =>
          photo.tempBlobUrl ? { ...photo, tempBlobUrl: undefined, isProcessing: false } : photo
        ),
      })),
    clearOldBlobUrls: (maxAgeMinutes?: number) =>
      set((state) => ({
        photos: state.photos.map(photo =>
          photo.blobCreatedAt &&
          (maxAgeMinutes ? Date.now() - photo.blobCreatedAt > maxAgeMinutes * 60 * 1000 : true)
            ? { ...photo, tempBlobUrl: undefined, isProcessing: false }
            : photo
        ),
      })),
  })
  // {
  //   name: "wedding-photos-storage",
  // }
  // )
); 