import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import path from "path";

// Initialize Google Cloud Storage client with better error handling
let storage: Storage;
let bucket: any;

try {
  // Use absolute path for service account key
  const keyPath = path.join(process.cwd(), 'wedding-storage-key.json');
  
  console.log('Initializing Google Cloud Storage...');
  console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
  console.log('Bucket:', process.env.GOOGLE_CLOUD_STORAGE_BUCKET);
  console.log('Key file path:', keyPath);

  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: keyPath,
  });

  bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET!);
  console.log('Google Cloud Storage initialized successfully');
} catch (initError) {
  console.error('Failed to initialize Google Cloud Storage:', initError);
}

export async function POST(request: NextRequest) {
  try {
    console.log('Upload request received');
    
    // Check if storage is initialized
    if (!storage || !bucket) {
      console.error('Google Cloud Storage not properly initialized');
      return NextResponse.json(
        { success: false, error: "Storage service not available" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userName = formData.get("userName") as string;

    console.log('File received:', file?.name, 'Size:', file?.size);
    console.log('User name:', userName);

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedUserName = userName.replace(/[^a-zA-Z0-9]/g, "_") || "Anonymous";
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}_${sanitizedUserName}_${file.name}`;

    console.log('Generated file name:', fileName);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('File converted to buffer, size:', buffer.length);

    // Upload to Google Cloud Storage
    const cloudFile = bucket.file(fileName);
    
    console.log('Starting upload to Google Cloud Storage...');
    await cloudFile.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: userName,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
        },
      },
    });

    console.log('File uploaded successfully');

    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}/${fileName}`;

    // For videos, we'll let the client generate thumbnails
    // For images, use the same URL for thumbnail
    const isVideo = file.type.startsWith('video/');
    
    // Create photo object
    const photoObject = {
      id: fileName, // Use filename as ID for Cloud Storage
      name: file.name,
      mimeType: file.type,
      createdTime: new Date().toISOString(),
      url: publicUrl,
      thumbnailUrl: isVideo ? null : publicUrl, // null for videos, will be generated client-side
      uploadedBy: userName,
      needsThumbnail: isVideo, // Flag to indicate client should generate thumbnail
    };

    console.log('Returning success response');
    return NextResponse.json({
      success: true,
      photo: photoObject,
      fileId: fileName,
    });

  } catch (error) {
    console.error("Google Cloud Storage upload error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Upload failed" 
      },
      { status: 500 }
    );
  }
} 