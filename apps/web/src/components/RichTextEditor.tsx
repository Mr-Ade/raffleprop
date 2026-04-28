'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import { useCallback, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  imageUploadHandler?: (file: File) => Promise<string>;
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
const FONTS = ['Default', 'Georgia', 'Times New Roman', 'Arial', 'Courier New'];
const COLORS = ['#000000', '#333333', '#666666', '#0D5E30', '#1a7a3f', '#dc2626', '#2563eb', '#7c3aed', '#ea580c'];

export function RichTextEditor({ value, onChange, placeholder, minHeight = 180, imageUploadHandler }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image.configure({ HTMLAttributes: { style: 'max-width:100%;height:auto;border-radius:6px;' } }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const handleImageFile = useCallback(async (file: File) => {
    if (!editor) return;
    if (imageUploadHandler) {
      try {
        const url = await imageUploadHandler(file);
        editor.chain().focus().setImage({ src: url }).run();
        setUploadError('');
      } catch {
        setUploadError('Image upload failed. Please try again.');
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    }
  }, [editor, imageUploadHandler]);

  if (!editor) return null;

  const btn = (active: boolean, title: string, onClick: () => void, children: React.ReactNode) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        padding: '3px 7px',
        borderRadius: 4,
        border: active ? '1px solid var(--green-primary)' : '1px solid transparent',
        background: active ? 'var(--green-50)' : 'transparent',
        color: active ? 'var(--green-primary)' : 'inherit',
        cursor: 'pointer',
        fontSize: '0.8125rem',
        lineHeight: 1.4,
        fontWeight: active ? 700 : 400,
      }}
    >
      {children}
    </button>
  );

  const divider = <span style={{ width: 1, height: 18, background: 'var(--border-light)', display: 'inline-block', margin: '0 3px', verticalAlign: 'middle' }} />;

  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-bg)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 8px',
        borderBottom: '1px solid var(--border-light)',
        background: 'var(--card-bg)',
        alignItems: 'center',
      }}>
        {/* Font family */}
        <select
          title="Font family"
          value={editor.getAttributes('textStyle').fontFamily ?? 'Default'}
          onChange={(e) => {
            if (e.target.value === 'Default') editor.chain().focus().unsetFontFamily().run();
            else editor.chain().focus().setFontFamily(e.target.value).run();
          }}
          style={{ fontSize: '0.75rem', padding: '2px 4px', border: '1px solid var(--border-light)', borderRadius: 4, background: 'var(--surface-bg)', cursor: 'pointer' }}
        >
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Font size via heading levels */}
        <select
          title="Text style"
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' :
            editor.isActive('heading', { level: 4 }) ? 'h4' : 'p'
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(v.slice(1)) as 1 | 2 | 3 | 4 }).run();
          }}
          style={{ fontSize: '0.75rem', padding: '2px 4px', border: '1px solid var(--border-light)', borderRadius: 4, background: 'var(--surface-bg)', cursor: 'pointer' }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>

        {divider}

        {/* Text color */}
        <span title="Text color" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>A</span>
          <input
            type="color"
            title="Text color"
            value={editor.getAttributes('textStyle').color ?? '#000000'}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            style={{ width: 20, height: 20, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
          />
        </span>

        {divider}

        {btn(editor.isActive('bold'), 'Bold', () => editor.chain().focus().toggleBold().run(), <strong>B</strong>)}
        {btn(editor.isActive('italic'), 'Italic', () => editor.chain().focus().toggleItalic().run(), <em>I</em>)}
        {btn(editor.isActive('underline'), 'Underline', () => editor.chain().focus().toggleUnderline().run(), <span style={{ textDecoration: 'underline' }}>U</span>)}
        {btn(editor.isActive('strike'), 'Strikethrough', () => editor.chain().focus().toggleStrike().run(), <span style={{ textDecoration: 'line-through' }}>S</span>)}
        {btn(editor.isActive('code'), 'Inline code', () => editor.chain().focus().toggleCode().run(), <code style={{ fontFamily: 'monospace' }}>`</code>)}

        {divider}

        {btn(editor.isActive({ textAlign: 'left' }), 'Align left', () => editor.chain().focus().setTextAlign('left').run(), '⬛')}
        {btn(editor.isActive({ textAlign: 'center' }), 'Center', () => editor.chain().focus().setTextAlign('center').run(), '▬')}
        {btn(editor.isActive({ textAlign: 'right' }), 'Align right', () => editor.chain().focus().setTextAlign('right').run(), '⬛')}

        {divider}

        {btn(editor.isActive('bulletList'), 'Bullet list', () => editor.chain().focus().toggleBulletList().run(), '• ≡')}
        {btn(editor.isActive('orderedList'), 'Ordered list', () => editor.chain().focus().toggleOrderedList().run(), '1.')}
        {btn(editor.isActive('blockquote'), 'Blockquote', () => editor.chain().focus().toggleBlockquote().run(), '❝')}
        {btn(editor.isActive('codeBlock'), 'Code block', () => editor.chain().focus().toggleCodeBlock().run(), '{ }')}

        {divider}

        {btn(editor.isActive('link'), 'Link', setLink, '🔗')}
        <button
          type="button"
          title="Insert image"
          onClick={() => fileInputRef.current?.click()}
          style={{ padding: '3px 7px', borderRadius: 4, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem' }}
        >
          🖼
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          title="Upload image"
          aria-label="Upload image"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageFile(file);
            e.target.value = '';
          }}
        />

        {divider}

        {btn(false, 'Undo', () => editor.chain().focus().undo().run(), '↩')}
        {btn(false, 'Redo', () => editor.chain().focus().redo().run(), '↪')}
        <button
          type="button"
          title="Clear formatting"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          style={{ padding: '3px 7px', borderRadius: 4, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}
        >
          Tx
        </button>
      </div>

      {uploadError && (
        <div style={{ padding: '0.375rem 0.75rem', background: '#fee2e2', borderTop: '1px solid #fca5a5', fontSize: '0.8125rem', color: '#b91c1c' }}>
          {uploadError}
        </div>
      )}

      {/* Editor area */}
      <EditorContent
        editor={editor}
        style={{ minHeight, padding: '0.75rem 1rem', fontSize: '0.9375rem', lineHeight: 1.7, cursor: 'text' }}
        placeholder={placeholder}
      />

      <style>{`
        .tiptap { outline: none; }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
          pointer-events: none;
          height: 0;
        }
        .tiptap h1 { font-size: 1.75rem; font-weight: 800; margin: 1rem 0 0.5rem; }
        .tiptap h2 { font-size: 1.375rem; font-weight: 700; margin: 0.875rem 0 0.4rem; }
        .tiptap h3 { font-size: 1.125rem; font-weight: 700; margin: 0.75rem 0 0.35rem; }
        .tiptap h4 { font-size: 1rem; font-weight: 700; margin: 0.625rem 0 0.3rem; }
        .tiptap p { margin: 0 0 0.625rem; }
        .tiptap ul, .tiptap ol { padding-left: 1.5rem; margin: 0.5rem 0 0.75rem; }
        .tiptap li { margin-bottom: 0.25rem; }
        .tiptap blockquote { border-left: 3px solid var(--green-primary); padding-left: 1rem; color: var(--text-muted); margin: 0.75rem 0; font-style: italic; }
        .tiptap pre { background: var(--card-bg); border: 1px solid var(--border-light); border-radius: 6px; padding: 0.75rem 1rem; font-family: monospace; font-size: 0.875rem; overflow-x: auto; }
        .tiptap code { background: var(--green-50); padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 0.875em; }
        .tiptap a { color: var(--green-primary); text-decoration: underline; }
        .tiptap img { max-width: 100%; height: auto; border-radius: 6px; margin: 0.5rem 0; }
        .tiptap hr { border: none; border-top: 1px solid var(--border-light); margin: 1.25rem 0; }
      `}</style>
    </div>
  );
}
