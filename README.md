# Wedding Photo Sharing App

A web application that allows wedding guests to scan a QR code, upload photos, take pictures directly from their camera, and view all shared photos. The app uses Google Cloud Storage for fast, reliable storage.

## Features

- Mobile-friendly responsive design
- QR code generation for easy sharing
- Photo uploads from device gallery
- Direct camera capture
- Photo gallery view
- Google Cloud Storage integration for fast uploads and no video processing delays

## Tech Stack

- Next.js with React
- TypeScript
- Chakra UI for styling
- Zustand for state management
- Google Cloud Storage for photo/video storage

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd wedding-photo-app
npm install
```

### 2. Set Up Google Cloud Storage

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Cloud Storage API
4. Create a storage bucket:
   - Choose a unique bucket name
   - Select your preferred region (Europe for GDPR compliance)
   - Set uniform bucket-level access to "Public"
5. Create a service account:
   - Go to IAM & Admin > Service Accounts
   - Create new service account with Storage Admin role
   - Download the JSON key file
6. Make your bucket public:
   - Go to your bucket permissions
   - Add `allUsers` with the `Storage Object Viewer` role

### 3. Set Up Budget Alerts (Recommended)

1. Go to Billing in Google Cloud Console
2. Set up budget alerts at 50%, 90%, and 100% of your monthly limit
3. Typical wedding usage should be under $5-10/month

### 4. Environment Variables

Create a `.env.local` file with the following variables:

```
GOOGLE_CLOUD_PROJECT_ID=your_project_id_here
GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name_here
GOOGLE_CLOUD_KEY_FILE=./wedding-storage-key.json
```

Place your downloaded service account key file as `wedding-storage-key.json` in the project root.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Deploy to Production

This app can be easily deployed to Vercel:

```bash
npm install -g vercel
vercel
```

Make sure to:

- Add all environment variables to your Vercel project settings
- Upload your service account key file securely to Vercel

## Customizing the App

- Update the heading and text in `src/app/page.tsx` to match your wedding details
- Customize the design in the Chakra UI theme
- Add additional features like user authentication if needed

## Why Google Cloud Storage?

- ✅ No video processing delays (unlike Google Drive)
- ✅ Faster upload speeds
- ✅ Better cost control with budget alerts
- ✅ More reliable for high-traffic events
- ✅ Direct public URLs for media files

## License

MIT
