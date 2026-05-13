import { useCallback, useEffect, type ReactNode } from 'react'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Undo2,
  Unlink,
} from 'lucide-react'

export type TiptapEditorToolbarMode = 'minimal' | 'standard' | 'full'

export interface TiptapEditorProps {
  value?: string
  defaultValue?: string
  placeholder?: string
  disabled?: boolean
  toolbar?: TiptapEditorToolbarMode
  className?: string
  editorClassName?: string
  ariaLabel?: string
  onChange?: (html: string) => void
  onBlur?: (html: string) => void
}

const toolbarGroupsByMode: Record<TiptapEditorToolbarMode, string[]> = {
  minimal: ['marks', 'link'],
  standard: ['history', 'blocks', 'marks', 'lists', 'link'],
  full: ['history', 'blocks', 'marks', 'lists', 'align', 'link', 'clear'],
}

export function TiptapEditor({
  value,
  defaultValue = '',
  placeholder = 'Write something...',
  disabled = false,
  toolbar = 'standard',
  className,
  editorClassName,
  ariaLabel = 'Rich text editor',
  onChange,
  onBlur,
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    content: value ?? defaultValue,
    extensions: [
      StarterKit,
      Link.configure({
        autolink: true,
        defaultProtocol: 'https',
        openOnClick: false,
        protocols: ['http', 'https', 'mailto'],
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    editorProps: {
      attributes: {
        'aria-label': ariaLabel,
        class: ['wb-editor__content', editorClassName].filter(Boolean).join(' '),
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    onBlur: ({ editor }) => {
      onBlur?.(editor.getHTML())
    },
  })

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (value === undefined || !editor) return
    if (value === editor.getHTML()) return

    editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  return (
    <div
      className={[
        'wb-editor',
        disabled ? 'wb-editor--disabled' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      <EditorToolbar editor={editor} mode={toolbar} disabled={disabled} />
      <EditorContent editor={editor} />
    </div>
  )
}

function EditorToolbar({
  editor,
  mode,
  disabled,
}: {
  editor: Editor | null
  mode: TiptapEditorToolbarMode
  disabled: boolean
}) {
  const groups = toolbarGroupsByMode[mode]

  if (!editor) {
    return <div className="wb-editor__toolbar" aria-hidden="true" />
  }

  return (
    <div className="wb-editor__toolbar" role="toolbar" aria-label="Text formatting">
      {groups.includes('history') && (
        <ToolbarGroup>
          <ToolbarButton
            label="Undo"
            disabled={disabled || !editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            disabled={disabled || !editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={16} />
          </ToolbarButton>
        </ToolbarGroup>
      )}

      {groups.includes('blocks') && (
        <ToolbarGroup>
          <ToolbarButton
            label="Paragraph"
            active={editor.isActive('paragraph')}
            disabled={disabled}
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            P
          </ToolbarButton>
          <ToolbarButton
            label="Heading"
            active={editor.isActive('heading', { level: 2 })}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            active={editor.isActive('blockquote')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={16} />
          </ToolbarButton>
        </ToolbarGroup>
      )}

      {groups.includes('marks') && (
        <ToolbarGroup>
          <ToolbarButton
            label="Bold"
            active={editor.isActive('bold')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive('italic')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Strikethrough"
            active={editor.isActive('strike')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough size={16} />
          </ToolbarButton>
        </ToolbarGroup>
      )}

      {groups.includes('lists') && (
        <ToolbarGroup>
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive('bulletList')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Ordered list"
            active={editor.isActive('orderedList')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={16} />
          </ToolbarButton>
        </ToolbarGroup>
      )}

      {groups.includes('align') && (
        <ToolbarGroup>
          <ToolbarButton
            label="Align left"
            active={editor.isActive({ textAlign: 'left' })}
            disabled={disabled}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Align center"
            active={editor.isActive({ textAlign: 'center' })}
            disabled={disabled}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Align right"
            active={editor.isActive({ textAlign: 'right' })}
            disabled={disabled}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight size={16} />
          </ToolbarButton>
        </ToolbarGroup>
      )}

      {groups.includes('link') && (
        <ToolbarGroup>
          <LinkButton editor={editor} disabled={disabled} />
          <ToolbarButton
            label="Remove link"
            disabled={disabled || !editor.isActive('link')}
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            <Unlink size={16} />
          </ToolbarButton>
        </ToolbarGroup>
      )}

      {groups.includes('clear') && (
        <ToolbarGroup>
          <ToolbarButton
            label="Clear formatting"
            disabled={disabled}
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          >
            <RemoveFormatting size={16} />
          </ToolbarButton>
        </ToolbarGroup>
      )}
    </div>
  )
}

function LinkButton({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previousUrl ?? '')

    if (url === null) return
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }, [editor])

  return (
    <ToolbarButton
      label="Set link"
      active={editor.isActive('link')}
      disabled={disabled}
      onClick={setLink}
    >
      <LinkIcon size={16} />
    </ToolbarButton>
  )
}

function ToolbarGroup({ children }: { children: ReactNode }) {
  return <div className="wb-editor__toolbar-group">{children}</div>
}

function ToolbarButton({
  children,
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  children: ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="wb-editor__toolbar-button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
