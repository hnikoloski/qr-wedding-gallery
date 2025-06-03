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

  const fetchPhotos = async (isManualRefresh = false) => {
    try {
      const currentlyLoading = isLoading || isRefreshing;
      if (!currentlyLoading) {
        setIsRefreshing(true);
      }

      // Clear photos for fresh data - NO CACHE approach
      clearPhotos();

      // Simple cache-busting with timestamp - no excessive headers
      const timestamp = Date.now();
      const url = `/api/photos`;

      const response = await fetch(url, {
        method: "POST",
        cache: "no-store", // Ensure no browser caching
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Timestamp": timestamp.toString(),
        },
        body: JSON.stringify({
          timestamp,
          manualRefresh: isManualRefresh,
          action: "fetch_photos",
        }),
      });

      const data = await response.json();

      if (response.ok && data.photos) {
        console.log("Received photos from API:", data.photos.length);

        if (data.photos.length > 0) {
          addPhotos(data.photos);
        }

        if (isManualRefresh) {
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
          title: "Грешка при вчитување",
          description: "Не можам да ги вчитам фотографиите од серверот",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error fetching photos:", error);
      toast({
        title: "Грешка при освежување",
        description: "Не можам да ги освежам фотографиите од серверот",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchPhotos(true); // Manual refresh with user feedback
  };

  const handleUploadComplete = () => {
    // After upload, refresh gallery to show new photos
    fetchPhotos(false); // Silent refresh after upload
  };

  // Only load photos on initial mount - NO auto refresh
  useEffect(() => {
    fetchPhotos(false); // Initial load
  }, []); // Remove dependencies to prevent auto-refresh

  return (
    <Container maxW="container.xl" py={8}>
      <PerformanceMonitor />
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="2xl" mb={2}>
            Тамара & Христијан
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Споделете ги вашите посебни моменти од нашата свадба
          </Text>
        </Box>

        <PhotoUploader onUploadComplete={handleUploadComplete} />
        <PhotoGallery
          isLoading={isLoading || isRefreshing}
          onRefresh={handleManualRefresh}
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
