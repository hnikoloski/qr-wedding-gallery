"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  Icon,
  Image,
  SimpleGrid,
  Text,
  VStack,
  Input,
  FormControl,
  FormLabel,
  InputGroup,
  InputLeftElement,
  Progress,
  Badge,
  CircularProgress,
  CircularProgressLabel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  HStack,
  Divider,
  List,
  ListIcon,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/toast";
import {
  Upload,
  X,
  User,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Camera,
  Smartphone,
  Heart,
  Share,
} from "lucide-react";
import { usePhotoStore } from "@/store/photoStore";
import {
  uploadToGoogleCloudStorage,
  uploadToGoogleCloudStorageSmart,
  generateVideoThumbnail,
} from "@/utils/uploadHelpers";
import { validateFiles, formatFileSize } from "@/utils/fileValidation";

interface FileProgress {
  name: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface UploadPreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  fileProgress?: FileProgress[];
  isUploading: boolean;
}

const UploadPreview = ({
  files,
  onRemove,
  fileProgress = [],
  isUploading,
}: UploadPreviewProps) => {
  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
      {files.map((file, index) => {
        const progress = fileProgress[index];
        const isVideo = file.type.startsWith("video/");

        return (
          <Box
            key={index}
            position="relative"
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
            p={3}
          >
            <Flex align="center" gap={3}>
              {isVideo ? (
                <Box
                  borderRadius="md"
                  overflow="hidden"
                  h="60px"
                  w="60px"
                  flexShrink={0}
                  bg="gray.100"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <video
                    src={URL.createObjectURL(file)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    muted
                    preload="metadata"
                  />
                </Box>
              ) : (
                <Image
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index}`}
                  borderRadius="md"
                  objectFit="cover"
                  h="60px"
                  w="60px"
                  flexShrink={0}
                />
              )}
              <Box flex="1" minW="0">
                <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                  {file.name}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {formatFileSize(file.size)} • {isVideo ? "Video" : "Image"}
                </Text>

                {isUploading && progress && (
                  <Box mt={2}>
                    <Flex justify="space-between" align="center" mb={1}>
                      <Badge
                        size="sm"
                        colorScheme={
                          progress.status === "success"
                            ? "green"
                            : progress.status === "error"
                            ? "red"
                            : progress.status === "uploading"
                            ? "blue"
                            : "gray"
                        }
                      >
                        {progress.status === "success" && (
                          <Icon as={Check} boxSize={3} mr={1} />
                        )}
                        {progress.status === "error" && (
                          <Icon as={AlertCircle} boxSize={3} mr={1} />
                        )}
                        {progress.status.toUpperCase()}
                      </Badge>
                      <Text fontSize="xs" color="gray.600">
                        {progress.progress}%
                      </Text>
                    </Flex>
                    <Progress
                      value={progress.progress}
                      size="sm"
                      colorScheme={
                        progress.status === "success"
                          ? "green"
                          : progress.status === "error"
                          ? "red"
                          : "blue"
                      }
                      borderRadius="md"
                    />
                    {progress.error && (
                      <Text fontSize="xs" color="red.500" mt={1}>
                        {progress.error}
                      </Text>
                    )}
                  </Box>
                )}
              </Box>

              {!isUploading && (
                <Button
                  size="xs"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => onRemove(index)}
                >
                  <Icon as={X} boxSize={4} />
                </Button>
              )}
            </Flex>
          </Box>
        );
      })}
    </SimpleGrid>
  );
};

// Step-by-step guide component
const UploadGuide = () => {
  return (
    <Card
      variant="outline"
      borderRadius="xl"
      boxShadow="0 2px 10px 0 rgba(0, 0, 0, 0.05)"
      bg="gradient-to-br from-pink-50 to-purple-50"
      borderColor="pink.200"
    >
      <CardBody p={{ base: 4, md: 6 }}>
        <VStack spacing={{ base: 4, md: 3 }} align="stretch">
          {/* Compact Header */}
          <HStack spacing={3} justify="center" mb={3}>
            <Heading
              size={{ base: "lg", md: "lg" }}
              color="gray.700"
              textAlign="center"
            >
              Како да ги споделите вашите фотографии
            </Heading>
          </HStack>

          {/* Compact Steps - Mobile (Vertical Stack) */}
          <Box display={{ base: "block", md: "none" }} mb={1}>
            <VStack spacing={3} align="stretch">
              {[
                {
                  icon: Smartphone,
                  title: "1. Фотографирајте",
                  subtitle: "Направете фотографии",
                  color: "blue.500",
                },
                {
                  icon: Camera,
                  title: "2. Изберете ",
                  subtitle: "Притиснете копчето",
                  color: "green.500",
                },
                {
                  icon: Share,
                  title: "3. Споделете",
                  subtitle: "Прикачете ги",
                  color: "pink.500",
                },
              ].map((step, index) => (
                <HStack
                  key={index}
                  spacing={4}
                  align="center"
                  bg="white"
                  p={3}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="gray.100"
                  boxShadow="0 1px 3px rgba(0,0,0,0.05)"
                >
                  <Box
                    p={2}
                    borderRadius="full"
                    bg={`${step.color.split(".")[0]}.100`}
                    border="2px solid"
                    borderColor={step.color}
                    w="40px"
                    h="40px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Icon as={step.icon} boxSize={4} color={step.color} />
                  </Box>
                  <VStack spacing={0} align="start" flex="1">
                    <Text fontSize="sm" fontWeight="bold" color="gray.700">
                      {step.title}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {step.subtitle}
                    </Text>
                  </VStack>
                </HStack>
              ))}
            </VStack>
          </Box>

          {/* Compact Steps - Desktop (Horizontal) */}
          <Box display={{ base: "none", md: "block" }}>
            <HStack spacing={8} justify="center">
              {[
                {
                  icon: Smartphone,
                  title: "1. Фотографирајте",
                  subtitle: "Направете фотографии",
                  color: "blue.500",
                },
                {
                  icon: Camera,
                  title: "2. Изберете фајлови",
                  subtitle: "Притиснете копчето",
                  color: "green.500",
                },
                {
                  icon: Share,
                  title: "3. Споделете",
                  subtitle: "Прикачете ги",
                  color: "pink.500",
                },
              ].map((step, index) => (
                <VStack key={index} spacing={2} textAlign="center" flex="1">
                  <Box
                    p={3}
                    borderRadius="full"
                    bg={`${step.color.split(".")[0]}.100`}
                    border="2px solid"
                    borderColor={step.color}
                    w="48px"
                    h="48px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={step.icon} boxSize={5} color={step.color} />
                  </Box>
                  <VStack spacing={0}>
                    <Text fontSize="xs" fontWeight="bold" color="gray.700">
                      {step.title}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {step.subtitle}
                    </Text>
                  </VStack>
                </VStack>
              ))}
            </HStack>
          </Box>

          {/* Compact Tips */}
          <Box
            bg="white"
            borderRadius="lg"
            p={3}
            border="1px solid"
            borderColor="pink.200"
            display={{ base: "none", md: "block" }}
          >
            <HStack spacing={6} justify="center" wrap="wrap">
              <HStack spacing={2}>
                <Icon as={Check} color="green.500" boxSize={3} />
                <Text fontSize="xs" color="gray.600">
                  До 25 фајлови
                </Text>
              </HStack>
              <HStack spacing={2}>
                <Icon as={Check} color="green.500" boxSize={3} />
                <Text fontSize="xs" color="gray.600">
                  Фотографии и видеа
                </Text>
              </HStack>
              <HStack spacing={2}>
                <Icon as={Check} color="green.500" boxSize={3} />
                <Text fontSize="xs" color="gray.600">
                  Добра светлина
                </Text>
              </HStack>
              <HStack spacing={2}>
                <Icon as={Check} color="green.500" boxSize={3} />
                <Text fontSize="xs" color="gray.600">
                  Спонтани моменти
                </Text>
              </HStack>
            </HStack>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
};

interface PhotoUploaderProps {
  onUploadComplete?: () => void; // Callback to refresh gallery after successful upload
}

export default function PhotoUploader({
  onUploadComplete,
}: PhotoUploaderProps = {}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedBy, setUploadedBy] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const toast = useToast();
  const { addPhotos } = usePhotoStore();

  const MAX_FILES = 25; // Maximum number of files allowed

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Filter for only image and video files
      const mediaFiles = acceptedFiles.filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/")
      );

      // Validate the files
      const validation = validateFiles(mediaFiles);
      if (!validation.isValid) {
        toast({
          title: "Неважен фајл",
          description: validation.error,
          status: "error",
          duration: 8000,
          isClosable: true,
        });
        return;
      }

      // Show all files in preview, let user decide which to remove
      setSelectedFiles((prev) => [...prev, ...mediaFiles]);

      // Show warning if total exceeds limit, but don't auto-truncate
      const totalFiles = selectedFiles.length + mediaFiles.length;
      if (totalFiles > MAX_FILES) {
        toast({
          title: "Премногу фајлови избрани!",
          description: `Имате вкупно ${totalFiles} фајлови, но можете да прикачите само ${MAX_FILES} наеднаш. Отстранете ${
            totalFiles - MAX_FILES
          } фајлови пред прикачување.`,
          status: "warning",
          duration: 10000,
          isClosable: true,
          position: "top",
        });
      }

      // Show file sizes for large files
      const largeFiles = mediaFiles.filter(
        (file) => file.size > 100 * 1024 * 1024
      ); // 100MB+
      if (largeFiles.length > 0) {
        toast({
          title: "Големи фајлови",
          description: `${largeFiles.length} фајлови се поголеми од 100MB. Прикачувањето може да потрае подолго.`,
          status: "info",
          duration: 5000,
          isClosable: true,
        });
      }
    },
    [selectedFiles.length, toast, MAX_FILES]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "video/*": [],
    },
    disabled: isUploading,
    noClick: true, // Disable click on dropzone - we'll handle it with buttons
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileProgress = (
    index: number,
    progress: Partial<FileProgress>
  ) => {
    setFileProgress((prev) => {
      const newProgress = [...prev];
      newProgress[index] = { ...newProgress[index], ...progress };
      return newProgress;
    });
  };

  const calculateOverallProgress = (fileProgressArray: FileProgress[]) => {
    if (fileProgressArray.length === 0) return 0;
    const totalProgress = fileProgressArray.reduce(
      (sum, file) => sum + file.progress,
      0
    );
    return Math.round(totalProgress / fileProgressArray.length);
  };

  const handleFileSelection = (acceptVideo = true) => {
    if (isUploading) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = acceptVideo ? "image/*,video/*" : "image/*";
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const mediaFiles = Array.from(files).filter(
          (file) =>
            file.type.startsWith("image/") ||
            (acceptVideo && file.type.startsWith("video/"))
        );

        // Validate the files
        const validation = validateFiles(mediaFiles);
        if (!validation.isValid) {
          toast({
            title: "Неважен фајл",
            description: validation.error,
            status: "error",
            duration: 8000,
            isClosable: true,
          });
          return;
        }

        // Show all files in preview, let user decide which to remove
        setSelectedFiles((prev) => [...prev, ...mediaFiles]);

        // Show warning if total exceeds limit, but don't auto-truncate
        const totalFiles = selectedFiles.length + mediaFiles.length;
        if (totalFiles > MAX_FILES) {
          toast({
            title: "Премногу фајлови избрани!",
            description: `Имате вкупно ${totalFiles} фајлови, но можете да прикачите само ${MAX_FILES} наеднаш. Отстранете ${
              totalFiles - MAX_FILES
            } фајлови пред прикачување.`,
            status: "warning",
            duration: 10000,
            isClosable: true,
            position: "top",
          });
        }

        // Show file sizes for large files
        const largeFiles = mediaFiles.filter(
          (file) => file.size > 100 * 1024 * 1024
        ); // 100MB+
        if (largeFiles.length > 0) {
          toast({
            title: "Големи фајлови",
            description: `${largeFiles.length} фајлови се поголеми од 100MB. Прикачувањето може да потрае подолго.`,
            status: "info",
            duration: 5000,
            isClosable: true,
          });
        }
      }
    };
    input.click();
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Нема избрани фајлови",
        description: "Ве молиме изберете фајлови за прикачување",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    if (selectedFiles.length > MAX_FILES) {
      toast({
        title: "Премногу фајлови",
        description: `Можете да прикачите максимум ${MAX_FILES} фајлови наеднаш`,
        status: "error",
        duration: 5000,
      });
      return;
    }

    const uploaderName = uploadedBy.trim() || "Anonymous Guest";

    try {
      setIsUploading(true);

      // Initialize progress tracking
      const initialProgress: FileProgress[] = selectedFiles.map((file) => ({
        name: file.name,
        progress: 0,
        status: "pending",
      }));
      setFileProgress(initialProgress);
      setProgress(0);

      const uploadPromises = selectedFiles.map(async (file, index) => {
        try {
          // Update status to uploading
          updateFileProgress(index, { status: "uploading", progress: 10 });

          // Upload using smart method (chooses direct or standard based on file size)
          const result = await uploadToGoogleCloudStorageSmart(
            file,
            uploaderName,
            (progress) => {
              // Update progress from upload
              updateFileProgress(index, {
                progress: Math.round(10 + progress * 0.6),
              });
            }
          );

          if (!result.success || !result.photo) {
            throw new Error(result.error || `Failed to upload ${file.name}`);
          }

          let photoObject = result.photo;

          // Generate thumbnail for videos
          if (file.type.startsWith("video/") && photoObject.needsThumbnail) {
            try {
              updateFileProgress(index, { progress: 85 });
              const thumbnail = await generateVideoThumbnail(file);
              photoObject = {
                ...photoObject,
                thumbnailUrl: thumbnail,
                needsThumbnail: false,
              };
              if (process.env.NODE_ENV === "development") {
                console.log("Generated thumbnail for video:", file.name);
              }
            } catch (thumbnailError) {
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  "Failed to generate thumbnail for video:",
                  file.name,
                  thumbnailError
                );
              }
              // Use a placeholder or default thumbnail
              photoObject = {
                ...photoObject,
                thumbnailUrl: `data:image/svg+xml;base64,${btoa(`
                  <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="120" height="80" fill="#2D3748" rx="8"/>
                    <circle cx="60" cy="40" r="16" fill="#4A5568"/>
                    <polygon points="55,32 55,48 70,40" fill="#E2E8F0"/>
                    <text x="60" y="65" font-family="Arial, sans-serif" font-size="8" fill="#A0ADB8" text-anchor="middle">VIDEO</text>
                  </svg>
                `)}`,
                needsThumbnail: false,
              };
            }
            updateFileProgress(index, { progress: 95 });
          } else {
            updateFileProgress(index, { progress: 90 });
          }

          // Complete
          updateFileProgress(index, { progress: 100, status: "success" });

          return photoObject;
        } catch (error) {
          updateFileProgress(index, {
            progress: 0,
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
          });
          throw error;
        }
      });

      // Update overall progress as files complete
      const results = [];
      for (let i = 0; i < uploadPromises.length; i++) {
        try {
          const result = await uploadPromises[i];
          results.push(result);
        } catch (error) {
          console.error(`Failed to upload file ${i}:`, error);
        }

        // Update overall progress
        const currentProgress = Math.round(
          ((i + 1) / uploadPromises.length) * 100
        );
        setProgress(currentProgress);
      }

      // Filter out failed uploads
      const successfulPhotos = results.filter((photo) => photo);

      if (successfulPhotos.length > 0) {
        // Store the photo objects in our local store
        addPhotos(successfulPhotos);

        toast({
          title: "Успешно прикачување",
          description: `${successfulPhotos.length} од ${selectedFiles.length} фајлови се успешно прикачени`,
          status:
            successfulPhotos.length === selectedFiles.length
              ? "success"
              : "warning",
          duration: 5000,
        });

        // Clear successful uploads after a delay
        setTimeout(() => {
          setSelectedFiles([]);
          setFileProgress([]);
          setProgress(0);
        }, 2000);

        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        throw new Error("Сите прикачувања не успеаја");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Грешка при прикачување",
        description: "Има грешка при прикачување на вашите фајлови",
        status: "error",
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const hasErrors = fileProgress.some((fp) => fp.status === "error");
  const allComplete =
    fileProgress.length > 0 &&
    fileProgress.every((fp) => fp.status === "success");

  return (
    <VStack spacing={6} align="stretch">
      {/* Step-by-step guide */}
      <UploadGuide />

      {/* Main upload card */}
      <Card
        variant="outline"
        borderRadius="xl"
        boxShadow="0 4px 15px 0 rgba(0, 0, 0, 0.1)"
      >
        <CardBody>
          <VStack spacing={6} align="stretch">
            {/* Name Input */}
            <FormControl>
              <FormLabel fontSize="md" fontWeight="semibold" color="gray.700">
                Вашето име (опционално)
              </FormLabel>
              <InputGroup>
                <InputLeftElement>
                  <Icon as={User} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Внесете го вашето име"
                  value={uploadedBy}
                  onChange={(e) => setUploadedBy(e.target.value)}
                  isDisabled={isUploading}
                  size="lg"
                  borderRadius="xl"
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.5)",
                  }}
                />
              </InputGroup>
            </FormControl>

            {/* Mobile-First Upload Buttons */}
            <VStack spacing={4} align="stretch">
              {/* Primary Upload Button */}
              <Button
                size="lg"
                minH="100px"
                maxW="100%"
                w="100%"
                borderRadius="xl"
                bgGradient="linear(to-r, blue.400, blue.600, purple.500)"
                color="white"
                fontWeight="bold"
                fontSize={{ base: "md", md: "md" }}
                boxShadow="0 4px 15px 0 rgba(59, 130, 246, 0.35)"
                onClick={() => handleFileSelection(true)}
                isDisabled={isUploading}
                transition="all 0.3s ease"
                position="relative"
                overflow="hidden"
                whiteSpace="normal"
                textAlign="center"
                p={4}
                _hover={{
                  bgGradient: isUploading
                    ? "linear(to-r, blue.400, blue.600, purple.500)"
                    : "linear(to-r, blue.500, blue.700, purple.600)",
                  transform: isUploading ? "none" : "translateY(-2px)",
                  boxShadow: isUploading
                    ? "0 4px 15px 0 rgba(59, 130, 246, 0.35)"
                    : "0 8px 25px 0 rgba(59, 130, 246, 0.45)",
                  _before: {
                    left: "100%",
                  },
                }}
                _active={{
                  transform: isUploading ? "none" : "translateY(0px)",
                }}
                _before={{
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: "-100%",
                  width: "100%",
                  height: "100%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                  transition: "left 0.6s",
                }}
              >
                <VStack spacing={2} w="100%">
                  <Icon as={Upload} boxSize={6} />
                  <Text textAlign="center" lineHeight="1.3" px={2}>
                    {isUploading
                      ? "Се прикачува..."
                      : isDragActive
                      ? "Ставете ги вашите свадбени фотографии и видеа тука"
                      : selectedFiles.length > 0
                      ? `Додадете уште фотографии`
                      : "Додадете фотографии и видеа"}
                  </Text>
                </VStack>
              </Button>

              {/* Desktop Drag & Drop Area - Secondary on mobile */}
              <Box
                {...getRootProps()}
                display={{ base: "none", md: "block" }}
                p={6}
                borderWidth="2px"
                borderRadius="xl"
                borderStyle="dashed"
                borderColor={
                  selectedFiles.length > MAX_FILES
                    ? "red.300"
                    : isDragActive
                    ? "blue.400"
                    : "gray.300"
                }
                bg={
                  selectedFiles.length > MAX_FILES
                    ? "red.50"
                    : isDragActive
                    ? "blue.50"
                    : "gray.50"
                }
                cursor={isUploading ? "not-allowed" : "pointer"}
                transition="all 0.3s ease"
                textAlign="center"
                opacity={isUploading ? 0.6 : 1}
                _hover={{
                  borderColor: isUploading
                    ? "gray.300"
                    : selectedFiles.length > MAX_FILES
                    ? "red.400"
                    : "blue.300",
                  bg: isUploading
                    ? "gray.50"
                    : selectedFiles.length > MAX_FILES
                    ? "red.100"
                    : "blue.25",
                  transform: isUploading ? "none" : "scale(1.01)",
                }}
                minH="100px"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                gap={3}
              >
                <input {...getInputProps()} disabled={isUploading} />
                <Icon
                  as={Upload}
                  boxSize={8}
                  color={
                    selectedFiles.length > MAX_FILES
                      ? "red.400"
                      : isDragActive
                      ? "blue.500"
                      : "gray.400"
                  }
                  transition="all 0.3s ease"
                />
                <VStack spacing={1}>
                  <Text
                    fontSize="md"
                    fontWeight="semibold"
                    color={
                      selectedFiles.length > MAX_FILES
                        ? "red.600"
                        : isUploading
                        ? "gray.500"
                        : isDragActive
                        ? "blue.600"
                        : "gray.600"
                    }
                  >
                    Влечете и ставете фајлови тука
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    или користете го копчето погоре
                  </Text>
                </VStack>
              </Box>
            </VStack>

            {/* File counter - show when files are selected */}
            {selectedFiles.length > 0 && (
              <Box
                bg={selectedFiles.length > MAX_FILES ? "red.50" : "blue.50"}
                borderRadius="xl"
                p={4}
                border="1px solid"
                borderColor={
                  selectedFiles.length > MAX_FILES ? "red.200" : "blue.200"
                }
              >
                <Text
                  fontSize="sm"
                  color={
                    selectedFiles.length > MAX_FILES ? "red.600" : "blue.600"
                  }
                  textAlign="center"
                  fontWeight="semibold"
                >
                  Избрани се {selectedFiles.length} фајлови
                  {selectedFiles.length > MAX_FILES && (
                    <Text
                      as="span"
                      color="red.600"
                      fontWeight="bold"
                      display="block"
                      mt={1}
                    >
                      ⚠️ Отстранете {selectedFiles.length - MAX_FILES} фајлови
                      за да можете да прикачите!
                    </Text>
                  )}
                </Text>
              </Box>
            )}

            {/* Upload Action Button */}
            {selectedFiles.length > 0 && (
              <Button
                size="lg"
                minH="80px"
                maxW="100%"
                w="100%"
                borderRadius="xl"
                bgGradient={
                  selectedFiles.length > MAX_FILES
                    ? "linear(to-r, red.300, red.400)"
                    : isUploading
                    ? "linear(to-r, gray.300, gray.400)"
                    : "linear(to-r, green.400, green.600, teal.500)"
                }
                color="white"
                fontWeight="bold"
                fontSize="md"
                boxShadow={
                  isUploading || selectedFiles.length > MAX_FILES
                    ? "none"
                    : "0 4px 15px 0 rgba(34, 197, 94, 0.35)"
                }
                whiteSpace="normal"
                textAlign="center"
                p={4}
                _hover={{
                  bgGradient:
                    selectedFiles.length > MAX_FILES
                      ? "linear(to-r, red.300, red.400)"
                      : isUploading
                      ? "linear(to-r, gray.300, gray.400)"
                      : "linear(to-r, green.500, green.700, teal.600)",
                  transform:
                    isUploading || selectedFiles.length > MAX_FILES
                      ? "none"
                      : "translateY(-2px)",
                  boxShadow:
                    isUploading || selectedFiles.length > MAX_FILES
                      ? "none"
                      : "0 8px 25px 0 rgba(34, 197, 94, 0.45)",
                }}
                _active={{
                  transform:
                    isUploading || selectedFiles.length > MAX_FILES
                      ? "none"
                      : "translateY(0px)",
                }}
                isDisabled={isUploading || selectedFiles.length > MAX_FILES}
                onClick={handleUpload}
                isLoading={isUploading}
                loadingText={`Се прикачува ${progress}%...`}
                spinnerPlacement="start"
                transition="all 0.3s ease"
                position="relative"
                overflow="hidden"
              >
                <VStack spacing={2} w="100%">
                  <Icon as={Upload} boxSize={5} />
                  <Text
                    textAlign="center"
                    lineHeight="1.3"
                    px={2}
                    fontSize="md"
                    fontWeight="semibold"
                  >
                    {selectedFiles.length > MAX_FILES
                      ? `Премногу фајлови (${selectedFiles.length}/${MAX_FILES})`
                      : isUploading
                      ? `Се прикачува ${progress}%...`
                      : `Кликни тука за да прикачиш ${selectedFiles.length} ${
                          selectedFiles.length === 1 ? "фајл" : "фајлови"
                        }`}
                  </Text>
                </VStack>
              </Button>
            )}

            {/* File Preview */}
            {selectedFiles.length > 0 && (
              <UploadPreview
                files={selectedFiles}
                onRemove={removeFile}
                fileProgress={fileProgress}
                isUploading={isUploading}
              />
            )}

            {/* Overall Progress */}
            {isUploading && (
              <Box>
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    Вкупен напредок
                  </Text>
                  <CircularProgress
                    value={progress}
                    size="40px"
                    color="blue.400"
                  >
                    <CircularProgressLabel fontSize="xs">
                      {progress}%
                    </CircularProgressLabel>
                  </CircularProgress>
                </Flex>
                <Progress
                  value={progress}
                  colorScheme="blue"
                  borderRadius="md"
                />
              </Box>
            )}

            {/* Success/Error Messages */}
            {allComplete && (
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <AlertTitle fontSize="sm">Успешно прикачени!</AlertTitle>
                <AlertDescription fontSize="sm">
                  Сите фајлови се успешно прикачени во галеријата.
                </AlertDescription>
              </Alert>
            )}

            {hasErrors && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <AlertTitle fontSize="sm">
                  Некои прикачувања не успеаја
                </AlertTitle>
                <AlertDescription fontSize="sm">
                  Проверете го статусот на секој фајл погоре. Можете да ги
                  повторите неуспешните прикачувања.
                </AlertDescription>
              </Alert>
            )}

            {/* File Limit Information */}
            <Box
              bg="gray.50"
              borderRadius="xl"
              p={4}
              border="1px solid"
              borderColor="gray.200"
            >
              <Text fontSize="xs" color="gray.600" textAlign="center">
                💡 Максимум {MAX_FILES} фајлови по прикачување
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
}
