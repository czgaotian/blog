import { mergeAttributes, Node, type Extensions } from "@tiptap/core";
import TiptapHorizontalRule from "@tiptap/extension-horizontal-rule";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import StarterKit from "@tiptap/starter-kit";
import ImageNode from "../components/tiptap-node/image-node/image-node-extension";
import { lowlight } from "../lib/code-highlighting";

export const HorizontalRule = TiptapHorizontalRule.extend({
  renderHTML() {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, { "data-type": this.name }),
      ["hr"],
    ];
  },
});

export const ServerImageUploadNode = Node.create({
  name: "imageUpload",
  group: "block",
  draggable: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      accept: { default: "image/*" },
      limit: { default: 1 },
      maxSize: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-upload"]' }];
  },

  renderHTML() {
    return ["div", { "data-type": "image-upload", hidden: "hidden" }];
  },
});

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
    ServerImageUploadNode,
  ];
}
