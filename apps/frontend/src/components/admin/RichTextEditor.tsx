'use client';

import { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { adminUploadImage } from '@/lib/api/admin-products';

interface Props {
  content: string;
  onChange: (html: string) => void;
  productId?: string;
}

export default function RichTextEditor({ content, onChange, productId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false, link: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  if (!editor) return null;

  async function handleImageFile(file: File) {
    if (!productId) return;
    try {
      const { url } = await adminUploadImage(productId, file);
      editor?.chain().focus().setImage({ src: url }).run();
    } catch {
      // 업로드 실패 시 조용히 무시
    }
  }

  const btn = (active: boolean) =>
    `rounded px-2 py-1 text-xs font-medium ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`;

  return (
    <div className="rounded-md border border-gray-300 focus-within:border-blue-500">
      {/* 툴바 */}
      <div className="flex flex-wrap gap-0.5 border-b border-gray-200 p-1.5">
        <button
          type="button"
          className={btn(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={`${btn(editor.isActive('italic'))} italic`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={`${btn(editor.isActive('underline'))} underline`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </button>
        <span className="mx-1 border-r border-gray-200" />
        <button
          type="button"
          className={btn(editor.isActive('heading', { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          type="button"
          className={btn(editor.isActive('heading', { level: 3 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </button>
        <span className="mx-1 border-r border-gray-200" />
        <button
          type="button"
          className={btn(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          ≡
        </button>
        <button
          type="button"
          className={btn(editor.isActive('orderedList'))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </button>
        <span className="mx-1 border-r border-gray-200" />
        <button
          type="button"
          className={btn(editor.isActive('link'))}
          onClick={() => {
            const url = window.prompt('링크 URL을 입력하세요');
            if (url) editor.chain().focus().setLink({ href: url }).run();
            else editor.chain().focus().unsetLink().run();
          }}
        >
          링크
        </button>
        {productId && (
          <button
            type="button"
            className={btn(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            이미지
          </button>
        )}
      </div>

      {/* 에디터 영역 */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 text-sm focus:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImageFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
