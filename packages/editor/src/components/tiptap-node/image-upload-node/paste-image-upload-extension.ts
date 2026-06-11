import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { registerPendingImageUpload } from "./pending-image-uploads";

export interface PasteImageUploadOptions {
  accept: string;
  limit: number;
  maxSize: number;
}

export function getImageFilesFromClipboardData(
  clipboardData: DataTransfer | null,
): File[] {
  if (!clipboardData) return [];

  const itemFiles = Array.from(clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  if (itemFiles.length > 0) return itemFiles;

  return Array.from(clipboardData.files).filter((file) =>
    file.type.startsWith("image/"),
  );
}

export function chunkFiles(files: File[], limit: number): File[][] {
  const chunkSize = Math.max(1, limit);
  const chunks: File[][] = [];

  for (let index = 0; index < files.length; index += chunkSize) {
    chunks.push(files.slice(index, index + chunkSize));
  }

  return chunks;
}

export const PasteImageUpload = Extension.create<PasteImageUploadOptions>({
  name: "pasteImageUpload",

  addOptions() {
    return {
      accept: "image/*",
      limit: 3,
      maxSize: 0,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const files = getImageFilesFromClipboardData(event.clipboardData);
            if (files.length === 0) return false;

            const uploadNodes = chunkFiles(files, this.options.limit).map(
              (chunk) => ({
                type: "imageUpload",
                attrs: {
                  accept: this.options.accept,
                  limit: this.options.limit,
                  maxSize: this.options.maxSize,
                  uploadId: registerPendingImageUpload(chunk),
                },
              }),
            );

            if (!this.editor.can().insertContent(uploadNodes)) {
              return false;
            }

            event.preventDefault();
            return this.editor.chain().insertContent(uploadNodes).run();
          },
        },
      }),
    ];
  },
});

