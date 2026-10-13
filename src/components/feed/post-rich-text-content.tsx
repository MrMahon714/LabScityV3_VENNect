"use client";

import { Box } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

export function createPostEditorExtensions(placeholder?: string) {
  return [
    StarterKit,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TextStyleKit,
    Placeholder.configure({ placeholder }),
  ];
}

export function PostRichTextContent({
  html,
  maxHeight,
}: {
  html: string;
  maxHeight?: number;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: createPostEditorExtensions(),
    content: html,
    editorProps: {
      attributes: {
        style: "color: var(--ls-text-body);",
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.commands.setContent(html);
  }, [editor, html]);

  if (!editor) {
    return null;
  }

  return (
    <Box
      style={{
        maxHeight,
        overflow: maxHeight ? "hidden" : undefined,
      }}
    >
      <RichTextEditor
        editor={editor}
        styles={{
          root: {
            border: "none",
          },
          content: {
            border: "none",
            padding: 0,
            color: "var(--ls-text-body)",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            "& .ProseMirror": {
              overflowWrap: "anywhere",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            },
            "& .ProseMirror *": {
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            },
          },
        }}
      >
        <RichTextEditor.Content />
      </RichTextEditor>
    </Box>
  );
}
