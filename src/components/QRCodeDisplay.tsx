"use client";

import React from "react";
import { Box, Center } from "@chakra-ui/react";
import { useQRCode } from "next-qrcode";

export default function QRCodeDisplay() {
  const { Canvas } = useQRCode();
  // This URL should be your actual website URL when deployed
  const qrCodeUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <Center>
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={4}
        bg="white"
        boxShadow="sm"
      >
        <Canvas
          text={qrCodeUrl}
          options={{
            errorCorrectionLevel: "M",
            margin: 3,
            scale: 4,
            width: 200,
          }}
        />
      </Box>
    </Center>
  );
}
