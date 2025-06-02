"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardBody,
  Center,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
  Flex,
  Button,
  ButtonGroup,
  Select,
  Skeleton,
  VStack,
} from "@chakra-ui/react";
import { usePhotoStore } from "@/store/photoStore";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  RepeatIcon,
} from "@chakra-ui/icons";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";
import Image from "next/image";
import { Upload } from "lucide-react";
import { Icon } from "@chakra-ui/react";
import { generateVideoThumbnail } from "@/utils/uploadHelpers";

interface PhotoGalleryProps {
  isLoading?: boolean;
  onRefresh?: () => void;
}

const ITEMS_PER_PAGE = 24; // 4x6 grid on desktop (adjust as needed)

export default function PhotoGallery({
  isLoading = false,
  onRefresh,
}: PhotoGalleryProps) {
  const { photos, clearStaleBlobUrls } = usePhotoStore();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [displayedPhotos, setDisplayedPhotos] = useState<string[]>([]);

  // Clear stale blob URLs on component mount (they don't persist across page refreshes)
  useEffect(() => {
    const photosWithBlobUrls = photos.filter((photo) => photo.tempBlobUrl);
    if (photosWithBlobUrls.length > 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("Clearing stale blob URLs from previous session");
      }
      clearStaleBlobUrls();
    }
  }, []); // Run only on mount

  // Calculate photo and video counts
  const photoCount = useMemo(() => {
    return photos.filter((photo) => !photo.mimeType?.startsWith("video/"))
      .length;
  }, [photos]);

  const videoCount = useMemo(() => {
    return photos.filter((photo) => photo.mimeType?.startsWith("video/"))
      .length;
  }, [photos]);

  // Memoize photo URLs to prevent infinite re-renders
  const photoUrls = useMemo(() => photos.map((photo) => photo.url), [photos]);

  // Calculate pagination values when photos array changes
  useEffect(() => {
    if (photoUrls.length === 0) {
      setTotalPages(1);
      setDisplayedPhotos([]);
      return;
    }

    const pages = Math.ceil(photoUrls.length / ITEMS_PER_PAGE);
    setTotalPages(pages);

    // Ensure current page is valid
    if (currentPage > pages) {
      setCurrentPage(1);
    }

    // Set displayed photos for current page
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, photoUrls.length);
    setDisplayedPhotos(photoUrls.slice(startIndex, endIndex));
  }, [photoUrls, currentPage]);

  const openLightbox = (photoUrl: string) => {
    const index = photoUrls.indexOf(photoUrl);
    setPhotoIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    // Pause all videos when closing lightbox
    pauseAllVideos();
    setLightboxOpen(false);
  };

  const handleSlideChange = (index: number) => {
    // Pause all videos when changing slides
    pauseAllVideos();
    setPhotoIndex(index);
  };

  const pauseAllVideos = () => {
    // Pause all video elements in the page
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
      if (!video.paused) {
        video.pause();
      }
    });

    // Also try to pause videos in iframes (though this may not work due to cross-origin restrictions)
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      try {
        // This will only work for same-origin iframes
        iframe.contentWindow?.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}',
          "*"
        );
      } catch (e) {
        // Silently ignore cross-origin errors
      }
    });
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Convert photos array to lightbox slides format (all media types)
  const slides = photoUrls.map((photoUrl, index) => {
    const photoObject = photos[index];
    const isVideo = photoObject?.mimeType?.startsWith("video/") || false;

    if (isVideo) {
      // Better video placeholder thumbnail
      const videoThumbnailPlaceholder = `data:image/svg+xml;base64,${btoa(`
        <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="80" fill="#2D3748" rx="8"/>
          <circle cx="60" cy="40" r="16" fill="#4A5568"/>
          <polygon points="55,32 55,48 70,40" fill="#E2E8F0"/>
          <text x="60" y="65" font-family="Arial, sans-serif" font-size="8" fill="#A0ADB8" text-anchor="middle">VIDEO</text>
        </svg>
      `)}`;

      // Use generated thumbnail or fallback to video placeholder
      const thumbnail = photoObject?.thumbnailUrl || videoThumbnailPlaceholder;

      return {
        src: photoUrl,
        alt: photoObject?.name || `Wedding video ${index + 1}`,
        thumbnail: thumbnail,
        isVideoIframe: true,
      };
    } else {
      return {
        src: photoUrl,
        alt: photoObject?.name || `Wedding photo ${index + 1}`,
        thumbnail: photoUrl,
      };
    }
  });

  // Show loading spinner when fetching photos
  if (isLoading) {
    return (
      <Card
        variant="outline"
        borderRadius="xl"
        boxShadow="0 4px 15px 0 rgba(0, 0, 0, 0.1)"
      >
        <CardBody>
          <VStack spacing={8} align="stretch">
            <Box textAlign="center">
              <Heading
                as="h2"
                size={{ base: "xl", md: "lg" }}
                bgGradient="linear(to-r, blue.600, purple.600)"
                bgClip="text"
                fontWeight="bold"
                mb={2}
              >
                Галерија на фотографии и видеа
              </Heading>
              <Text fontSize="md" color="gray.600" fontWeight="medium">
                Се вчитуваат фотографиите...
              </Text>
            </Box>
            <Center py={16} flexDirection="column">
              <Box
                position="relative"
                borderRadius="full"
                bgGradient="linear(to-r, blue.100, purple.100)"
                p={6}
                mb={6}
                w="120px"
                h="120px"
                display="flex"
                justifyContent="center"
                alignItems="center"
              >
                <Spinner
                  size="xl"
                  color="blue.500"
                  thickness="4px"
                  speed="0.8s"
                />
              </Box>
              <Text
                color="gray.600"
                fontSize={{ base: "lg", md: "md" }}
                textAlign="center"
                fontWeight="semibold"
              >
                Се вчитуваат фотографиите...
              </Text>
              <Text
                color="gray.400"
                fontSize={{ base: "md", md: "sm" }}
                textAlign="center"
                mt={2}
              >
                Ве молиме почекајте додека ги вчитуваме најновите фотографии
              </Text>
            </Center>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card
        variant="outline"
        borderRadius="xl"
        boxShadow="0 4px 15px 0 rgba(0, 0, 0, 0.1)"
      >
        <CardBody>
          <VStack spacing={8} align="stretch">
            <Box textAlign="center">
              <Heading
                as="h2"
                size={{ base: "xl", md: "lg" }}
                bgGradient="linear(to-r, blue.600, purple.600)"
                bgClip="text"
                fontWeight="bold"
                mb={2}
              >
                Свадбена фотографска галерија
              </Heading>
              <Text fontSize="md" color="gray.600" fontWeight="medium">
                0 фотографии и 0 видеа
              </Text>
            </Box>
            <Center py={16} flexDirection="column">
              <Box
                borderRadius="full"
                bgGradient="linear(to-r, gray.100, gray.200)"
                mb={6}
                w="120px"
                h="120px"
                display="flex"
                justifyContent="center"
                alignItems="center"
              >
                <Icon as={Upload} boxSize={12} color="gray.400" />
              </Box>
              <Text
                color="gray.600"
                mb={2}
                fontSize={{ base: "lg", md: "md" }}
                textAlign="center"
                fontWeight="semibold"
              >
                Сè уште нема прикачени фотографии и видеа
              </Text>
              <Text
                fontSize={{ base: "md", md: "sm" }}
                color="gray.400"
                textAlign="center"
                maxW="300px"
              >
                Бидете првите кои ќе споделат прекрасен момент од свадбата!
              </Text>
            </Center>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    // Create page number buttons
    const pageButtons = [];
    const maxVisibleButtons = 5;

    let startPage = Math.max(
      1,
      currentPage - Math.floor(maxVisibleButtons / 2)
    );
    const endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    // Adjust start if we're near the end
    if (endPage - startPage < maxVisibleButtons - 1) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <Button
          key={i}
          size="sm"
          colorScheme={i === currentPage ? "blue" : "gray"}
          onClick={() => goToPage(i)}
        >
          {i}
        </Button>
      );
    }

    return (
      <VStack spacing={6} mt={10}>
        {/* Mobile Pagination */}
        <Box display={{ base: "block", md: "none" }} w="100%">
          <VStack spacing={4}>
            {/* Page Info - Clean and Simple */}
            <Box
              bg="gray.50"
              borderRadius="xl"
              px={4}
              py={2}
              border="1px solid"
              borderColor="gray.200"
            >
              <Text
                fontSize="sm"
                fontWeight="semibold"
                color="gray.700"
                textAlign="center"
              >
                Страница {currentPage} од {totalPages}
              </Text>
            </Box>

            {/* Navigation Buttons */}
            <Flex justify="space-between" align="center" w="100%" gap={3}>
              <Button
                leftIcon={<ChevronLeftIcon />}
                onClick={() => goToPage(currentPage - 1)}
                isDisabled={currentPage === 1}
                size="md"
                borderRadius="xl"
                bgGradient={
                  currentPage === 1
                    ? "linear(to-r, gray.200, gray.300)"
                    : "linear(to-r, blue.400, blue.600)"
                }
                color={currentPage === 1 ? "gray.500" : "white"}
                fontWeight="semibold"
                flex="1"
                boxShadow={
                  currentPage === 1
                    ? "none"
                    : "0 3px 10px 0 rgba(59, 130, 246, 0.3)"
                }
                _hover={{
                  bgGradient:
                    currentPage === 1
                      ? "linear(to-r, gray.200, gray.300)"
                      : "linear(to-r, blue.500, blue.700)",
                  transform: currentPage === 1 ? "none" : "translateY(-1px)",
                  boxShadow:
                    currentPage === 1
                      ? "none"
                      : "0 6px 20px 0 rgba(59, 130, 246, 0.4)",
                }}
                _active={{
                  transform: currentPage === 1 ? "none" : "translateY(0px)",
                }}
                transition="all 0.3s ease"
              >
                Претходна
              </Button>

              {/* Page Selector - Only show if more than 3 pages */}
              {totalPages > 3 && (
                <Select
                  size="md"
                  width="80px"
                  value={currentPage}
                  onChange={(e) => goToPage(Number(e.target.value))}
                  borderRadius="xl"
                  fontWeight="semibold"
                  borderColor="blue.300"
                  bg="white"
                  textAlign="center"
                  _focus={{
                    borderColor: "blue.500",
                    boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.5)",
                  }}
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </Select>
              )}

              <Button
                rightIcon={<ChevronRightIcon />}
                onClick={() => goToPage(currentPage + 1)}
                isDisabled={currentPage === totalPages}
                size="md"
                borderRadius="xl"
                bgGradient={
                  currentPage === totalPages
                    ? "linear(to-r, gray.200, gray.300)"
                    : "linear(to-r, blue.400, blue.600)"
                }
                color={currentPage === totalPages ? "gray.500" : "white"}
                fontWeight="semibold"
                flex="1"
                boxShadow={
                  currentPage === totalPages
                    ? "none"
                    : "0 3px 10px 0 rgba(59, 130, 246, 0.3)"
                }
                _hover={{
                  bgGradient:
                    currentPage === totalPages
                      ? "linear(to-r, gray.200, gray.300)"
                      : "linear(to-r, blue.500, blue.700)",
                  transform:
                    currentPage === totalPages ? "none" : "translateY(-1px)",
                  boxShadow:
                    currentPage === totalPages
                      ? "none"
                      : "0 6px 20px 0 rgba(59, 130, 246, 0.4)",
                }}
                _active={{
                  transform:
                    currentPage === totalPages ? "none" : "translateY(0px)",
                }}
                transition="all 0.3s ease"
              >
                Следна
              </Button>
            </Flex>

            {/* Page Numbers for small page counts */}
            {totalPages <= 3 && totalPages > 1 && (
              <Flex justify="center" gap={2} w="100%">
                {Array.from({ length: totalPages }, (_, i) => (
                  <Button
                    key={i + 1}
                    size="sm"
                    borderRadius="lg"
                    bgGradient={
                      currentPage === i + 1
                        ? "linear(to-r, blue.500, purple.500)"
                        : "linear(to-r, gray.100, gray.200)"
                    }
                    color={currentPage === i + 1 ? "white" : "gray.600"}
                    fontWeight="semibold"
                    minW="40px"
                    onClick={() => goToPage(i + 1)}
                    boxShadow={
                      currentPage === i + 1
                        ? "0 2px 8px 0 rgba(59, 130, 246, 0.3)"
                        : "none"
                    }
                    _hover={{
                      bgGradient:
                        currentPage === i + 1
                          ? "linear(to-r, blue.600, purple.600)"
                          : "linear(to-r, gray.200, gray.300)",
                      transform: "translateY(-1px)",
                      boxShadow:
                        currentPage === i + 1
                          ? "0 4px 12px 0 rgba(59, 130, 246, 0.4)"
                          : "0 2px 6px 0 rgba(0, 0, 0, 0.1)",
                    }}
                    transition="all 0.3s ease"
                  >
                    {i + 1}
                  </Button>
                ))}
              </Flex>
            )}
          </VStack>
        </Box>

        {/* Desktop Pagination */}
        <Flex
          justify="center"
          display={{ base: "none", md: "flex" }}
          wrap="wrap"
          gap={4}
        >
          <ButtonGroup spacing={2}>
            <Button
              leftIcon={<ChevronLeftIcon />}
              onClick={() => goToPage(currentPage - 1)}
              isDisabled={currentPage === 1}
              size="md"
              borderRadius="lg"
              bgGradient={
                currentPage === 1
                  ? "linear(to-r, gray.200, gray.300)"
                  : "linear(to-r, blue.400, blue.600)"
              }
              color={currentPage === 1 ? "gray.500" : "white"}
              fontWeight="semibold"
              boxShadow={
                currentPage === 1
                  ? "none"
                  : "0 3px 10px 0 rgba(59, 130, 246, 0.3)"
              }
              _hover={{
                bgGradient:
                  currentPage === 1
                    ? "linear(to-r, gray.200, gray.300)"
                    : "linear(to-r, blue.500, blue.700)",
                transform: currentPage === 1 ? "none" : "translateY(-1px)",
                boxShadow:
                  currentPage === 1
                    ? "none"
                    : "0 6px 20px 0 rgba(59, 130, 246, 0.4)",
              }}
              transition="all 0.3s ease"
            >
              Претходна
            </Button>

            {/* Page number buttons with modern styling */}
            {pageButtons.map((button, index) => (
              <Button
                key={index}
                size="md"
                borderRadius="lg"
                bgGradient={
                  button.props.colorScheme === "blue"
                    ? "linear(to-r, blue.500, purple.500)"
                    : "linear(to-r, gray.100, gray.200)"
                }
                color={
                  button.props.colorScheme === "blue" ? "white" : "gray.600"
                }
                fontWeight="semibold"
                boxShadow={
                  button.props.colorScheme === "blue"
                    ? "0 3px 10px 0 rgba(59, 130, 246, 0.3)"
                    : "none"
                }
                onClick={button.props.onClick}
                _hover={{
                  bgGradient:
                    button.props.colorScheme === "blue"
                      ? "linear(to-r, blue.600, purple.600)"
                      : "linear(to-r, gray.200, gray.300)",
                  transform: "translateY(-1px)",
                  boxShadow:
                    button.props.colorScheme === "blue"
                      ? "0 6px 20px 0 rgba(59, 130, 246, 0.4)"
                      : "0 3px 10px 0 rgba(0, 0, 0, 0.1)",
                }}
                transition="all 0.3s ease"
              >
                {button.props.children}
              </Button>
            ))}

            <Button
              rightIcon={<ChevronRightIcon />}
              onClick={() => goToPage(currentPage + 1)}
              isDisabled={currentPage === totalPages}
              size="md"
              borderRadius="lg"
              bgGradient={
                currentPage === totalPages
                  ? "linear(to-r, gray.200, gray.300)"
                  : "linear(to-r, blue.400, blue.600)"
              }
              color={currentPage === totalPages ? "gray.500" : "white"}
              fontWeight="semibold"
              boxShadow={
                currentPage === totalPages
                  ? "none"
                  : "0 3px 10px 0 rgba(59, 130, 246, 0.3)"
              }
              _hover={{
                bgGradient:
                  currentPage === totalPages
                    ? "linear(to-r, gray.200, gray.300)"
                    : "linear(to-r, blue.500, blue.700)",
                transform:
                  currentPage === totalPages ? "none" : "translateY(-1px)",
                boxShadow:
                  currentPage === totalPages
                    ? "none"
                    : "0 6px 20px 0 rgba(59, 130, 246, 0.4)",
              }}
              transition="all 0.3s ease"
            >
              Следна
            </Button>
          </ButtonGroup>

          <Flex align="center" gap={3}>
            <Text fontSize="sm" fontWeight="semibold" color="gray.600">
              Страница {currentPage} од {totalPages}
            </Text>
            <Select
              size="sm"
              width="70px"
              value={currentPage}
              onChange={(e) => goToPage(Number(e.target.value))}
              borderRadius="lg"
              fontWeight="semibold"
              borderColor="blue.300"
              _focus={{
                borderColor: "blue.500",
                boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.5)",
              }}
            >
              {Array.from({ length: totalPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </Select>
          </Flex>
        </Flex>
      </VStack>
    );
  };

  return (
    <Card
      variant="outline"
      borderRadius="xl"
      boxShadow="0 4px 15px 0 rgba(0, 0, 0, 0.1)"
    >
      <CardBody>
        <Box mb={8}>
          {/* Mobile-First Header Layout */}
          <VStack
            spacing={6}
            align="stretch"
            display={{ base: "flex", md: "none" }}
          >
            <Box textAlign="center">
              <Heading
                as="h2"
                size="xl"
                bgGradient="linear(to-r, blue.600, purple.600)"
                bgClip="text"
                fontWeight="bold"
                mb={2}
              >
                Свадбена фотографска галерија
              </Heading>
              <Text fontSize="md" color="gray.600" fontWeight="medium">
                {photoCount} фотографии и {videoCount} видео
              </Text>
            </Box>
            {onRefresh && (
              <Button
                size="lg"
                height="50px"
                w="100%"
                borderRadius="xl"
                bgGradient="linear(to-r, teal.400, teal.600, blue.500)"
                color="white"
                fontWeight="bold"
                fontSize="md"
                boxShadow="0 4px 15px 0 rgba(45, 212, 191, 0.35)"
                leftIcon={<RepeatIcon />}
                onClick={onRefresh}
                isLoading={isLoading}
                loadingText="Се освежува..."
                _hover={{
                  bgGradient: "linear(to-r, teal.500, teal.700, blue.600)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 25px 0 rgba(45, 212, 191, 0.45)",
                }}
                _active={{
                  transform: "translateY(0px)",
                }}
                transition="all 0.3s ease"
              >
                Освежи
              </Button>
            )}
          </VStack>

          {/* Desktop Header Layout */}
          <Box display={{ base: "none", md: "block" }}>
            <Flex justify="space-between" align="center" mb={2}>
              <Heading
                as="h2"
                size="lg"
                bgGradient="linear(to-r, blue.600, purple.600)"
                bgClip="text"
                fontWeight="bold"
              >
                Свадбена фотографска галерија
              </Heading>
              {onRefresh && (
                <Button
                  size="md"
                  borderRadius="xl"
                  bgGradient="linear(to-r, teal.400, teal.600, blue.500)"
                  color="white"
                  fontWeight="semibold"
                  boxShadow="0 3px 10px 0 rgba(45, 212, 191, 0.3)"
                  leftIcon={<RepeatIcon />}
                  onClick={onRefresh}
                  isLoading={isLoading}
                  loadingText="Се освежува..."
                  _hover={{
                    bgGradient: "linear(to-r, teal.500, teal.700, blue.600)",
                    transform: "translateY(-1px)",
                    boxShadow: "0 6px 20px 0 rgba(45, 212, 191, 0.4)",
                  }}
                  _active={{
                    transform: "translateY(0px)",
                  }}
                  transition="all 0.3s ease"
                >
                  Освежи
                </Button>
              )}
            </Flex>
            <Text fontSize="sm" color="gray.500" fontWeight="medium">
              {photoCount} фотографии и {videoCount} видео
            </Text>
          </Box>
        </Box>

        <SimpleGrid
          columns={{ base: 2, md: 3, lg: 4 }}
          spacing={{ base: 4, md: 5 }}
        >
          {displayedPhotos.map((photo, index) => {
            const photoObject = photos.find((p) => p.url === photo);
            const isVideo =
              photoObject?.mimeType?.startsWith("video/") || false;

            return (
              <Box
                key={index}
                borderRadius={{ base: "xl", md: "lg" }}
                overflow="hidden"
                cursor="pointer"
                onClick={() => openLightbox(photo)}
                transition="all 0.3s ease"
                _hover={{
                  transform: "scale(1.05)",
                  shadow: "2xl",
                  zIndex: 1,
                }}
                bg="white"
                position="relative"
                boxShadow="0 4px 15px 0 rgba(0, 0, 0, 0.1)"
                border="1px solid"
                borderColor="gray.100"
              >
                <Box
                  position="relative"
                  width="100%"
                  height={{ base: "200px", md: "220px" }}
                  borderRadius={{ base: "xl", md: "lg" }}
                  overflow="hidden"
                  bg="gray.50"
                >
                  {isVideo ? (
                    // Show static thumbnail for videos in gallery, not playable content
                    photoObject?.thumbnailUrl ? (
                      <Image
                        src={photoObject.thumbnailUrl}
                        alt={`Wedding video ${index + 1} thumbnail`}
                        fill
                        style={{ objectFit: "cover" }}
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkrHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R/aQVoSYVRVVKUpJJZWk2UopimKYqhslKIqqXKKUpJNzylFKUkm5RS6LUalQD6oa1BLy1eO2sBjOeaLQlJJuQaduzmnY3CSpQqQSA9sNJNOdLcOYG/4ZjlIyiLAo5fOi/LNH3FwcTH5CFAUx1n8RkRm8Lq7WGHpLGLGVKQIANEJORHTR6P5UDbwmSHB4YO5TP1IvmlNFqZNiWUdCDLdoebRCx7O1S7p4iYZNJJ1jKSh8gO9iKJ+ij3i9m1gBZ6pDLbO/AwvIUpREBAOGS1pR1lNKUdSKSSlLaIDUgTJxcUGKlERV1BWKQOTYRNWPWcOdVWH0Q0Dp0SZXEZlTNtxSJH5HkBgNGHSDADRRB9ISKS8rNn8HlWYGgR+TbLT8iLM1SjqSECT10LlAp5b1GKJUUpZoFMR0KEU1FX8K5T++qlJ6v88jqo5Xgc1C3kJAZYxkmKFpwA+PJhVHJ+BLqQJJ2I/DGJ4QJy0x7kzFhNXu8K+Cb17PGc+K1J1dXdKhFlvOVLlFVLSYJslJNc7pJKUkqKUkv/AP/Z"
                        onLoad={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      />
                    ) : (
                      // Fallback video placeholder thumbnail
                      <Box
                        width="100%"
                        height="100%"
                        bg="gray.200"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexDirection="column"
                        color="gray.500"
                      >
                        <Box fontSize="4xl" mb={2}>
                          🎬
                        </Box>
                        <Text fontSize="sm" fontWeight="bold">
                          VIDEO
                        </Text>
                      </Box>
                    )
                  ) : (
                    <Image
                      src={photo}
                      alt={`Wedding photo ${index + 1}`}
                      fill
                      style={{ objectFit: "cover" }}
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkrHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R/aQVoSYVRVVKUpJJZWk2UopimKYqhslKIqqXKKUpJNzylFKUkm5RS6LUalQD6oa1BLy1eO2sBjOeaLQlJJuQaduzmnY3CSpQqQSA9sNJNOdLcOYG/4ZjlIyiLAo5fOi/LNH3FwcTH5CFAUx1n8RkRm8Lq7WGHpLGLGVKQIANEJORHTR6P5UDbwmSHB4YO5TP1IvmlNFqZNiWUdCDLdoebRCx7O1S7p4iYZNJJ1jKSh8gO9iKJ+ij3i9m1gBZ6pDLbO/AwvIUpREBAOGS1pR1lNKUdSKSSlLaIDUgTJxcUGKlERV1BWKQOTYRNWPWcOdVWH0Q0Dp0SZXEZlTNtxSJH5HkBgNGHSDADRRB9ISKS8rNn8HlWYGgR+TbLT8iLM1SjqSECT10LlAp5b1GKJUUpZoFMR0KEU1FX8K5T++qlJ6v88jqo5Xgc1C3kJAZYxkmKFpwA+PJhVHJ+BLqQJJ2I/DGJ4QJy0x7kzFhNXu8K+Cb17PGc+K1J1dXdKhFlvOVLlFVLSYJslJNc7pJKUkqKUkv/AP/Z"
                      onLoad={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                    />
                  )}

                  {/* Video play indicator */}
                  {isVideo && (
                    <Box
                      position="absolute"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                      bg="blackAlpha.700"
                      borderRadius="full"
                      p={4}
                      color="white"
                      fontSize="3xl"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      boxShadow="0 4px 15px rgba(0,0,0,0.3)"
                    >
                      ▶
                    </Box>
                  )}

                  {/* New tab indicator for videos */}
                  {isVideo && (
                    <Box
                      position="absolute"
                      top={2}
                      right={2}
                      bg="blackAlpha.700"
                      color="white"
                      px={2}
                      py={1}
                      borderRadius="md"
                      fontSize="xs"
                      fontWeight="bold"
                    >
                      🎬 Video
                    </Box>
                  )}
                </Box>

                {/* Loading overlay */}
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  bg="gray.100"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  opacity={0}
                  transition="opacity 0.3s"
                  _loading={{ opacity: 1 }}
                >
                  <Spinner size="md" color="gray.500" />
                </Box>
              </Box>
            );
          })}

          {/* Skeleton placeholders while loading */}
          {isLoading && (
            <>
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton
                  key={`skeleton-${index}`}
                  height="200px"
                  borderRadius="md"
                  startColor="gray.100"
                  endColor="gray.200"
                />
              ))}
            </>
          )}
        </SimpleGrid>

        {/* Pagination controls */}
        {renderPagination()}

        {/* Professional Lightbox */}
        <Lightbox
          open={lightboxOpen}
          close={closeLightbox}
          slides={slides}
          index={photoIndex}
          on={{
            view: ({ index }: { index: number }) => handleSlideChange(index),
          }}
          plugins={[Thumbnails, Fullscreen, Slideshow, Zoom, Video]}
          render={{
            slide: ({ slide }) => {
              if ((slide as any).isVideoIframe) {
                const photoObject = photos.find(
                  (p) => p.url === (slide as any).src
                );

                // Use blob URL for immediate playback if available and still processing
                if (photoObject?.tempBlobUrl && photoObject?.isProcessing) {
                  return (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "#000",
                      }}
                    >
                      <video
                        src={photoObject.tempBlobUrl}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          width: "auto",
                          height: "auto",
                        }}
                        controls
                        autoPlay={false}
                        preload="metadata"
                      />
                    </div>
                  );
                }

                // Use Google Drive iframe for processed videos
                return (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#000",
                    }}
                  >
                    <iframe
                      src={(slide as any).src}
                      style={{
                        width: "90%",
                        height: "90%",
                        border: "none",
                        borderRadius: "8px",
                      }}
                      allow="autoplay; encrypted-media; fullscreen"
                      allowFullScreen
                      title={(slide as any).alt}
                    />
                  </div>
                );
              }
              return undefined;
            },
          }}
          video={{
            controls: true,
            playsInline: true,
          }}
          thumbnails={{
            position: "bottom",
            width: 120,
            height: 80,
            border: 2,
            borderRadius: 4,
            padding: 4,
            gap: 16,
          }}
          slideshow={{
            autoplay: false,
            delay: 3000,
          }}
          zoom={{
            maxZoomPixelRatio: 3,
            zoomInMultiplier: 2,
            doubleTapDelay: 300,
            doubleClickDelay: 300,
            doubleClickMaxStops: 2,
            keyboardMoveDistance: 50,
            wheelZoomDistanceFactor: 100,
            pinchZoomDistanceFactor: 100,
            scrollToZoom: true,
          }}
        />
      </CardBody>
    </Card>
  );
}
