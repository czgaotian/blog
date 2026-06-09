import { type Extensions } from "@tiptap/core";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { ImageNode } from "../components/tiptap-node/image-node/image-node-extension";
import { HorizontalRule } from "../components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { ImageUploadNode } from "../components/tiptap-node/image-upload-node/image-upload-node-extension";
import type { UploadFunction } from "../components/tiptap-node/image-upload-node/image-upload-node-extension";
import { NodeBackground } from "../components/tiptap-extension/node-background-extension";
import { all, createLowlight } from "lowlight";
import { MAX_FILE_SIZE } from "./tiptap-utils";

export const lowlight = createLowlight(all);

export interface CreateEditorExtensionsOptions {
  uploadImage: UploadFunction;
}

export function createContentRenderExtensions(): Extensions {
  return [
    StarterKit.configure({
      horizontalRule: false,
      codeBlock: false,
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
    ImageNode,
    Typography,
    Superscript,
    Subscript,
    CodeBlockLowlight.configure({
      lowlight,
    }),
    ImageUploadNode,
  ];
}

export function createEditorExtensions({
  uploadImage,
}: CreateEditorExtensionsOptions): Extensions {
  return [
    StarterKit.configure({
      horizontalRule: false,
      link: {
        openOnClick: false,
        enableClickSelection: true,
      },
      codeBlock: false,
    }),
    HorizontalRule,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }),
    ImageNode,
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
    CodeBlockLowlight.configure({
      lowlight,
    }),
  ];
}
