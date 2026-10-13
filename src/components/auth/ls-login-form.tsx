"use client";

import { Paper, Stack, Box, Text, TextInput, PasswordInput, Anchor, Button, Alert } from "@mantine/core";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import { useIsMobile } from "@/app/use-is-mobile";
import { createClient } from "@/supabase/client";

const inputStyles = {
  height: "2rem",
  width: "100%",
  borderRadius: "0.5rem",
  backgroundColor: "var(--mantine-color-gray-0)",
  fontFamily: "var(--mantine-font-family)",
  color: "var(--ls-text-strong)",
};

export function LSLoginForm({
  showBannedMessage = false,
}: {
  showBannedMessage?: boolean;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [signInSuccess, setSignInSuccess] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur", // Validate on blur (loses focus) for better UX
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginValues) => {
    setServerError(null); // Clear previous errors

    try {
      const supabase = createClient();
      const { data: login, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if(error) {
        setSignInSuccess(false);
        setServerError(error.message);
        return;
      }

      if(login.user) {
        const { data: user } = await supabase
          .from("users")
          .select("is_banned")
          .eq("user_id", login.user.id)
          .maybeSingle();

          if(user?.is_banned) {
            await supabase.auth.signOut();
            setSignInSuccess(false);
            setServerError("This account has been banned");
            return;
          }
      }

      setSignInSuccess(true);
      router.refresh();
      router.push("/home");
    } catch {
      setServerError("An unexpected error occurred. Please try again.")
    }
  };

  // check if we are on mobile to change some layout stuff around
  const isMobile = useIsMobile()
  return (
    <Paper
      miw={400}
      maw={isMobile ? "90%" : "30%"} // limit box size on larger screen 
      bg="var(--ls-navy-tint-0)"
      p="2rem"
      style={{ borderRadius: "0.625rem" }}
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap="md" align="center">
          <Box
            h={100}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Image
              src="/logo.png"
              alt="LabScity Logo"
              width={320}
              height={108}
              priority
              style={{ width: "auto", height: "auto", objectFit: "contain" }}
            />
          </Box>
          {showBannedMessage && (
            <Alert color="orange" title="Account Banned">
              This account has been banned. If you think this is a mistake, contact support.
            </Alert>
          )}
          {serverError && (
            <Alert color="red" title="Error">
              {serverError}
            </Alert>
          )}
          <Box
            w="100%"
            maw="18.5rem"
            style={{ display: "flex", flexDirection: "column", gap: "0.1rem", alignItems: "flex-start" }}
          >
            <Text fz="md" fw={600} c="var(--ls-text-strong)" lh={1.5}>Email</Text>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextInput
                  {...field}
                  styles={{ input: inputStyles, root: { width: "100%" } }}
                  error={fieldState.error?.message}
                />
              )}
            />
          </Box>
          <Box
            w="100%"
            maw="18.5rem"
            style={{ display: "flex", flexDirection: "column", gap: "0.1rem", alignItems: "flex-start" }}
          >
            <Text fz="md" fw={600} c="var(--ls-text-strong)" lh={1.5}>Password</Text>
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <PasswordInput
                  {...field}
                  styles={{ input: inputStyles, root: { width: "100%" } }}
                  error={fieldState.error?.message}
                />
              )}
            />
          </Box>
          <Anchor fz="sm" c="navy.6" component={Link} href="/forgot-password">
            Forgot Password?
          </Anchor>
          <Button
            type="submit"
            loading={form.formState.isSubmitting || signInSuccess}
            bg="navy.7"
            c="navy.0"
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
            Sign In
          </Button>
          <Text fz="sm">
            Don't have an account?{" "}
            <Anchor fz="sm" c="navy.6" component={Link} href="/signup">
              Sign Up
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Paper>
  );
}

