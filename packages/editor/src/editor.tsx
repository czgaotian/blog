"use client";

import { useEffect, useMemo, useRef } from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
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
import { createEditorExtensions } from "./lib/extensions";
import { handleImageUpload, emptyTiptapDocument } from "./lib/tiptap-utils";
import type { UploadFunction } from "./components/tiptap-node/image-upload-node/image-upload-node-extension";

// --- Styles ---
import "./styles/_keyframe-animations.scss";
import "./styles/_variables.scss";
import "./styles/editor.scss";
import "./styles/hight-light.scss";

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
      extensions: createEditorExtensions({ uploadImage }),
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
