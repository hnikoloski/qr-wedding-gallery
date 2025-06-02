import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import path from "path";

// Initialize Google Cloud Storage client
let storage: Storage;
let bucket: any;

try {
  const keyPath = path.join(process.cwd(), 'wedding-storage-key.json');
  
  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: keyPath,
  });

  bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET!);
} catch (initError) {
  console.error('Failed to initialize Google Cloud Storage:', initError);
}

export async function GET() {
  try {
    // Check if storage is initialized
    if (!storage || !bucket) {
      console.error('Google Cloud Storage not properly initialized');
      return NextResponse.json(
        { error: "Storage service not available" },
        { status: 500 }
      );
    }

    // List all files in the bucket
    const [files] = await bucket.getFiles({
      // Only get image and video files
      prefix: '', // Get all files
    });

    // Filter for media files and transform to the expected format
    const photos = files
      .filter((file: any) => {
        const mimeType = file.metadata.contentType || '';
        return mimeType.startsWith('image/') || mimeType.startsWith('video/');
      })
      .map((file: any) => {
        const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
        const fileName = file.name;
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        const isVideo = file.metadata.contentType?.startsWith('video/');
        
        return {
          id: fileName,
          name: file.metadata.metadata?.originalName || fileName,
          mimeType: file.metadata.contentType,
          createdTime: file.metadata.timeCreated,
          url: publicUrl,
          thumbnailUrl: isVideo ? null : publicUrl, // null for videos, actual URL for images
          uploadedBy: file.metadata.metadata?.uploadedBy || 'Unknown',
          needsThumbnail: isVideo, // Flag for client-side thumbnail generation
        };
      })
      .sort((a: any, b: any) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

    console.log("Found photos and videos:", photos.length);
    return NextResponse.json({ photos }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error("Error fetching photos from Google Cloud Storage:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
} 