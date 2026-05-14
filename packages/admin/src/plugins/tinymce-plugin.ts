// TODO(plugin-remove): keep this legacy editor adapter until the content editor
// direction is settled, then migrate or remove it with the editor stack.
export function getTinyMCEScript(apiKey: string = 'no-api-key'): string {
  return `<script src="https://cdn.tiny.cloud/1/${apiKey}/tinymce/6/tinymce.min.js" referrerpolicy="origin"></script>`
}

export function getTinyMCEInitScript(config?: {
  skin?: string
  defaultHeight?: number
  defaultToolbar?: string
}): string {
  const skin = config?.skin || 'oxide-dark'
  const contentCss = skin.includes('dark') ? 'dark' : 'default'
  const defaultHeight = config?.defaultHeight || 300

  return `
    function initializeTinyMCE() {
      if (typeof tinymce === 'undefined') return;
      document.querySelectorAll('.richtext-container[data-editor-provider="tinymce"] textarea').forEach((textarea) => {
        if (tinymce.get(textarea.id)) return;
        const container = textarea.closest('.richtext-container');
        const height = container?.dataset.height || ${defaultHeight};
        const toolbar = container?.dataset.toolbar || 'full';
        tinymce.init({
          selector: '#' + textarea.id,
          skin: '${skin}',
          content_css: '${contentCss}',
          height: parseInt(height),
          menubar: false,
          toolbar: toolbar === 'simple'
            ? 'bold italic underline | bullist numlist | link'
            : toolbar === 'minimal'
              ? 'bold italic | link'
              : 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help'
        });
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeTinyMCE);
    } else {
      initializeTinyMCE();
    }
  `
}
