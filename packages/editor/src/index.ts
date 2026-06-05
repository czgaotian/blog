import "./styles.css"

export { SimpleEditor } from "./components/tiptap-templates/simple/simple-editor"

export * from "./components/tiptap-ui-primitive/badge"
export * from "./components/tiptap-ui-primitive/button"
export * from "./components/tiptap-ui-primitive/button-group"
export * from "./components/tiptap-ui-primitive/card"
export * from "./components/tiptap-ui-primitive/dropdown-menu"
export * from "./components/tiptap-ui-primitive/input"
export * from "./components/tiptap-ui-primitive/popover"
export * from "./components/tiptap-ui-primitive/separator"
export * from "./components/tiptap-ui-primitive/spacer"
export * from "./components/tiptap-ui-primitive/toolbar"
export * from "./components/tiptap-ui-primitive/tooltip"

export {
  BlockquoteButton,
  BlockquoteShortcutBadge,
} from "./components/tiptap-ui/blockquote-button/blockquote-button"
export type { BlockquoteButtonProps } from "./components/tiptap-ui/blockquote-button/blockquote-button"
export {
  BLOCKQUOTE_SHORTCUT_KEY,
  canToggleBlockquote,
  shouldShowButton as shouldShowBlockquoteButton,
  toggleBlockquote,
  useBlockquote,
} from "./components/tiptap-ui/blockquote-button/use-blockquote"
export type { UseBlockquoteConfig } from "./components/tiptap-ui/blockquote-button/use-blockquote"

export {
  CodeBlockButton,
  CodeBlockShortcutBadge,
} from "./components/tiptap-ui/code-block-button/code-block-button"
export type { CodeBlockButtonProps } from "./components/tiptap-ui/code-block-button/code-block-button"
export {
  CODE_BLOCK_SHORTCUT_KEY,
  canToggle as canToggleCodeBlock,
  shouldShowButton as shouldShowCodeBlockButton,
  toggleCodeBlock,
  useCodeBlock,
} from "./components/tiptap-ui/code-block-button/use-code-block"
export type { UseCodeBlockConfig } from "./components/tiptap-ui/code-block-button/use-code-block"

export {
  ColorHighlightButton,
  ColorHighlightShortcutBadge,
} from "./components/tiptap-ui/color-highlight-button/color-highlight-button"
export type { ColorHighlightButtonProps } from "./components/tiptap-ui/color-highlight-button/color-highlight-button"
export {
  COLOR_HIGHLIGHT_SHORTCUT_KEY,
  HIGHLIGHT_COLORS,
  canColorHighlight,
  getHighlightColorValue,
  isColorHighlightActive,
  pickHighlightColorsByValue,
  removeHighlight,
  shouldShowButton as shouldShowColorHighlightButton,
  useColorHighlight,
} from "./components/tiptap-ui/color-highlight-button/use-color-highlight"
export type {
  HighlightColor,
  HighlightMode,
  UseColorHighlightConfig,
} from "./components/tiptap-ui/color-highlight-button/use-color-highlight"

export {
  ColorHighlightPopover,
  ColorHighlightPopoverButton,
  ColorHighlightPopoverContent,
} from "./components/tiptap-ui/color-highlight-popover/color-highlight-popover"
export type {
  ColorHighlightPopoverContentProps,
  ColorHighlightPopoverProps,
} from "./components/tiptap-ui/color-highlight-popover/color-highlight-popover"

export { HeadingButton, HeadingShortcutBadge } from "./components/tiptap-ui/heading-button/heading-button"
export type { HeadingButtonProps } from "./components/tiptap-ui/heading-button/heading-button"
export {
  HEADING_SHORTCUT_KEYS,
  canToggle as canToggleHeading,
  headingIcons,
  isHeadingActive,
  shouldShowButton as shouldShowHeadingButton,
  toggleHeading,
  useHeading,
} from "./components/tiptap-ui/heading-button/use-heading"
export type {
  Level as HeadingLevel,
  UseHeadingConfig,
} from "./components/tiptap-ui/heading-button/use-heading"

export { HeadingDropdownMenu } from "./components/tiptap-ui/heading-dropdown-menu/heading-dropdown-menu"
export type { HeadingDropdownMenuProps } from "./components/tiptap-ui/heading-dropdown-menu/heading-dropdown-menu"
export {
  getActiveHeadingLevel,
  useHeadingDropdownMenu,
} from "./components/tiptap-ui/heading-dropdown-menu/use-heading-dropdown-menu"
export type { UseHeadingDropdownMenuConfig } from "./components/tiptap-ui/heading-dropdown-menu/use-heading-dropdown-menu"

export {
  ImageUploadButton,
  ImageShortcutBadge,
} from "./components/tiptap-ui/image-upload-button/image-upload-button"
export type { ImageUploadButtonProps } from "./components/tiptap-ui/image-upload-button/image-upload-button"
export {
  IMAGE_UPLOAD_SHORTCUT_KEY,
  canInsertImage,
  insertImage,
  isImageActive,
  shouldShowButton as shouldShowImageUploadButton,
  useImageUpload,
} from "./components/tiptap-ui/image-upload-button/use-image-upload"
export type { UseImageUploadConfig } from "./components/tiptap-ui/image-upload-button/use-image-upload"

export {
  LinkButton,
  LinkContent,
  LinkPopover,
} from "./components/tiptap-ui/link-popover/link-popover"
export type {
  LinkMainProps,
  LinkPopoverProps,
} from "./components/tiptap-ui/link-popover/link-popover"
export {
  canSetLink,
  isLinkActive,
  shouldShowLinkButton,
  useLinkHandler,
  useLinkPopover,
  useLinkState,
} from "./components/tiptap-ui/link-popover/use-link-popover"
export type {
  LinkHandlerProps,
  UseLinkPopoverConfig,
} from "./components/tiptap-ui/link-popover/use-link-popover"

export {
  ListButton,
  ListShortcutBadge,
} from "./components/tiptap-ui/list-button/list-button"
export type { ListButtonProps } from "./components/tiptap-ui/list-button/list-button"
export {
  LIST_SHORTCUT_KEYS,
  canToggleList,
  isListActive,
  listIcons,
  listLabels,
  shouldShowButton as shouldShowListButton,
  toggleList,
  useList,
} from "./components/tiptap-ui/list-button/use-list"
export type {
  ListType,
  UseListConfig,
} from "./components/tiptap-ui/list-button/use-list"

export { ListDropdownMenu } from "./components/tiptap-ui/list-dropdown-menu/list-dropdown-menu"
export type { ListDropdownMenuProps } from "./components/tiptap-ui/list-dropdown-menu/list-dropdown-menu"
export {
  canToggleAnyList,
  getActiveListType,
  getFilteredListOptions,
  isAnyListActive,
  listOptions,
  shouldShowListDropdown,
  useListDropdownMenu,
} from "./components/tiptap-ui/list-dropdown-menu/use-list-dropdown-menu"
export type {
  ListOption,
  UseListDropdownMenuConfig,
} from "./components/tiptap-ui/list-dropdown-menu/use-list-dropdown-menu"

export { MarkButton, MarkShortcutBadge } from "./components/tiptap-ui/mark-button/mark-button"
export type { MarkButtonProps } from "./components/tiptap-ui/mark-button/mark-button"
export {
  MARK_SHORTCUT_KEYS,
  canToggleMark,
  getFormattedMarkName,
  isMarkActive,
  markIcons,
  shouldShowButton as shouldShowMarkButton,
  toggleMark,
  useMark,
} from "./components/tiptap-ui/mark-button/use-mark"
export type {
  Mark,
  UseMarkConfig,
} from "./components/tiptap-ui/mark-button/use-mark"

export {
  TextAlignButton,
  TextAlignShortcutBadge,
} from "./components/tiptap-ui/text-align-button/text-align-button"
export type { TextAlignButtonProps } from "./components/tiptap-ui/text-align-button/text-align-button"
export {
  TEXT_ALIGN_SHORTCUT_KEYS,
  canSetTextAlign,
  hasSetTextAlign,
  isTextAlignActive,
  setTextAlign,
  shouldShowButton as shouldShowTextAlignButton,
  textAlignIcons,
  textAlignLabels,
  useTextAlign,
} from "./components/tiptap-ui/text-align-button/use-text-align"
export type {
  TextAlign as TextAlignment,
  UseTextAlignConfig,
} from "./components/tiptap-ui/text-align-button/use-text-align"

export {
  HistoryShortcutBadge,
  UndoRedoButton,
} from "./components/tiptap-ui/undo-redo-button/undo-redo-button"
export type { UndoRedoButtonProps } from "./components/tiptap-ui/undo-redo-button/undo-redo-button"
export {
  UNDO_REDO_SHORTCUT_KEYS,
  canExecuteUndoRedoAction,
  executeUndoRedoAction,
  historyActionLabels,
  historyIcons,
  shouldShowButton as shouldShowUndoRedoButton,
  useUndoRedo,
} from "./components/tiptap-ui/undo-redo-button/use-undo-redo"
export type {
  UndoRedoAction,
  UseUndoRedoConfig,
} from "./components/tiptap-ui/undo-redo-button/use-undo-redo"

export { NodeBackground } from "./components/tiptap-extension/node-background-extension"
export type { NodeBackgroundOptions } from "./components/tiptap-extension/node-background-extension"
export { HorizontalRule } from "./components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
export {
  ImageUploadNode,
  type ImageUploadNodeOptions,
  type UploadFunction,
} from "./components/tiptap-node/image-upload-node/image-upload-node-extension"
export { ImageUploadNode as ImageUploadNodeView } from "./components/tiptap-node/image-upload-node/image-upload-node"
export type {
  FileItem,
  UploadOptions,
} from "./components/tiptap-node/image-upload-node/image-upload-node"

export * from "./hooks/use-composed-ref"
export * from "./hooks/use-cursor-visibility"
export * from "./hooks/use-element-rect"
export * from "./hooks/use-is-breakpoint"
export * from "./hooks/use-menu-navigation"
export * from "./hooks/use-scrolling"
export * from "./hooks/use-throttled-callback"
export * from "./hooks/use-tiptap-editor"
export * from "./hooks/use-unmount"
export * from "./hooks/use-window-size"

export * from "./lib/tiptap-utils"

export * from "./components/tiptap-icons/align-center-icon"
export * from "./components/tiptap-icons/align-justify-icon"
export * from "./components/tiptap-icons/align-left-icon"
export * from "./components/tiptap-icons/align-right-icon"
export * from "./components/tiptap-icons/arrow-left-icon"
export * from "./components/tiptap-icons/ban-icon"
export * from "./components/tiptap-icons/blockquote-icon"
export * from "./components/tiptap-icons/bold-icon"
export * from "./components/tiptap-icons/check-icon"
export * from "./components/tiptap-icons/chevron-down-icon"
export * from "./components/tiptap-icons/close-icon"
export * from "./components/tiptap-icons/code-block-icon"
export * from "./components/tiptap-icons/code2-icon"
export * from "./components/tiptap-icons/corner-down-left-icon"
export * from "./components/tiptap-icons/external-link-icon"
export * from "./components/tiptap-icons/heading-five-icon"
export * from "./components/tiptap-icons/heading-four-icon"
export * from "./components/tiptap-icons/heading-icon"
export * from "./components/tiptap-icons/heading-one-icon"
export * from "./components/tiptap-icons/heading-six-icon"
export * from "./components/tiptap-icons/heading-three-icon"
export * from "./components/tiptap-icons/heading-two-icon"
export * from "./components/tiptap-icons/highlighter-icon"
export * from "./components/tiptap-icons/image-plus-icon"
export * from "./components/tiptap-icons/italic-icon"
export * from "./components/tiptap-icons/link-icon"
export * from "./components/tiptap-icons/list-icon"
export * from "./components/tiptap-icons/list-ordered-icon"
export * from "./components/tiptap-icons/list-todo-icon"
export * from "./components/tiptap-icons/redo2-icon"
export * from "./components/tiptap-icons/strike-icon"
export * from "./components/tiptap-icons/subscript-icon"
export * from "./components/tiptap-icons/superscript-icon"
export * from "./components/tiptap-icons/trash-icon"
export * from "./components/tiptap-icons/underline-icon"
export * from "./components/tiptap-icons/undo2-icon"
