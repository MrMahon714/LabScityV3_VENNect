"use client";

import { Box, Flex } from "@mantine/core";
import LSAppTopBar from "./app-topbar";

const LSAppLayout = ({
  userId,
  isModerator,
  children,
}: {
  userId: string;
  isModerator: boolean;
  children: React.ReactNode;
}) => {
  return (
    <Flex direction="column" w="100%" bg="var(--ls-app-bg)">
      <LSAppTopBar userId={userId} isModerator={isModerator} />
      <Box maw="100%" style={{ overflowX: "clip" }}>
        {children}
      </Box>
    </Flex>
  );
};

export default LSAppLayout;
