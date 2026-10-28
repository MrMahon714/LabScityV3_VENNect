"use client";

import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import {
  encodeStructuredPostContent,
  parsePostContent,
} from "@/lib/utils/post-content";
import {
  createPostEditorExtensions,
  stripSavedBlackText,
} from "./post-rich-text-content";

const MAX_POST_LENGTH = 5000;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface LSEditPostModalProps {
  opened: boolean;
  onClose: () => void;
  rawContent: string;
  isSaving: boolean;
  onSave: (content: string) => Promise<void> | void;
}

/*
 Modal for editing your own post
 Edits the title and body
 keeps the post type, tags and linked item as they were
 */
export function LSEditPostModal({
  opened,
  onClose,
  rawContent,
  isSaving,
  onSave,
}: LSEditPostModalProps) {
  const parsed = useMemo(() => parsePostContent(rawContent), [rawContent]);
  const initialHtml = useMemo(
    () =>
      parsed.bodyHtml
        ? stripSavedBlackText(parsed.bodyHtml)
        : parsed.bodyText
            .split("\n")
            .map((line) => `<p>${escapeHtml(line)}</p>`)
            .join(""),
    [parsed],
  );

  const [title, setTitle] = useState(parsed.title);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createPostEditorExtensions("Write your post..."),
    content: initialHtml,
    editorProps: { attributes: { style: "color: var(--ls-text-body);" } },
  });

  useEffect(() => {
    if (!opened || !editor) return;
    setTitle(parsed.title);
    setError(null);
    editor.commands.setContent(initialHtml);
  }, [opened, editor, parsed.title, initialHtml]);

  const handleSave = async () => {
    if (!editor) return;
    const nextTitle = title.trim();
    const bodyText = editor.getText().trim();

    if (!nextTitle || !bodyText) {
      setError("Add a title and some text before saving.");
      return;
    }

    const content = encodeStructuredPostContent({
      kind: parsed.kind,
      title: nextTitle,
      bodyHtml: editor.getHTML(),
      bodyText,
      tags: parsed.tags,
      isFeatured: parsed.isFeatured,
      linkedEntity: parsed.linkedEntity,
    });

    if (content.length > MAX_POST_LENGTH) {
      setError("This post is too long. Please shorten it.");
      return;
    }

    setError(null);
    await onSave(content);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit post" size="lg" centered>
      <Stack gap="md">
        <TextInput
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />

        <RichTextEditor
          editor={editor}
          styles={{
            root: { borderColor: "var(--ls-border)" },
            toolbar: { borderColor: "var(--ls-border)" },
            content: {
              minHeight: 160,
              backgroundColor: "var(--ls-surface)",
              color: "var(--ls-text-body)",
            },
          }}
        >
          <RichTextEditor.Toolbar>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>
          <RichTextEditor.Content />
        </RichTextEditor>

        {error ? (
          <Text size="sm" c="red">
            {error}
          </Text>
        ) : null}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isSaving} onClick={handleSave}>
            Save changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
