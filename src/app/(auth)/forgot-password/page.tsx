//Page for users to send forgot password email 

"use client";

import { useState } from "react";
import Link from "next/link";
import { LSAuthLogo } from "@/components/auth/ls-auth-logo";
import { Paper, Stack, Box, Text, TextInput, Anchor, Button, Alert } from "@mantine/core";
import { useIsMobile } from "@/app/use-is-mobile";
import { forgotPasswordAction } from "@/lib/actions/auth";

const inputStyles = {
  height: "2rem",
  width: "100%",
  borderRadius: "0.5rem",
  backgroundColor: "var(--ls-auth-input-bg)",
  fontFamily: "var(--mantine-font-family)",
  color: "var(--ls-text-strong)",
};

export default function ForgotPasswordPage() {
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setShowMessage(false);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      const result = await forgotPasswordAction(formData);

      if (!result.success && result.error) {
        setErrorMessage(result.error);
        return;
      }

      setShowMessage(true);
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper
      maw={isMobile ? "90%" : "30%"}
      bg="var(--ls-auth-card-bg)"
      p="2rem"
      style={{
        borderRadius: "0.625rem",
        border: "1px solid var(--ls-auth-card-border)",
      }}
    >
      <form onSubmit={onSubmit}>
        <Stack gap="md" align="center">
          <Box
            h={100}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <LSAuthLogo
              width={200}
              height={200}
              priority
              style={{ width: "auto", height: "auto", objectFit: "contain" }}
            />
          </Box>

          <Text fz="lg" fw={600} c="var(--ls-text-strong)">Enter your email to reset your password:</Text>

          {errorMessage && (
            <Alert color="red" title="Unable to Send Email" w="100%">
              {errorMessage}
            </Alert>
          )}

          {showMessage && (
            <Alert color="green" title="Email Sent">
              A reset link has been sent to {email || "this email"}.
            </Alert>
          )}

          <Box
            w="100%"
            maw="18.5rem"
            style={{ display: "flex", flexDirection: "column", gap: "0.1rem", alignItems: "flex-start" }}
          >
            <Text fz="md" fw={600} c="var(--ls-text-strong)" lh={1.5}>Email</Text>
            <TextInput
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              styles={{ input: inputStyles, root: { width: "100%" } }}
            />
          </Box>

          <Button
            type="submit"
            loading={isSubmitting}
            fw={600}
            fz="md"
            style={{
              width: "10.46875rem",
              height: "2.5625rem",
              borderRadius: "0.46875rem",
              fontFamily: "var(--mantine-font-family)",
              "--button-hover": "var(--ls-accent)",
            }}
          >
            Send Reset Link
          </Button>

          <Text fz="sm">
            Back to{" "}
            <Anchor fz="sm" c="navy.6" component={Link} href="/login">
              Sign In
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Paper>
  );
}
