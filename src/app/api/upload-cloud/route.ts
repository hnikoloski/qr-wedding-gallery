import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log('Upload request received');
    
    // Check if we have the required environment variables
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    
    if (!projectId || !bucketName || !credentials) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { success: false, error: "Storage service not properly configured" },
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

    // Parse credentials
    const credentialsObj = JSON.parse(credentials);
    
    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedUserName = userName.replace(/[^a-zA-Z0-9]/g, "_") || "Anonymous";
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}_${sanitizedUserName}_${file.name}`;

    console.log('Generated file name:', fileName);

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    console.log('File converted to buffer, size:', arrayBuffer.byteLength);

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