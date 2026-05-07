export function getMDXEditorScripts(): string {
  return `
    <link rel="stylesheet" href="https://unpkg.com/easymde/dist/easymde.min.css">
    <script src="https://unpkg.com/easymde/dist/easymde.min.js"></script>
  `
}

export function getMDXEditorInitScript(_config?: {
  defaultHeight?: number
  toolbar?: string
  placeholder?: string
}): string {
  return `
    function initializeEasyMDEEditors() {
      if (typeof EasyMDE === 'undefined') return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeEasyMDEEditors);
    } else {
      initializeEasyMDEEditors();
    }
  `
}
