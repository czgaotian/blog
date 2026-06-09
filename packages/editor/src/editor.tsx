"use client";

import { useEffect, useMemo, useRef } from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { BlogImage, emptyTiptapDocument } from "@worker-blog/editor/schema";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";

// --- Tiptap Node ---
import { ImageUploadNode } from "./components/tiptap-node/image-upload-node/image-upload-node-extension";
import { NodeBackground } from "./components/tiptap-extension/node-background-extension";
import { HorizontalRule } from "@worker-blog/editor/schema";
import "./components/tiptap-node/blockquote-node/blockquote-node.scss";
import "./components/tiptap-node/code-block-node/code-block-node.scss";
import "./components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "./components/tiptap-node/list-node/list-node.scss";
import "./components/tiptap-node/image-node/image-node.scss";
import "./components/tiptap-node/heading-node/heading-node.scss";
import "./components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Hooks ---
import { useIsBreakpoint } from "./hooks/use-is-breakpoint";
import { useWindowSize } from "./hooks/use-window-size";
import { useCursorVisibility } from "./hooks/use-cursor-visibility";

// --- Components ---
import { EditorToolbar } from "./components/editor-toolbar";

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "./lib/tiptap-utils";
import type { UploadFunction } from "./components/tiptap-node/image-upload-node/image-upload-node-extension";

// --- Styles ---
import "./editor.scss";

export interface EditorProps {
  value?: JSONContent;
  onChange?: (value: JSONContent) => void;
  uploadImage?: UploadFunction;
}

export function Editor({
  value = emptyTiptapDocument,
  onChange,
  uploadImage = handleImageUpload,
}: EditorProps) {
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const valueKey = useMemo(() => JSON.stringify(value), [value]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      editorProps: {
        attributes: {
          autocomplete: "off",
          autocorrect: "off",
          autocapitalize: "off",
          "aria-label": "Main content area, start typing to enter text.",
          class: "simple-editor",
        },
      },
      extensions: [
        StarterKit.configure({
          horizontalRule: false,
          link: {
            openOnClick: false,
            enableClickSelection: true,
          },
        }),
        HorizontalRule,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Highlight.configure({ multicolor: true }),
        BlogImage,
        Typography,
        Superscript,
        Subscript,
        Selection,
        NodeBackground,
        ImageUploadNode.configure({
          accept: "image/*",
          maxSize: MAX_FILE_SIZE,
          limit: 3,
          upload: uploadImage,
          onError: (error) => console.error("Upload failed:", error),
        }),
      ],
      content: value as JSONContent,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getJSON());
      },
    },
    [onChange, uploadImage],
  );

  useEffect(() => {
    if (!editor) return;
    if (JSON.stringify(editor.getJSON()) === valueKey) return;
    editor.commands.setContent(value as JSONContent, { emitUpdate: false });
  }, [editor, value, valueKey]);

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  return (
    <div className="simple-editor-wrapper" id="tiptap-simple-editor">
      <EditorContext.Provider value={{ editor }}>
        <EditorToolbar
          ref={toolbarRef}
          isMobile={isMobile}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        />

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  );
}
