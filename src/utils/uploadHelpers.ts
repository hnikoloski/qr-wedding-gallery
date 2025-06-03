/**
 * Generate a thumbnail for a video file using canvas
 */
export function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      // Set canvas size
      canvas.width = 400;
      canvas.height = (video.videoHeight / video.videoWidth) * 400;

      // Seek to 1 second or 10% of video duration, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      // Draw video frame to canvas
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      resolve(thumbnail);

      // Cleanup
      video.src = '';
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      reject(new Error('Failed to generate video thumbnail'));
    };

    // Load video
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.load();
  });
}

/**
 * Generate a thumbnail for a video from a URL (for existing videos)
 */
export function generateVideoThumbnailFromUrl(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      // Set canvas size to 16:9 aspect ratio, max 400px wide
      const aspectRatio = video.videoHeight / video.videoWidth;
      canvas.width = Math.min(400, video.videoWidth);
      canvas.height = canvas.width * aspectRatio;

      // Seek to 2 seconds or 5% of video duration for a good frame
      video.currentTime = Math.min(2, video.duration * 0.05);
    };

    video.onseeked = () => {
      try {
        // Draw video frame to canvas
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64 with good quality
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail);
      } catch (canvasError) {
        console.warn('Canvas drawing failed (likely CORS):', canvasError);
        reject(new Error('Canvas access blocked by CORS'));
      } finally {
        // Cleanup
        video.src = '';
        video.remove();
      }
    };

    video.onerror = (error) => {
      console.warn('Video loading failed (likely CORS):', error);
      reject(new Error('Video access blocked by CORS policy'));
    };

    // Configure video element
    video.crossOrigin = 'anonymous'; // Try with CORS first
    video.preload = 'metadata';
    video.muted = true; // Muted for autoplay policies
    video.src = videoUrl;
    video.load();
  });
}

/**
 * Uploads a file to Google Cloud Storage via API route
 * 
 * @param file The file to upload
 * @param userName The name of the user uploading the file
 * @returns Object containing success status and photo object if successful
 */
export async function uploadToGoogleCloudStorage(
  file: File, 
  userName: string = "Anonymous Guest"
): Promise<{success: boolean; photo?: any; fileId?: string; error?: string}> {
  try {
    // Create FormData for API call
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userName", userName);

    // Call our API route
    const response = await fetch("/api/upload-cloud", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Upload failed");
    }

    return {
      success: true,
      photo: result.photo,
      fileId: result.fileId,
    };

  } catch (error) {
    console.error("Google Cloud Storage upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
} 