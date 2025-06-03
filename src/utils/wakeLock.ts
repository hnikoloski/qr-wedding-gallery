/**
 * Wake Lock utility to prevent phone from sleeping during uploads
 */

let wakeLock: WakeLockSentinel | null = null;

/**
 * Request wake lock to keep screen awake during uploads
 */
export async function requestWakeLock(): Promise<boolean> {
  try {
    // Check if Wake Lock API is supported
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake lock activated - screen will stay awake during upload');
      
      // Listen for wake lock release
      wakeLock.addEventListener('release', () => {
        console.log('Wake lock released');
      });
      
      return true;
    } else {
      console.warn('Wake Lock API not supported on this device');
      return false;
    }
  } catch (error) {
    console.error('Failed to request wake lock:', error);
    return false;
  }
}

/**
 * Release wake lock when upload is complete
 */
export async function releaseWakeLock(): Promise<void> {
  try {
    if (wakeLock && !wakeLock.released) {
      await wakeLock.release();
      wakeLock = null;
      console.log('Wake lock released - screen can sleep again');
    }
  } catch (error) {
    console.error('Failed to release wake lock:', error);
  }
}

/**
 * Check if wake lock is currently active
 */
export function isWakeLockActive(): boolean {
  return wakeLock !== null && !wakeLock.released;
}

/**
 * Handle visibility change (when user switches apps)
 */
export function handleVisibilityChange(): void {
  if (document.hidden && wakeLock && !wakeLock.released) {
    console.log('Page hidden but wake lock still active');
  }
}

// Listen for page visibility changes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange);
} 