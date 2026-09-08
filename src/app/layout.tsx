import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/dates/styles.css";

import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import "@mantine/carousel/styles.css";
import { Analytics } from "@vercel/analytics/next";
import { QueryProvider } from "@/components/providers/query-provider";
import { cssVariablesResolver, theme } from "@/lib/constants/theme";

const inter = Inter({ subsets: ["latin"] }); // due to bundler ordering, globals.css doesnt import font; this does
export const metadata: Metadata = {
  title: "LabScity",
  description: "Social Media for Scientists",
  icons: {
    icon: "/logo-sm.png",
  },
};

/**
 * Root layout: HTML shell, MantineProvider with app theme and light color scheme, and global metadata.
 * @param props - Layout props
 * @param props.children - Page content
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <MantineProvider
              theme={theme}
              cssVariablesResolver={cssVariablesResolver}
              defaultColorScheme="light"
            >
              <ReactQueryDevtools initialIsOpen={false} position="right" />
              <Notifications />
              {children}
              <Analytics />
            </MantineProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
