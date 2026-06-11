import { describe, expect, it } from "vitest";
import {
  chunkFiles,
  getImageFilesFromClipboardData,
} from "./paste-image-upload-extension";

function createFile(name: string, type: string) {
  return new File(["content"], name, { type });
}

function createClipboardData(files: File[]): DataTransfer {
  return {
    files,
    items: files.map((file) => ({
      kind: "file",
      type: file.type,
      getAsFile: () => file,
    })),
  } as unknown as DataTransfer;
}

describe("paste image upload helpers", () => {
  it("returns no files when the clipboard has no image files", () => {
    const textFile = createFile("notes.txt", "text/plain");

    expect(getImageFilesFromClipboardData(createClipboardData([textFile]))).toEqual(
      [],
    );
  });

  it("extracts image files from clipboard items", () => {
    const image = createFile("screenshot.png", "image/png");
    const textFile = createFile("notes.txt", "text/plain");

    expect(
      getImageFilesFromClipboardData(createClipboardData([image, textFile])),
    ).toEqual([image]);
  });

  it("chunks pasted images by upload node limit", () => {
    const files = [
      createFile("one.png", "image/png"),
      createFile("two.png", "image/png"),
      createFile("three.png", "image/png"),
      createFile("four.png", "image/png"),
    ];

    expect(chunkFiles(files, 3)).toEqual([files.slice(0, 3), files.slice(3)]);
  });
});

