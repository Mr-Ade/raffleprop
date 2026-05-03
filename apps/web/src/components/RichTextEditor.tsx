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
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  imageUploadHandler?: (file: File) => Promise<string>;
}

const FONTS = ['Default', 'Georgia', 'Times New Roman', 'Arial', 'Courier New'];

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
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' }),
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
        color: active ? 'var(--green-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '0.8125rem',
        lineHeight: 1.4,
        fontWeight: active ? 700 : 500,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 26,
        height: 26,
      }}
    >
      {children}
    </button>
  );

  const divider = (
    <span style={{
      width: 1, height: 18,
      background: 'var(--border-light)',
      display: 'inline-block',
      margin: '0 4px',
      verticalAlign: 'middle',
      flexShrink: 0,
    }} />
  );

  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-bg)' }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        padding: '5px 8px',
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
          style={{
            fontSize: '0.75rem', padding: '2px 4px',
            border: '1px solid var(--border-light)', borderRadius: 4,
            background: 'var(--surface-bg)', cursor: 'pointer',
            color: 'var(--text-secondary)', height: 26,
          }}
        >
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Text style */}
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
          style={{
            fontSize: '0.75rem', padding: '2px 4px',
            border: '1px solid var(--border-light)', borderRadius: 4,
            background: 'var(--surface-bg)', cursor: 'pointer',
            color: 'var(--text-secondary)', height: 26,
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>

        {divider}

        {/* Text colour */}
        <span
          title="Text colour"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer', height: 26 }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>A</span>
          <input
            type="color"
            title="Text colour"
            value={editor.getAttributes('textStyle').color ?? '#000000'}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            style={{ width: 18, height: 18, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', borderRadius: 3 }}
          />
        </span>

        {divider}

        {/* Formatting */}
        {btn(editor.isActive('bold'),      'Bold',          () => editor.chain().focus().toggleBold().run(),      <strong style={{ fontSize: '0.9rem' }}>B</strong>)}
        {btn(editor.isActive('italic'),    'Italic',        () => editor.chain().focus().toggleItalic().run(),    <em style={{ fontSize: '0.9rem' }}>I</em>)}
        {btn(editor.isActive('underline'), 'Underline',     () => editor.chain().focus().toggleUnderline().run(), <span style={{ textDecoration: 'underline', fontSize: '0.85rem' }}>U</span>)}
        {btn(editor.isActive('strike'),    'Strikethrough', () => editor.chain().focus().toggleStrike().run(),    <span style={{ textDecoration: 'line-through', fontSize: '0.85rem' }}>S</span>)}

        {divider}

        {/* Alignment — FA icons */}
        {btn(editor.isActive({ textAlign: 'left' }),   'Align left',   () => editor.chain().focus().setTextAlign('left').run(),   <i className="fa-solid fa-align-left"   style={{ fontSize: '0.75rem' }} />)}
        {btn(editor.isActive({ textAlign: 'center' }), 'Align centre', () => editor.chain().focus().setTextAlign('center').run(), <i className="fa-solid fa-align-center" style={{ fontSize: '0.75rem' }} />)}
        {btn(editor.isActive({ textAlign: 'right' }),  'Align right',  () => editor.chain().focus().setTextAlign('right').run(),  <i className="fa-solid fa-align-right"  style={{ fontSize: '0.75rem' }} />)}

        {divider}

        {/* Lists & blocks */}
        {btn(editor.isActive('bulletList'),  'Bullet list',  () => editor.chain().focus().toggleBulletList().run(),  <i className="fa-solid fa-list-ul"         style={{ fontSize: '0.75rem' }} />)}
        {btn(editor.isActive('orderedList'), 'Ordered list', () => editor.chain().focus().toggleOrderedList().run(), <i className="fa-solid fa-list-ol"         style={{ fontSize: '0.75rem' }} />)}
        {btn(editor.isActive('blockquote'),  'Blockquote',   () => editor.chain().focus().toggleBlockquote().run(),  <i className="fa-solid fa-quote-left"      style={{ fontSize: '0.75rem' }} />)}
        {btn(editor.isActive('codeBlock'),   'Code block',   () => editor.chain().focus().toggleCodeBlock().run(),   <i className="fa-solid fa-code"            style={{ fontSize: '0.75rem' }} />)}

        {divider}

        {/* Link */}
        {btn(editor.isActive('link'), 'Insert / remove link', setLink, <i className="fa-solid fa-link" style={{ fontSize: '0.75rem' }} />)}

        {/* Image */}
        <button
          type="button"
          title="Insert image"
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '3px 7px', borderRadius: 4,
            border: '1px solid transparent', background: 'transparent',
            cursor: 'pointer', fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 26, height: 26,
          }}
        >
          <i className="fa-solid fa-image" style={{ fontSize: '0.75rem' }} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label="Upload image into editor"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageFile(file);
            e.target.value = '';
          }}
        />

        {divider}

        {/* Undo / Redo */}
        {btn(false, 'Undo', () => editor.chain().focus().undo().run(), <i className="fa-solid fa-rotate-left"  style={{ fontSize: '0.75rem' }} />)}
        {btn(false, 'Redo', () => editor.chain().focus().redo().run(), <i className="fa-solid fa-rotate-right" style={{ fontSize: '0.75rem' }} />)}

        {/* Clear formatting */}
        <button
          type="button"
          title="Clear formatting"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          style={{
            padding: '3px 7px', borderRadius: 4,
            border: '1px solid transparent', background: 'transparent',
            cursor: 'pointer', fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'inline-flex', alignItems: 'center', gap: 3,
            height: 26,
          }}
        >
          <i className="fa-solid fa-text-slash" style={{ fontSize: '0.7rem' }} />
        </button>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div style={{
          padding: '0.375rem 0.75rem',
          background: '#fee2e2',
          borderTop: '1px solid #fca5a5',
          fontSize: '0.8125rem',
          color: '#b91c1c',
        }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.35rem' }} />
          {uploadError}
        </div>
      )}

      {/* Editor area */}
      <EditorContent
        editor={editor}
        style={{ minHeight, padding: '0.875rem 1rem', fontSize: '0.9375rem', lineHeight: 1.75, cursor: 'text' }}
      />

      {/* Scoped styles — placeholder uses .is-empty (Tiptap default per-node class) */}
      <style>{`
        .tiptap { outline: none; }

        .tiptap p.is-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
          pointer-events: none;
          height: 0;
          font-style: italic;
        }

        .tiptap h1 { font-size: 1.75rem; font-weight: 800; margin: 0.875rem 0 0.45rem; line-height: 1.2; }
        .tiptap h2 { font-size: 1.375rem; font-weight: 700; margin: 0.75rem 0 0.4rem;  line-height: 1.25; }
        .tiptap h3 { font-size: 1.125rem; font-weight: 700; margin: 0.625rem 0 0.35rem; }
        .tiptap h4 { font-size: 1rem;     font-weight: 700; margin: 0.5rem 0 0.3rem; }

        .tiptap p { margin: 0 0 0.625rem; }
        .tiptap p:last-child { margin-bottom: 0; }

        .tiptap ul,
        .tiptap ol { padding-left: 1.5rem; margin: 0.5rem 0 0.75rem; }
        .tiptap li { margin-bottom: 0.25rem; }

        .tiptap blockquote {
          border-left: 3px solid var(--green-primary);
          padding-left: 1rem;
          color: var(--text-muted);
          margin: 0.75rem 0;
          font-style: italic;
        }

        .tiptap pre {
          background: var(--card-bg);
          border: 1px solid var(--border-light);
          border-radius: 6px;
          padding: 0.75rem 1rem;
          font-family: monospace;
          font-size: 0.875rem;
          overflow-x: auto;
          margin: 0.5rem 0;
        }

        .tiptap code {
          background: var(--green-50);
          padding: 1px 5px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.875em;
        }

        .tiptap a {
          color: var(--green-primary);
          text-decoration: underline;
          cursor: pointer;
        }

        .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 0.5rem 0;
          display: block;
        }

        .tiptap hr {
          border: none;
          border-top: 1px solid var(--border-light);
          margin: 1.25rem 0;
        }
      `}</style>
    </div>
  );
}
