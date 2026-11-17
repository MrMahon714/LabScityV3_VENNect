"use client";

import { useState } from "react";
import {
    Box,
    Button,
    Modal,
    Group,
    Stack,
    Text,
    TextInput,
    Card,
    Anchor,
    Center,
    Divider,
    Checkbox,
    ScrollArea,
    Badge,
    Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import ScholarInfo from "./ls-scholar-info";
import { useForm } from "@mantine/form";
import { IconBrandGoogle, IconCheck } from "@tabler/icons-react";

type Article = {
    title: string;
    publication?: string;
    authors?: string;
    link?: string;
    year?: string | number;
    already_added?: boolean;
};

type LSScholarLinkerProps = {
    userId: string;
};

export default function LSScholarLinker({ userId }: LSScholarLinkerProps) {
    const [opened, { open, close }] = useDisclosure(false);
    const [step, setStep] = useState<"input" | "review">("input");
    const [articles, setArticles] = useState<Article[]>([]);
    const [selectedTitles, setSelectedTitles] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const form = useForm({
        initialValues: { scholarId: "" },
        validate: {
            scholarId: (val: string) =>
                val.trim().length === 0 ? "Please enter a Google Scholar ID" : null,
        },
        validateInputOnBlur: true,
    });

    const handleFetchPreview = form.onSubmit(async (vals) => {
        setLoading(true);
        setApiError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch("/api/scholar/publications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "preview",
                    scholar_id: vals.scholarId.trim(),
                    user_id: userId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }

            const fetchedArticles: Article[] = data.articles || [];
            setArticles(fetchedArticles);

            const initialSelection: Record<string, boolean> = {};
            fetchedArticles.forEach((art) => {
                if (art.title) {
                    initialSelection[art.title] = !art.already_added;
                }
            });
            setSelectedTitles(initialSelection);

            setStep("review");
        } catch (err: any) {
            setApiError(err.message || "Something went wrong while fetching publications.");
        } finally {
            setLoading(false);
        }
    });

    const handleSaveSelected = async () => {
        setLoading(true);
        setApiError(null);

        const articlesToSave = articles.filter((art) => art.title && selectedTitles[art.title]);

        try {
            const response = await fetch("/api/scholar/publications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "save",
                    user_id: userId,
                    scholar_id: form.values.scholarId.trim(),
                    articles: articlesToSave,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Failed to save publications`);
            }

            setSuccessMessage(`Successfully added ${data.imported_count || articlesToSave.length} publications to your profile!`);

            setTimeout(() => {
                form.reset();
                setStep("input");
                setArticles([]);
                close();

                // Append tab=publications query parameter to maintain tab selection on reload
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "publications");
                window.location.href = url.toString();
            }, 1200);
        } catch (err: any) {
            setApiError(err.message || "Failed to save selected publications.");
            setLoading(false);
        }
    };

    const toggleSelectAll = (checked: boolean) => {
        const updated: Record<string, boolean> = {};
        articles.forEach((art) => {
            if (art.title) {
                updated[art.title] = checked && !art.already_added;
            }
        });
        setSelectedTitles(updated);
    };

    const handleCloseModal = () => {
        setStep("input");
        setArticles([]);
        setApiError(null);
        setSuccessMessage(null);
        form.reset();
        close();
    };

    return (
        <>
            <Modal.Root size="700" centered opened={opened} onClose={handleCloseModal}>
                <Modal.Overlay />
                <Modal.Content>
                    <Modal.Header
                        style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
                    >
                        <Group align="flex-start" justify="space-between" w="100%">
                            <Modal.Title>
                                <Group>
                                    <Box bg="var(--ls-icon-badge-bg)" c="var(--ls-icon-badge-color)" bdrs="md" p="8">
                                        <IconBrandGoogle />
                                    </Box>
                                    <Stack gap="0">
                                        <Text fw="700">Add Research via Google Scholar</Text>
                                        <Text fz="xs" c="dimmed">
                                            {step === "input"
                                                ? "Fetch your publications using your Google Scholar ID"
                                                : `Found ${articles.length} publications. Select items to add.`}
                                        </Text>
                                    </Stack>
                                </Group>
                            </Modal.Title>
                            <Modal.CloseButton size="40" />
                        </Group>
                    </Modal.Header>

                    <Modal.Body pb="md" pt="md">
                        {successMessage && (
                            <Alert icon={<IconCheck size="1rem" />} title="Success!" color="teal" mb="md">
                                {successMessage}
                            </Alert>
                        )}

                        {step === "input" ? (
                            <Stack gap="md">
                                <Card bg="var(--ls-navy-tint)" shadow="none" bd="none" bdrs={0}>
                                    <Group wrap="nowrap">
                                        <Text fz="sm" flex="1">
                                            Enter your Scholar ID to import publications via Google Scholar. You can review each publication before adding it your profile.
                                        </Text>
                                        <Anchor
                                            c="navy.6"
                                            underline="always"
                                            w="fit-content"
                                            href="https://scholar.google.com"
                                            size="sm"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Open Google Scholar
                                        </Anchor>
                                        <ScholarInfo size="2rem" />
                                    </Group>
                                </Card>

                                <form onSubmit={handleFetchPreview}>
                                    <Stack gap="xs">
                                        <Group align="flex-start">
                                            <TextInput
                                                flex="1"
                                                placeholder="ABC123XYZ456"
                                                disabled={loading}
                                                key={form.key("scholarId")}
                                                {...form.getInputProps("scholarId")}
                                            />
                                            <Button type="submit" loading={loading}>
                                                Find Publications
                                            </Button>
                                        </Group>
                                        {apiError && (
                                            <Text c="red" size="xs">
                                                {apiError}
                                            </Text>
                                        )}
                                    </Stack>
                                </form>

                                <Divider color="var(--mantine-color-default-border)" />

                                <Center py="xl">
                                    <Text size="sm" c="dimmed" ta="center">
                                        Once you enter your Google Scholar ID, your publications will
                                        appear here for review.
                                    </Text>
                                </Center>
                            </Stack>
                        ) : (
                            <Stack gap="md">
                                <Group justify="space-between" align="center">
                                    <Checkbox
                                        label="Select All new"
                                        checked={
                                            articles.filter((art) => !art.already_added).length > 0 &&
                                            articles
                                                .filter((art) => !art.already_added)
                                                .every((art) => art.title && selectedTitles[art.title])
                                        }
                                        onChange={(e) => toggleSelectAll(e.currentTarget.checked)}
                                    />
                                    <Text size="sm" c="dimmed">
                                        {Object.values(selectedTitles).filter(Boolean).length} selected
                                    </Text>
                                </Group>

                                <ScrollArea.Autosize mah="400px" type="scroll">
                                    <Stack gap="xs">
                                        {articles.map((art, index) => (
                                            <Card
                                                key={index}
                                                withBorder
                                                padding="sm"
                                                radius="sm"
                                                bg={art.already_added ? "var(--mantine-color-default-hover)" : undefined}
                                            >
                                                <Group align="flex-start" wrap="nowrap">
                                                    <Checkbox
                                                        mt={4}
                                                        disabled={art.already_added}
                                                        checked={art.title ? !!selectedTitles[art.title] : false}
                                                        onChange={(e) =>
                                                            art.title &&
                                                            setSelectedTitles({
                                                                ...selectedTitles,
                                                                [art.title]: e.currentTarget.checked,
                                                            })
                                                        }
                                                    />
                                                    <Stack gap="xs" flex="1">
                                                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                            <Text fw={600} size="sm" flex="1">
                                                                {art.title}
                                                            </Text>
                                                            {art.already_added && (
                                                                <Badge color="gray" variant="light" size="sm">
                                                                    Already Added
                                                                </Badge>
                                                            )}
                                                        </Group>
                                                        <Group gap="xs">
                                                            {art.year && (
                                                                <Text size="xs" c="dimmed">
                                                                    Year: {art.year}
                                                                </Text>
                                                            )}
                                                            {art.publication && (
                                                                <Text size="xs" c="dimmed" lineClamp={1}>
                                                                    Journal: {art.publication}
                                                                </Text>
                                                            )}
                                                        </Group>
                                                        {art.link && (
                                                            <Anchor href={art.link} target="_blank" size="xs">
                                                                View Publication
                                                            </Anchor>
                                                        )}
                                                    </Stack>
                                                </Group>
                                            </Card>
                                        ))}
                                    </Stack>
                                </ScrollArea.Autosize>

                                {apiError && (
                                    <Text c="red" size="xs">
                                        {apiError}
                                    </Text>
                                )}

                                <Group justify="space-between" mt="md">
                                    <Button variant="default" onClick={() => setStep("input")} disabled={loading}>
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handleSaveSelected}
                                        loading={loading}
                                        disabled={Object.values(selectedTitles).filter(Boolean).length === 0}
                                    >
                                        Add Selected Publications
                                    </Button>
                                </Group>
                            </Stack>
                        )}
                    </Modal.Body>
                </Modal.Content>
            </Modal.Root>

            <Button bg="gray.0" variant="outline" onClick={open}>
                Link with Google Scholar
            </Button>
        </>
    );
}
