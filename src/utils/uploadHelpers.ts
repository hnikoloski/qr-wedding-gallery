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