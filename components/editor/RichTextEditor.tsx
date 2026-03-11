import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import './editor-styles.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  id?: string;
}

const ToolbarButton = ({
  onClick,
  isActive = false,
  ariaLabel,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  ariaLabel: string;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    title={title}
    aria-pressed={isActive}
    className={`p-2 rounded-md transition-colors ${
      isActive
        ? 'bg-primary-100 text-primary-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    {children}
  </button>
);

/**
 * @component RichTextEditor
 * @description A WYSIWYG rich text editor for resume descriptions
 * Supports: bold, italic, underline, strikethrough, bullet lists, numbered lists, headings (H1-H3)
 * Stores content as HTML for display and JSON for structured data
 */
export const RichTextEditor = React.memo<RichTextEditorProps>(
  ({ content, onChange, placeholder = 'Start typing...', minHeight = '120px', className = '', id }) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
          underline: false, // Disable underline from StarterKit to avoid duplicate extension warning
        }),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Placeholder.configure({
          placeholder,
        }),
      ],
      content,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: 'prose-editor focus:outline-none',
          style: `min-height: ${minHeight}`,
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': placeholder,
          'data-testid': 'rich-text-editor',
          ...(id ? { id } : {}),
        },
      },
    });

    const handleToggleBold = useCallback(() => {
      editor?.chain().focus().toggleBold().run();
    }, [editor]);

    const handleToggleItalic = useCallback(() => {
      editor?.chain().focus().toggleItalic().run();
    }, [editor]);

    const handleToggleUnderline = useCallback(() => {
      editor?.chain().focus().toggleUnderline().run();
    }, [editor]);

    const handleToggleStrike = useCallback(() => {
      editor?.chain().focus().toggleStrike().run();
    }, [editor]);

    const handleToggleBulletList = useCallback(() => {
      editor?.chain().focus().toggleBulletList().run();
    }, [editor]);

    const handleToggleOrderedList = useCallback(() => {
      editor?.chain().focus().toggleOrderedList().run();
    }, [editor]);

    const handleToggleHeading = useCallback(
      (level: 1 | 2 | 3) => {
        editor?.chain().focus().toggleHeading({ level }).run();
      },
      [editor],
    );

    const handleToggleCode = useCallback(() => {
      editor?.chain().focus().toggleCode().run();
    }, [editor]);

    if (!editor) {
      return (
        <div 
          className={`border border-slate-300 rounded-lg bg-slate-50 animate-pulse ${className}`}
          style={{ minHeight }}
          aria-busy="true"
          aria-label="Loading editor..."
        />
      );
    }

    return (
      <div className={`border border-slate-300 rounded-lg overflow-hidden bg-white ${className}`}>
        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-slate-50 border-b border-slate-200"
          role="toolbar"
          aria-label="Formatting options"
        >
          {/* Headings */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
            <ToolbarButton
              onClick={() => handleToggleHeading(1)}
              isActive={editor.isActive('heading', { level: 1 })}
              ariaLabel="Heading 1"
              title="Heading 1"
            >
              <span className="text-xs font-bold">H1</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => handleToggleHeading(2)}
              isActive={editor.isActive('heading', { level: 2 })}
              ariaLabel="Heading 2"
              title="Heading 2"
            >
              <span className="text-xs font-bold">H2</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => handleToggleHeading(3)}
              isActive={editor.isActive('heading', { level: 3 })}
              ariaLabel="Heading 3"
              title="Heading 3"
            >
              <span className="text-xs font-bold">H3</span>
            </ToolbarButton>
          </div>

          {/* Text Formatting */}
          <div className="flex items-center gap-1 px-2 border-r border-slate-200">
            <ToolbarButton
              onClick={handleToggleBold}
              isActive={editor.isActive('bold')}
              ariaLabel="Bold"
              title="Bold (Ctrl+B)"
            >
              <span className="material-symbols-outlined text-[18px] font-bold">format_bold</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToggleItalic}
              isActive={editor.isActive('italic')}
              ariaLabel="Italic"
              title="Italic (Ctrl+I)"
            >
              <span className="material-symbols-outlined text-[18px]">format_italic</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToggleUnderline}
              isActive={editor.isActive('underline')}
              ariaLabel="Underline"
              title="Underline (Ctrl+U)"
            >
              <span className="material-symbols-outlined text-[18px]">format_underlined</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToggleStrike}
              isActive={editor.isActive('strike')}
              ariaLabel="Strikethrough"
              title="Strikethrough"
            >
              <span className="material-symbols-outlined text-[18px]">strikethrough_s</span>
            </ToolbarButton>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 px-2 border-r border-slate-200">
            <ToolbarButton
              onClick={handleToggleBulletList}
              isActive={editor.isActive('bulletList')}
              ariaLabel="Bullet list"
              title="Bullet list"
            >
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToggleOrderedList}
              isActive={editor.isActive('orderedList')}
              ariaLabel="Numbered list"
              title="Numbered list"
            >
              <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
            </ToolbarButton>
          </div>

          {/* Code */}
          <div className="flex items-center gap-1 px-2">
            <ToolbarButton
              onClick={handleToggleCode}
              isActive={editor.isActive('code')}
              ariaLabel="Code"
              title="Inline code"
            >
              <span className="material-symbols-outlined text-[18px]">code</span>
            </ToolbarButton>
          </div>
        </div>

        {/* Editor Content */}
        <EditorContent
          editor={editor}
          className="w-full"
          style={{ minHeight }}
        />
      </div>
    );
  },
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
