export function getQuillCDN(_version?: string): string {
  return `
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
  `
}

export function getQuillInitScript(): string {
  return `
    window.initializeQuillEditors = function() {
      if (typeof Quill === 'undefined') return;
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', window.initializeQuillEditors);
    } else {
      window.initializeQuillEditors();
    }
  `
}
