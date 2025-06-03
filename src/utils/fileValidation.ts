export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB for images
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB for videos (4K iPhone videos)
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mov',
  'video/avi',
  'video/quicktime',
  'video/x-msvideo'
];

export function validateFile(file: File): FileValidationResult {
  // Check file type first
  const isValidImage = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase());
  const isValidVideo = ALLOWED_VIDEO_TYPES.includes(file.type.toLowerCase());
  
  if (!isValidImage && !isValidVideo) {
    return {
      isValid: false,
      error: 'Неподдржан тип на фајл. Дозволени се само слики (JPEG, PNG, WebP, HEIC) и видеа (MP4, MOV, AVI).'
    };
  }

  // Check file size based on type
  if (isValidImage && file.size > MAX_IMAGE_SIZE) {
    return {
      isValid: false,
      error: `Сликата е преголема. Максимално ${MAX_IMAGE_SIZE / 1024 / 1024}MB се дозволени за слики.`
    };
  }

  if (isValidVideo && file.size > MAX_VIDEO_SIZE) {
    return {
      isValid: false,
      error: `Видеото е преголемо. Максимално ${MAX_VIDEO_SIZE / 1024 / 1024}MB се дозволени за видеа.`
    };
  }

  return { isValid: true };
}

export function validateFiles(files: File[]): FileValidationResult {
  for (const file of files) {
    const result = validateFile(file);
    if (!result.isValid) {
      return result;
    }
  }
  
  return { isValid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 