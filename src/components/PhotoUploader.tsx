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
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  useSteps,
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
  ChevronRight,
  ChevronLeft,
  FileImage,
  Play,
} from "lucide-react";
import { usePhotoStore } from "@/store/photoStore";
import {
  uploadToGoogleCloudStorage,
  generateVideoThumbnail,
} from "@/utils/uploadHelpers";

interface FileProgress {
  name: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface PhotoUploaderProps {
  onUploadComplete?: () => void; // Callback to refresh gallery after successful upload
}

const steps = [
  { title: "Вашето име", description: "Кажете ни кој сте" },
  { title: "Изберете фајлови", description: "Додајте фотографии и видеа" },
  { title: "Прегледајте", description: "Проверете ги избраните фајлови" },
  { title: "Прикачување", description: "Се прикачуваат фајловите" },
  { title: "Завршено", description: "Успешно прикачено!" },
];

const MAX_FILES = 25;

export default function PhotoUploader({
  onUploadComplete,
}: PhotoUploaderProps = {}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const toast = useToast();
  const { addPhotos } = usePhotoStore();

  const { activeStep, setActiveStep } = useSteps({
    index: 0,
    count: steps.length,
  });

  const nextStep = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const resetStepper = () => {
    setActiveStep(0);
    setSelectedFiles([]);
    setUserName("");
    setFileProgress([]);
    setOverallProgress(0);
    setUploadComplete(false);
    setIsUploading(false);
  };

  // File handling functions
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const mediaFiles = acceptedFiles.filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/")
      );

      setSelectedFiles((prev) => [...prev, ...mediaFiles]);

      const totalFiles = selectedFiles.length + mediaFiles.length;
      if (totalFiles > MAX_FILES) {
        toast({
          title: "Премногу фајлови избрани!",
          description: `Имате вкупно ${totalFiles} фајлови, но можете да прикачите само ${MAX_FILES} наеднаш.`,
          status: "warning",
          duration: 8000,
          isClosable: true,
        });
      }
    },
    [selectedFiles.length, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "video/*": [],
    },
    disabled: isUploading,
    noClick: true,
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

  const handleFileSelection = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*";
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const mediaFiles = Array.from(files).filter(
          (file) =>
            file.type.startsWith("image/") || file.type.startsWith("video/")
        );
        setSelectedFiles((prev) => [...prev, ...mediaFiles]);
      }
    };
    input.click();
  };

  const handleUpload = async () => {
    const uploaderName = userName.trim() || "Anonymous Guest";

    try {
      setIsUploading(true);
      nextStep(); // Move to upload progress step

      const initialProgress: FileProgress[] = selectedFiles.map((file) => ({
        name: file.name,
        progress: 0,
        status: "pending",
      }));
      setFileProgress(initialProgress);
      setOverallProgress(0);

      const uploadPromises = selectedFiles.map(async (file, index) => {
        try {
          updateFileProgress(index, { status: "uploading", progress: 10 });

          const formData = new FormData();
          formData.append("file", file);
          formData.append("userName", uploaderName);

          updateFileProgress(index, { progress: 30 });

          const result = await uploadToGoogleCloudStorage(file, uploaderName);

          updateFileProgress(index, { progress: 70 });

          if (!result.success || !result.photo) {
            throw new Error(result.error || `Failed to upload ${file.name}`);
          }

          let photoObject = result.photo;

          if (file.type.startsWith("video/") && photoObject.needsThumbnail) {
            try {
              updateFileProgress(index, { progress: 85 });
              const thumbnail = await generateVideoThumbnail(file);
              photoObject = {
                ...photoObject,
                thumbnailUrl: thumbnail,
                needsThumbnail: false,
              };
            } catch (thumbnailError) {
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
          }

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

      const results = [];
      for (let i = 0; i < uploadPromises.length; i++) {
        try {
          const result = await uploadPromises[i];
          results.push(result);
        } catch (error) {
          console.error(`Failed to upload file ${i}:`, error);
        }

        const currentProgress = Math.round(
          ((i + 1) / uploadPromises.length) * 100
        );
        setOverallProgress(currentProgress);
      }

      const successfulPhotos = results.filter((photo) => photo);

      if (successfulPhotos.length > 0) {
        addPhotos(successfulPhotos);
        setUploadComplete(true);
        nextStep(); // Move to success step

        toast({
          title: "Успешно прикачување!",
          description: `${successfulPhotos.length} од ${selectedFiles.length} фајлови се прикачени`,
          status:
            successfulPhotos.length === selectedFiles.length
              ? "success"
              : "warning",
          duration: 5000,
          isClosable: true,
        });

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
        description: "Се случи грешка при прикачување на фајловите",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Validation functions
  const canProceedFromStep = (step: number) => {
    switch (step) {
      case 0: // Name step
        return userName.trim().length > 0;
      case 1: // File selection step
        return selectedFiles.length > 0 && selectedFiles.length <= MAX_FILES;
      case 2: // Review step
        return true;
      default:
        return true;
    }
  };

  // Step content renderers
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <VStack spacing={6} align="stretch" py={8}>
            <Box textAlign="center">
              <Icon as={User} boxSize={16} color="blue.500" mb={4} />
              <Heading size="lg" mb={2} color="gray.700">
                Кажете ни кој сте
              </Heading>
              <Text color="gray.600">
                Внесете го вашето име за да знаеме кој ги споделил фотографиите
              </Text>
            </Box>

            <FormControl>
              <FormLabel fontWeight="semibold" color="gray.700">
                Вашето име
              </FormLabel>
              <InputGroup size="lg">
                <InputLeftElement>
                  <Icon as={User} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Внесете го вашето име..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  borderRadius="xl"
                  bg="gray.50"
                  border="2px solid"
                  borderColor="gray.200"
                  _focus={{
                    borderColor: "blue.400",
                    bg: "white",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                />
              </InputGroup>
              <Text fontSize="sm" color="gray.500" mt={2}>
                Ова име ќе се прикаже покraj вашите фотографии
              </Text>
            </FormControl>
          </VStack>
        );

      case 1:
        return (
          <VStack spacing={6} align="stretch" py={8}>
            <Box textAlign="center">
              <Icon as={FileImage} boxSize={16} color="green.500" mb={4} />
              <Heading size="lg" mb={2} color="gray.700">
                Изберете фотографии и видеа
              </Heading>
              <Text color="gray.600">
                Можете да додадете до {MAX_FILES} фајлови наеднаш
              </Text>
            </Box>

            <Box
              {...getRootProps()}
              border="3px dashed"
              borderColor={isDragActive ? "blue.400" : "gray.300"}
              borderRadius="xl"
              p={8}
              textAlign="center"
              bg={isDragActive ? "blue.50" : "gray.50"}
              cursor="pointer"
              transition="all 0.3s"
              _hover={{ borderColor: "blue.400", bg: "blue.50" }}
            >
              <input {...getInputProps()} />
              <VStack spacing={4}>
                <Icon
                  as={Upload}
                  boxSize={12}
                  color={isDragActive ? "blue.500" : "gray.400"}
                />
                <Box>
                  <Text fontSize="lg" fontWeight="bold" color="gray.700">
                    {isDragActive
                      ? "Пуштете ги фајловите тука"
                      : "Влечете фајлови тука"}
                  </Text>
                  <Text color="gray.500" mt={1}>
                    или кликнете на копчето подоле
                  </Text>
                </Box>
              </VStack>
            </Box>

            <Button
              size="lg"
              colorScheme="blue"
              leftIcon={<Icon as={Camera} />}
              onClick={handleFileSelection}
              borderRadius="xl"
            >
              Изберете фајлови
            </Button>

            {selectedFiles.length > 0 && (
              <Box>
                <Flex justify="space-between" align="center" mb={4}>
                  <Text fontWeight="bold" color="gray.700">
                    Избрани фајлови ({selectedFiles.length})
                  </Text>
                  {selectedFiles.length > MAX_FILES && (
                    <Badge colorScheme="red">Премногу фајлови!</Badge>
                  )}
                </Flex>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  {selectedFiles.map((file, index) => {
                    const isVideo = file.type.startsWith("video/");
                    return (
                      <Box
                        key={index}
                        p={3}
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="lg"
                        bg="white"
                      >
                        <Flex align="center" gap={3}>
                          {isVideo ? (
                            <Box
                              w="50px"
                              h="50px"
                              bg="gray.100"
                              borderRadius="md"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Icon as={Play} color="gray.500" />
                            </Box>
                          ) : (
                            <Image
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              borderRadius="md"
                              objectFit="cover"
                              w="50px"
                              h="50px"
                            />
                          )}
                          <Box flex={1} minW={0}>
                            <Text
                              fontSize="sm"
                              fontWeight="medium"
                              noOfLines={1}
                            >
                              {file.name}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </Text>
                          </Box>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => removeFile(index)}
                          >
                            <Icon as={X} />
                          </Button>
                        </Flex>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </Box>
            )}
          </VStack>
        );

      case 2:
        return (
          <VStack spacing={6} align="stretch" py={8}>
            <Box textAlign="center">
              <Icon as={Check} boxSize={16} color="purple.500" mb={4} />
              <Heading size="lg" mb={2} color="gray.700">
                Прегледајте пред прикачување
              </Heading>
              <Text color="gray.600">
                Проверете ги деталите пред да започнете со прикачување
              </Text>
            </Box>

            <VStack spacing={4} align="stretch">
              <Box
                p={4}
                bg="blue.50"
                borderRadius="lg"
                border="1px solid"
                borderColor="blue.200"
              >
                <Text fontWeight="bold" color="blue.800" mb={1}>
                  Ваше име:
                </Text>
                <Text color="blue.700">{userName || "Anonymous Guest"}</Text>
              </Box>

              <Box
                p={4}
                bg="green.50"
                borderRadius="lg"
                border="1px solid"
                borderColor="green.200"
              >
                <Text fontWeight="bold" color="green.800" mb={2}>
                  Избрани фајлови: {selectedFiles.length}
                </Text>
                <VStack spacing={2} align="stretch">
                  {selectedFiles.slice(0, 3).map((file, index) => (
                    <Text key={index} fontSize="sm" color="green.700">
                      • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </Text>
                  ))}
                  {selectedFiles.length > 3 && (
                    <Text fontSize="sm" color="green.600" fontStyle="italic">
                      ...и уште {selectedFiles.length - 3} фајлови
                    </Text>
                  )}
                </VStack>
              </Box>

              {selectedFiles.length > MAX_FILES && (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Премногу фајлови!</AlertTitle>
                    <AlertDescription>
                      Можете да прикачите максимум {MAX_FILES} фајлови.
                      Отстранете {selectedFiles.length - MAX_FILES} фајлови.
                    </AlertDescription>
                  </Box>
                </Alert>
              )}
            </VStack>
          </VStack>
        );

      case 3:
        return (
          <VStack spacing={6} align="stretch" py={8}>
            <Box textAlign="center">
              <CircularProgress
                value={overallProgress}
                size="120px"
                color="blue.400"
                trackColor="gray.200"
                thickness="8px"
                mb={4}
              >
                <CircularProgressLabel
                  fontSize="lg"
                  fontWeight="bold"
                  color="blue.600"
                >
                  {overallProgress}%
                </CircularProgressLabel>
              </CircularProgress>
              <Heading size="lg" mb={2} color="gray.700">
                Се прикачуваат фајловите...
              </Heading>
              <Text color="gray.600">
                Ве молиме почекајте додека се прикачуваат вашите фотографии и
                видеа
              </Text>
            </Box>

            {fileProgress.length > 0 && (
              <VStack spacing={3} align="stretch">
                {fileProgress.map((progress, index) => (
                  <Box key={index} p={3} bg="gray.50" borderRadius="lg">
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {progress.name}
                      </Text>
                      <Badge
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
                        {progress.status === "success" && "✓"}
                        {progress.status === "error" && "✗"}
                        {progress.status === "uploading" && "⏳"}
                        {progress.status === "pending" && "⏸"}
                      </Badge>
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
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>
        );

      case 4:
        return (
          <VStack spacing={6} align="stretch" py={8}>
            <Box textAlign="center">
              <Box
                w="120px"
                h="120px"
                bg="green.100"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mx="auto"
                mb={4}
              >
                <Icon as={Check} boxSize={16} color="green.500" />
              </Box>
              <Heading size="lg" mb={2} color="gray.700">
                Успешно прикачување!
              </Heading>
              <Text color="gray.600" mb={4}>
                Вашите фотографии и видеа се успешно прикачени во галеријата
              </Text>

              <VStack spacing={2}>
                <Text fontSize="lg" fontWeight="bold" color="green.600">
                  {fileProgress.filter((f) => f.status === "success").length}{" "}
                  успешни
                </Text>
                {fileProgress.some((f) => f.status === "error") && (
                  <Text fontSize="sm" color="red.500">
                    {fileProgress.filter((f) => f.status === "error").length}{" "}
                    неуспешни
                  </Text>
                )}
              </VStack>
            </Box>

            <Button
              size="lg"
              colorScheme="blue"
              onClick={resetStepper}
              borderRadius="xl"
            >
              Прикачи повеќе фајлови
            </Button>
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <Card
      variant="outline"
      borderRadius="xl"
      boxShadow="0 4px 15px 0 rgba(0, 0, 0, 0.1)"
      maxW="4xl"
      mx="auto"
    >
      <CardBody p={{ base: 6, md: 8 }}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <Heading
              as="h2"
              size={{ base: "xl", md: "lg" }}
              bgGradient="linear(to-r, blue.600, purple.600)"
              bgClip="text"
              fontWeight="bold"
              mb={2}
            >
              Прикачете ги вашите фотографии и видеа
            </Heading>
            <Text fontSize="md" color="gray.600" fontWeight="medium">
              Споделете ги прекрасните моменти од свадбата
            </Text>
          </Box>

          {/* Stepper */}
          <Box>
            <Stepper index={activeStep} orientation="horizontal" size="lg">
              {steps.map((step, index) => (
                <Step key={index}>
                  <StepIndicator>
                    <StepStatus
                      complete={<StepIcon />}
                      incomplete={<StepNumber />}
                      active={<StepNumber />}
                    />
                  </StepIndicator>

                  <Box flexShrink="0" display={{ base: "none", md: "block" }}>
                    <StepTitle>{step.title}</StepTitle>
                    <StepDescription>{step.description}</StepDescription>
                  </Box>

                  <StepSeparator />
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Step Content */}
          <Box minH="400px">{renderStepContent()}</Box>

          {/* Navigation */}
          {activeStep < 4 && (
            <Flex justify="space-between" align="center">
              <Button
                variant="ghost"
                leftIcon={<Icon as={ChevronLeft} />}
                onClick={prevStep}
                isDisabled={activeStep === 0}
                size="lg"
              >
                Назад
              </Button>

              <Text fontSize="sm" color="gray.500">
                Чекор {activeStep + 1} од {steps.length}
              </Text>

              {activeStep === 2 ? (
                <Button
                  colorScheme="green"
                  rightIcon={<Icon as={Upload} />}
                  onClick={handleUpload}
                  isDisabled={!canProceedFromStep(activeStep) || isUploading}
                  isLoading={isUploading}
                  loadingText="Се прикачува..."
                  size="lg"
                >
                  Прикачи фајлови
                </Button>
              ) : (
                <Button
                  colorScheme="blue"
                  rightIcon={<Icon as={ChevronRight} />}
                  onClick={nextStep}
                  isDisabled={!canProceedFromStep(activeStep)}
                  size="lg"
                >
                  Продолжи
                </Button>
              )}
            </Flex>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
