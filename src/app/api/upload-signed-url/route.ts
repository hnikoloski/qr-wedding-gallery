import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    console.log('Signed URL request received');
    
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
        keyPath = path.isAbsolute(keyFilePath) ? keyFilePath : path.join(process.cwd(), keyFilePath);
      } else {
        keyPath = path.join(process.cwd(), 'wedding-storage-key.json');
      }
      
      try {
        const fs = require('fs');
        const keyFile = fs.readFileSync(keyPath, 'utf8');
        credentialsObj = JSON.parse(keyFile);
      } catch (fileError) {
        console.error('Failed to load credentials file:', fileError);
        return NextResponse.json(
          { success: false, error: "Could not load credentials" },
          { status: 500 }
        );
      }
    }

    const body = await request.json();
    const { fileName, fileType, fileSize, userName } = body;

    console.log('File info:', { fileName, fileType, fileSize, userName });

    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedUserName = userName?.replace(/[^a-zA-Z0-9]/g, "_") || "Anonymous";
    const uniqueFileName = `${timestamp}_${sanitizedUserName}_${fileName}`;

    console.log('Generated unique file name:', uniqueFileName);

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

    // Generate signed URL for direct upload
    const signedUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(uniqueFileName)}`;

    // Generate public URL for the file (once uploaded)
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${uniqueFileName}`;

    // For videos, we'll let the client generate thumbnails
    const isVideo = fileType.startsWith('video/');
    
    // Create photo object
    const photoObject = {
      id: uniqueFileName,
      name: fileName,
      mimeType: fileType,
      createdTime: new Date().toISOString(),
      url: publicUrl,
      thumbnailUrl: isVideo ? null : publicUrl,
      uploadedBy: userName || 'Anonymous',
      needsThumbnail: isVideo,
    };

    console.log('Returning signed URL response');
    return NextResponse.json({
      success: true,
      signedUrl,
      accessToken,
      photo: photoObject,
      fileId: uniqueFileName,
    });

  } catch (error) {
    console.error("Signed URL generation error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate signed URL" 
      },
      { status: 500 }
    );
  }
}

// Helper function to create JWT token (reused from upload-cloud)
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