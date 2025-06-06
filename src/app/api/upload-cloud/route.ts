import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('Upload request received at:', new Date().toISOString());
    
    // Check if we have the required environment variables
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    
    if (!projectId || !bucketName) {
      console.error('Missing required environment variables: PROJECT_ID or BUCKET_NAME');
      return NextResponse.json(
        { success: false, error: "Storage service not properly configured" },
        { status: 500 }
      );
    }

    let credentialsObj;

    // Check if we're in production with environment variable credentials
    if (credentials) {
      // Production: Use credentials from environment variable
      console.log('Using credentials from environment variable');
      try {
        credentialsObj = JSON.parse(credentials);
      } catch (parseError) {
        console.error('Failed to parse GOOGLE_CLOUD_CREDENTIALS:', parseError);
        return NextResponse.json(
          { success: false, error: "Invalid credentials configuration" },
          { status: 500 }
        );
      }
    } else {
      // Development: Check for key file path in environment variable first
      const keyFilePath = process.env.GOOGLE_CLOUD_KEY_FILE;
      let keyPath;
      
      if (keyFilePath) {
        // Use path from environment variable
        keyPath = path.isAbsolute(keyFilePath) ? keyFilePath : path.join(process.cwd(), keyFilePath);
        console.log('Using credentials file path from environment variable:', keyPath);
      } else {
        // Fallback to default path
        keyPath = path.join(process.cwd(), 'wedding-storage-key.json');
        console.log('Using default credentials file path:', keyPath);
      }
      
      try {
        const fs = require('fs');
        const keyFile = fs.readFileSync(keyPath, 'utf8');
        credentialsObj = JSON.parse(keyFile);
        console.log('Successfully loaded credentials from:', keyPath);
      } catch (fileError) {
        console.error('Failed to load credentials file:', fileError);
        return NextResponse.json(
          { success: false, error: "Could not load credentials. Please ensure the key file exists or set GOOGLE_CLOUD_CREDENTIALS environment variable." },
          { status: 500 }
        );
      }
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

    // Check file size for Vercel limits
    const maxFileSize = 500 * 1024 * 1024; // 500MB limit for 4K videos
    if (file.size > maxFileSize) {
      console.error(`File too large: ${file.size} bytes (max: ${maxFileSize})`);
      return NextResponse.json(
        { 
          success: false, 
          error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (500MB). Please compress your video or try a smaller file.` 
        },
        { status: 413 }
      );
    }

    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedUserName = userName.replace(/[^a-zA-Z0-9]/g, "_") || "Anonymous";
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}_${sanitizedUserName}_${file.name}`;

    console.log('Generated file name:', fileName);

    // Convert File to ArrayBuffer with timeout protection (longer for large files)
    console.log('Converting file to buffer...');
    const arrayBuffer = await Promise.race([
      file.arrayBuffer(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('File conversion timeout')), 120000)
      )
    ]) as ArrayBuffer;
    
    console.log('File converted to buffer, size:', arrayBuffer.byteLength);
    const elapsedTime = Date.now() - startTime;
    console.log('Time elapsed so far:', elapsedTime, 'ms');

    // Create JWT token for Google Cloud Storage
    const now = Math.floor(Date.now() / 1000);
    const token = await createJWT({
      iss: credentialsObj.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }, credentialsObj.private_key);

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('Got access token, uploading to Google Cloud Storage...');

    // Upload to Google Cloud Storage using REST API
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': file.type,
        'x-goog-meta-uploaded-by': userName,
        'x-goog-meta-uploaded-at': new Date().toISOString(),
        'x-goog-meta-original-name': file.name,
      },
      body: arrayBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', uploadResponse.status, errorText);
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('File uploaded successfully:', uploadResult.name);

    // Generate public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // For videos, we'll let the client generate thumbnails
    // For images, use the same URL for thumbnail
    const isVideo = file.type.startsWith('video/');
    
    // Create photo object
    const photoObject = {
      id: fileName,
      name: file.name,
      mimeType: file.type,
      createdTime: new Date().toISOString(),
      url: publicUrl,
      thumbnailUrl: isVideo ? null : publicUrl,
      uploadedBy: userName,
      needsThumbnail: isVideo,
    };

    console.log('Returning success response');
    return NextResponse.json({
      success: true,
      photo: photoObject,
      fileId: fileName,
    });

  } catch (error) {
    console.error("Upload error:", error);
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

// Helper function to create JWT token
async function createJWT(payload: any, privateKey: string): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const encodedHeader = base64URLEncode(JSON.stringify(header));
  const encodedPayload = base64URLEncode(JSON.stringify(payload));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // Import the private key
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = base64URLEncode(signature);
  return `${signatureInput}.${encodedSignature}`;
}

function base64URLEncode(data: string | ArrayBuffer): string {
  let base64: string;
  
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
} 