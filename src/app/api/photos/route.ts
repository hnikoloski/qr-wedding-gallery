import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if we have the required environment variables
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    
    if (!projectId || !bucketName || !credentials) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: "Storage service not properly configured" },
        { status: 500 }
      );
    }

    // Parse credentials
    const credentialsObj = JSON.parse(credentials);

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

    // List all files in the bucket using REST API
    const listUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o`;
    
    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to list files: ${listResponse.statusText}`);
    }

    const listResult = await listResponse.json();
    const files = listResult.items || [];

    // Filter for media files and transform to the expected format
    const photos = files
      .filter((file: any) => {
        const contentType = file.contentType || '';
        return contentType.startsWith('image/') || contentType.startsWith('video/');
      })
      .map((file: any) => {
        const fileName = file.name;
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        const isVideo = file.contentType?.startsWith('video/');
        
        return {
          id: fileName,
          name: file.metadata?.['original-name'] || fileName,
          mimeType: file.contentType,
          createdTime: file.timeCreated,
          url: publicUrl,
          thumbnailUrl: isVideo ? null : publicUrl,
          uploadedBy: file.metadata?.['uploaded-by'] || 'Unknown',
          needsThumbnail: isVideo,
        };
      })
      .sort((a: any, b: any) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

    console.log("Found photos and videos:", photos.length);
    return NextResponse.json({ 
      photos,
      timestamp: Date.now(), // Add timestamp for cache busting
      _fresh: true // Marker to indicate this is fresh data
    }, {
      headers: {
        // Multiple layers of cache prevention
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '-1',
        'Surrogate-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        // Additional headers to prevent any caching
        'Last-Modified': new Date().toUTCString(),
        'ETag': `"${Date.now()}"`,
        'Vary': '*',
        // CORS headers to prevent preflight caching
        'Access-Control-Max-Age': '0',
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