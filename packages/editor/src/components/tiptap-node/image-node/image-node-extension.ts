import { Image } from "@tiptap/extension-image";

export const ImageNode = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-media-id"),
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("width");
          return value ? Number(value) : null;
        },
        renderHTML: (attributes) =>
          attributes.width ? { width: attributes.width } : {},
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("height");
          return value ? Number(value) : null;
        },
        renderHTML: (attributes) =>
          attributes.height ? { height: attributes.height } : {},
      },
    };
  },
});

export default ImageNode;
