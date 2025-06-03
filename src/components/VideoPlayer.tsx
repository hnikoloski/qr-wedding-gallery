"use client";

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

// Custom styles for better video poster display
const videoPlayerStyles = `
  .vjs-poster {
    background-size: cover !important;
    background-position: center !important;
    background-repeat: no-repeat !important;
  }
  
  .video-js .vjs-poster {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }
  
  .video-js:not(.vjs-has-started) .vjs-poster {
    display: block !important;
  }
  
  .video-js .vjs-big-play-button {
    z-index: 2;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.7);
    border: 2px solid rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    width: 80px;
    height: 80px;
    font-size: 24px;
    line-height: 76px;
  }
  
  .video-js .vjs-big-play-button:hover {
    background-color: rgba(0, 0, 0, 0.9);
    border-color: white;
  }
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.textContent = videoPlayerStyles;
  document.head.appendChild(styleElement);
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onReady?: (player: any) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  width?: number | string;
  height?: number | string;
  className?: string;
  fluid?: boolean;
}

export interface VideoPlayerMethods {
  play: () => void;
  pause: () => void;
  dispose: () => void;
  currentTime: (time?: number) => number | void;
  volume: (vol?: number) => number | void;
  muted: (mute?: boolean) => boolean | void;
}

const VideoPlayer = forwardRef<VideoPlayerMethods, VideoPlayerProps>(
  (
    {
      src,
      poster,
      onReady,
      onPlay,
      onPause,
      onEnded,
      autoplay = false,
      muted = false,
      controls = true,
      width = "100%",
      height = "100%",
      className = "",
      fluid = true,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(
      null
    );

    // Helper function to determine video type
    const getVideoType = (url: string): string => {
      if (url.includes(".mp4")) return "video/mp4";
      if (url.includes(".mov")) return "video/quicktime";
      if (url.includes(".avi")) return "video/avi";
      if (url.includes(".webm")) return "video/webm";
      return "video/mp4"; // default
    };

    // Generate thumbnail if none provided
    const generateThumbnailFromVideo = async (videoSrc: string) => {
      try {
        const video = document.createElement("video");
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        return new Promise<string>((resolve, reject) => {
          video.onloadedmetadata = () => {
            // Set canvas size to 16:9 aspect ratio, max 400px wide
            const aspectRatio = video.videoHeight / video.videoWidth;
            canvas.width = Math.min(400, video.videoWidth);
            canvas.height = canvas.width * aspectRatio;

            // Seek to 2 seconds or 5% of video duration for a good frame
            video.currentTime = Math.min(2, video.duration * 0.05);
          };

          video.onseeked = () => {
            try {
              // Draw video frame to canvas
              ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

              // Convert to base64 with good quality
              const thumbnail = canvas.toDataURL("image/jpeg", 0.8);
              resolve(thumbnail);
            } catch (canvasError) {
              // Canvas may fail due to CORS - use fallback
              console.warn("Canvas drawing failed (likely CORS):", canvasError);
              reject(new Error("Canvas access blocked by CORS"));
            } finally {
              // Cleanup
              video.src = "";
              video.remove();
            }
          };

          video.onerror = (error) => {
            console.warn("Video loading failed (likely CORS):", error);
            reject(new Error("Video access blocked by CORS policy"));
          };

          // Configure video element - try without crossOrigin first
          video.preload = "metadata";
          video.muted = true; // Muted for autoplay policies

          // Don't set crossOrigin to avoid CORS preflight
          // video.crossOrigin = 'anonymous';

          video.src = videoSrc;
          video.load();
        });
      } catch (error) {
        console.warn("Failed to generate video thumbnail:", error);
        return null;
      }
    };

    // Expose player methods for external control
    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          if (playerRef.current && !playerRef.current.isDisposed()) {
            playerRef.current.play();
          }
        },
        pause: () => {
          if (playerRef.current && !playerRef.current.isDisposed()) {
            playerRef.current.pause();
          }
        },
        dispose: () => {
          if (playerRef.current && !playerRef.current.isDisposed()) {
            playerRef.current.dispose();
            playerRef.current = null;
          }
        },
        currentTime: (time?: number) => {
          if (playerRef.current && !playerRef.current.isDisposed()) {
            if (time !== undefined) {
              playerRef.current.currentTime(time);
            } else {
              return playerRef.current.currentTime();
            }
          }
        },
        volume: (vol?: number) => {
          if (playerRef.current && !playerRef.current.isDisposed()) {
            if (vol !== undefined) {
              playerRef.current.volume(vol);
            } else {
              return playerRef.current.volume();
            }
          }
        },
        muted: (mute?: boolean) => {
          if (playerRef.current && !playerRef.current.isDisposed()) {
            if (mute !== undefined) {
              playerRef.current.muted(mute);
            } else {
              return playerRef.current.muted();
            }
          }
        },
      }),
      []
    );

    // Generate thumbnail if none provided
    useEffect(() => {
      if (!poster && src && !generatedThumbnail) {
        generateThumbnailFromVideo(src)
          .then((thumbnail) => {
            if (thumbnail) {
              setGeneratedThumbnail(thumbnail);
            }
          })
          .catch((error) => {
            console.warn("Thumbnail generation failed:", error.message);
            // Don't set any thumbnail - VideoPlayer will work without poster
          });
      }
    }, [src, poster, generatedThumbnail]);

    useEffect(() => {
      // Make sure Video.js player is only initialized once
      if (!playerRef.current && videoRef.current) {
        // Create video element
        const videoElement = document.createElement("video-js");
        videoElement.classList.add("vjs-default-skin");

        if (className) {
          videoElement.classList.add(className);
        }

        videoRef.current.appendChild(videoElement);

        // Use provided poster or generated thumbnail
        const posterUrl = poster || generatedThumbnail || undefined;

        const player = videojs(
          videoElement,
          {
            autoplay: autoplay,
            controls: controls,
            muted: muted,
            preload: "metadata",
            fluid: fluid,
            responsive: true,
            width: width,
            height: height,
            poster: posterUrl,
            sources: [
              {
                src: src,
                type: getVideoType(src),
              },
            ],
            // Enhanced video.js options
            disablePictureInPicture: true,
            playsinline: true,
            contextMenu: false,
            // Ensure poster shows
            fill: true,
            // Better thumbnail display
            techOrder: ["html5"],
            html5: {
              preloadTextTracks: false,
            },
          },
          () => {
            setIsPlayerReady(true);
            if (onReady) {
              onReady(player);
            }
          }
        );

        // Set up event listeners
        player.on("play", () => {
          if (onPlay) onPlay();
        });

        player.on("pause", () => {
          if (onPause) onPause();
        });

        player.on("ended", () => {
          if (onEnded) onEnded();
        });

        // Store player reference
        playerRef.current = player;
      }

      return () => {
        const player = playerRef.current;
        if (player && !player.isDisposed()) {
          player.dispose();
          playerRef.current = null;
          setIsPlayerReady(false);
        }
      };
    }, [
      src,
      poster,
      generatedThumbnail,
      autoplay,
      muted,
      controls,
      width,
      height,
      className,
      fluid,
      onReady,
      onPlay,
      onPause,
      onEnded,
    ]);

    // Update source when src changes
    useEffect(() => {
      const player = playerRef.current;
      if (player && isPlayerReady && src) {
        player.src([
          {
            src: src,
            type: getVideoType(src),
          },
        ]);
      }
    }, [src, isPlayerReady]);

    // Update poster when thumbnail is generated
    useEffect(() => {
      const player = playerRef.current;
      if (player && isPlayerReady && (poster || generatedThumbnail)) {
        const posterUrl = poster || generatedThumbnail;
        if (posterUrl) {
          player.poster(posterUrl);
        }
      }
    }, [poster, generatedThumbnail, isPlayerReady]);

    return (
      <div
        data-vjs-player
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
        }}
      >
        <div ref={videoRef} />
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
