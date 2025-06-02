"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import PhotoUploader from "@/components/PhotoUploader";
import PhotoGallery from "@/components/PhotoGallery";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import { usePhotoStore } from "@/store/photoStore";

interface PhotoResponse {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  url: string;
  thumbnailUrl: string;
}

export default function Home() {
  const { addPhotos, clearPhotos } = usePhotoStore();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPhotos = async (bypassCache = false) => {
    try {
      const currentlyLoading = isLoading || isRefreshing;
      if (!currentlyLoading) {
        setIsRefreshing(true);
      }

      // Clear any stored photos to ensure fresh data from Google Cloud Storage
      clearPhotos();

      // ULTRA aggressive cache-busting with multiple layers
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(7);
      const random2 = Math.random().toString(36).substring(7);
      const random3 = Math.random().toString(36).substring(7);
      const sessionId = crypto.randomUUID();

      // Use POST method to bypass GET-based caches entirely
      const url = `/api/photos`;

      const cacheBustBody = JSON.stringify({
        timestamp,
        random1,
        random2,
        random3,
        sessionId,
        cacheBust: true,
        bypassCache: true,
        action: "fetch_photos",
      });

      const response = await fetch(url, {
        method: "POST", // Use POST to bypass GET-based caches
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "no-cache, no-store, must-revalidate, max-age=0, private",
          Pragma: "no-cache",
          Expires: "-1",
          "X-Requested-With": "XMLHttpRequest",
          "X-Cache-Bust": timestamp.toString(),
          "X-Random-1": random1,
          "X-Random-2": random2,
          "X-Random-3": random3,
          "X-Session-ID": sessionId,
          "X-Bypass-Cache": "true",
          "X-Force-Fresh": "true",
          // Add more cache-busting headers
          "X-Timestamp": new Date().toISOString(),
          "X-User-Agent-Hash": btoa(navigator.userAgent).substring(0, 16),
        },
        body: cacheBustBody,
      });

      const data = await response.json();

      if (response.ok && data.photos) {
        console.log("Received photos from API:", data.photos.length);
        console.log("API response timestamp:", data.timestamp);
        console.log("Fresh data marker:", data._fresh);

        // Photos are already sorted by createdTime desc from the API
        if (data.photos.length > 0) {
          addPhotos(data.photos);
        } else {
          console.log("No photos found in Google Cloud Storage");
        }

        if (bypassCache) {
          toast({
            title: "Сликите се освежија",
            description: `Има ${data.photos.length} фотографии во галеријата`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        }
      } else if (!response.ok) {
        console.error("Failed to fetch photos:", data.error);
        toast({
          title: "Error fetching photos",
          description: "Could not load photos from Google Cloud Storage",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error fetching photos:", error);
      toast({
        title: "Error refreshing photos",
        description: "Could not refresh photos from Google Cloud Storage",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchPhotos(true); // Bypass cache
  };

  useEffect(() => {
    fetchPhotos(); // Always bypass cache for immediate updates
  }, [addPhotos, clearPhotos, toast]);

  // Add periodic refresh to ensure gallery stays up-to-date
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Only auto-refresh if not currently loading
      if (!isLoading && !isRefreshing) {
        console.log("Auto-refreshing gallery to check for new photos...");
        fetchPhotos(false); // Silent refresh without toast
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [isLoading, isRefreshing]);

  return (
    <Container maxW="container.xl" py={8}>
      <PerformanceMonitor />
      <VStack spacing={8} align="stretch">
        <Box textAlign="center" py={6}>
          <Heading as="h1" size="2xl" mb={2}>
            Тамара & Христијан
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Споделете ги вашите посебни моменти од нашата свадба
          </Text>
        </Box>

        <PhotoUploader onUploadComplete={() => fetchPhotos(true)} />
        <PhotoGallery
          isLoading={isLoading || isRefreshing}
          onRefresh={handleRefresh}
        />

        <Box mt={10} textAlign="center">
          <Heading as="h2" size="lg" mb={4}>
            Share with Friends
          </Heading>
          <QRCodeDisplay />
          <Text mt={4} fontSize="sm" color="gray.500">
            Scan this QR code to upload your own photos
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
