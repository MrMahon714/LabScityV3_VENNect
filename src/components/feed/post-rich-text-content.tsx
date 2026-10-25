"use client";

import { Box } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo } from "react";

export function createPostEditorExtensions(placeholder?: string) {
  return [
    StarterKit,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TextStyleKit,
    Placeholder.configure({ placeholder }),
  ];
}

const SAVED_BLACK_COLOR =
  /(?<![-\w])color:\s*(?:#000000|#000|black|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\))\s*;?/gi;

/*older posts saved their text as pure black
this is unreadable in dark mode
this drops that color so the text follows the theme
 */
export function stripSavedBlackText(html: string) {
  return html.replace(SAVED_BLACK_COLOR, "");
}

export function PostRichTextContent({
  html,
  maxHeight,
}: {
  html: string;
  maxHeight?: number;
}) {
  const cleanHtml = useMemo(() => stripSavedBlackText(html), [html]);
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: createPostEditorExtensions(),
    content: cleanHtml,
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

    editor.commands.setContent(cleanHtml);
  }, [editor, cleanHtml]);

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
