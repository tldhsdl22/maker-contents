import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import { manuscriptService } from '../services/manuscript.js'
import { ApiError } from '../services/api.js'
import type { ManuscriptDetail, Posting, PublishRequest } from '../types/manuscript.js'
import PublishModal from '../components/PublishModal.js'

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']

const COLORS = [
  '#000000', '#434343', '#666666', '#999999',
  '#E03131', '#E8590C', '#F59F00', '#2F9E44',
  '#1971C2', '#6741D9', '#C2255C', '#0C8599',
]

const AUTO_SAVE_DELAY = 30_000

export default function ManuscriptEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [manuscript, setManuscript] = useState<ManuscriptDetail | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [posting, setPosting] = useState<Posting | null>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedContent = useRef<string>('')
  const lastSavedTitle = useRef<string>('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        strike: {},
        blockquote: {},
      }),
      TextStyle,
      Color,
      FontSize,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full rounded-lg' },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[400px] px-6 py-4',
      },
    },
    onUpdate: () => {
      setSaved(false)
      scheduleAutoSave()
    },
  })

  const save = useCallback(async (silent = false) => {
    if (!editor || !manuscript) return
    const currentTitle = title.trim()
    const currentHtml = editor.getHTML()
    if (!currentTitle) {
      if (!silent) setError('제목을 입력해주세요.')
      return
    }
    if (currentTitle === lastSavedTitle.current && currentHtml === lastSavedContent.current) {
      if (!silent) setSaved(true)
      return
    }
    if (!silent) setSaving(true)
    setError('')
    try {
      const data = await manuscriptService.update(manuscript.id, {
        title: currentTitle,
        content_html: currentHtml,
      })
      setManuscript(data.manuscript)
      lastSavedContent.current = currentHtml
      lastSavedTitle.current = currentTitle
      setSaved(true)
    } catch (err) {
      if (!silent) setError(err instanceof ApiError ? err.message : '저장에 실패했습니다.')
    } finally {
      if (!silent) setSaving(false)
    }
  }, [editor, manuscript, title])

  function scheduleAutoSave() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => save(true), AUTO_SAVE_DELAY)
  }

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')
    manuscriptService.getById(Number(id))
      .then(data => {
        setManuscript(data.manuscript)
        setTitle(data.manuscript.title)
        lastSavedTitle.current = data.manuscript.title
        lastSavedContent.current = data.manuscript.content_html || ''
        if (editor) {
          editor.commands.setContent(data.manuscript.content_html || '')
        }
      })
      .catch(err => {
        setError(err instanceof ApiError ? err.message : '원고를 불러오지 못했습니다.')
      })
      .finally(() => setLoading(false))
  }, [id, editor])

  useEffect(() => {
    if (!id) return
    manuscriptService.getPublishInfo(Number(id))
      .then(data => setPosting(data.posting))
      .catch(() => setPosting(null))
  }, [id])

  async function handleCopyHtml() {
    if (!editor) return
    const html = editor.getHTML()
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([editor.getText()], { type: 'text/plain' }),
        }),
      ])
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = html
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  async function handlePublish(data: PublishRequest) {
    if (!manuscript) return
    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      throw new Error('제목을 입력해주세요.')
    }
    await save(false)
    const response = await manuscriptService.publish(manuscript.id, data)
    setPosting(response.posting)
    setManuscript(prev => prev ? { ...prev, status: 'posted' } : prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!manuscript || !editor) {
    return (
      <div className="page-shell p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || '원고를 찾을 수 없습니다.'}
        </div>
        <button onClick={() => navigate('/manuscripts')} className="btn-link mt-4 text-sm">
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/manuscripts')}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            title="목록으로"
          >
            <BackIcon className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setSaved(false); scheduleAutoSave() }}
            className="border-none bg-transparent text-lg font-semibold text-gray-900 focus:outline-none focus:ring-0 w-[400px]"
            placeholder="원고 제목"
          />
          {saved && <span className="text-xs text-green-600">저장됨</span>}
          {saving && <span className="text-xs text-gray-400">저장 중...</span>}
        </div>
        <div className="flex items-center gap-2">
          {posting && (
            <a
              href={posting.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-base btn-secondary btn-md hidden items-center gap-1.5 text-emerald-600 sm:inline-flex"
            >
              <LinkIcon className="h-4 w-4" />
              포스팅 URL
            </a>
          )}
          {manuscript.status === 'posted' && (
            <button
              onClick={() => navigate(`/manuscripts/${manuscript.id}/performance`)}
              className="btn-base btn-secondary btn-md hidden items-center gap-1.5 sm:inline-flex"
            >
              <ChartIcon className="h-4 w-4" />
              성과 보기
            </button>
          )}
          <button
            onClick={handleCopyHtml}
            className="btn-base btn-secondary btn-md inline-flex items-center gap-1.5"
          >
            <CopyIcon className="h-4 w-4" />
            {showCopied ? '복사됨!' : '복사'}
          </button>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="btn-base btn-primary btn-md inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <SaveIcon className="h-4 w-4" />
            저장
          </button>
          <button
            onClick={() => setPublishOpen(true)}
            disabled={manuscript.status === 'posted'}
            className="btn-base btn-primary btn-md inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <UploadIcon className="h-4 w-4" />
            {manuscript.status === 'posted' ? '포스팅 완료' : '포스팅 완료 처리'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* 서식 도구 모음 */}
      <EditorToolbar editor={editor} />

      {/* 편집 영역 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white shadow-sm">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* 하단 정보 바 */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-2 text-xs text-gray-400">
        <span>
          원본: {manuscript.source_title_snapshot || '알 수 없음'}
          {manuscript.source_url_snapshot && (
            <>
              {' · '}
              <a href={manuscript.source_url_snapshot} target="_blank" rel="noopener noreferrer" className="btn-link">
                원문 보기
              </a>
            </>
          )}
        </span>
        <span>
          생성: {new Date(manuscript.created_at).toLocaleDateString('ko-KR')}
          {' · '}
          수정: {new Date(manuscript.updated_at).toLocaleDateString('ko-KR')}
        </span>
      </div>

      <PublishModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onSubmit={handlePublish}
        initialKeyword={manuscript.keyword}
        initialUrl={posting?.url}
        initialPlatform={posting?.platform}
      />
    </div>
  )
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFontSize, setShowFontSize] = useState(false)
  const colorRef = useRef<HTMLDivElement>(null)
  const fontRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setShowColorPicker(false)
      if (fontRef.current && !fontRef.current.contains(e.target as Node)) setShowFontSize(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!editor) return null

  function insertLink() {
    const previousUrl = editor!.getAttributes('link').href || ''
    const url = window.prompt('링크 URL을 입력하세요', previousUrl)
    if (url === null) return
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  function insertImage() {
    const url = window.prompt('이미지 URL을 입력하세요')
    if (url) {
      editor!.chain().focus().setImage({ src: url }).run()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-white px-4 py-2">
      {/* 글자 크기 */}
      <div className="relative" ref={fontRef}>
        <ToolbarButton
          onClick={() => setShowFontSize(!showFontSize)}
          title="글자 크기"
        >
          <FontSizeIcon className="h-4 w-4" />
        </ToolbarButton>
        {showFontSize && (
          <div className="absolute left-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {FONT_SIZES.map(size => (
              <button
                key={size}
                onClick={() => {
                  editor!.chain().focus().setFontSize(size).run()
                  setShowFontSize(false)
                }}
                className="block w-full px-4 py-1.5 text-left text-sm hover:bg-gray-100"
                style={{ fontSize: size }}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* 굵기 / 기울기 / 밑줄 / 취소선 */}
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="굵게 (Ctrl+B)"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="기울임 (Ctrl+I)"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="밑줄 (Ctrl+U)"
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="취소선"
      >
        <span className="line-through">S</span>
      </ToolbarButton>

      <Divider />

      {/* 글자 색상 */}
      <div className="relative" ref={colorRef}>
        <ToolbarButton
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="글자 색상"
        >
          <ColorIcon className="h-4 w-4" />
        </ToolbarButton>
        {showColorPicker && (
          <div className="absolute left-0 top-full z-10 mt-1 grid grid-cols-4 gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => {
                  editor.chain().focus().setColor(color).run()
                  setShowColorPicker(false)
                }}
                className="h-6 w-6 rounded border border-gray-200 transition hover:scale-110"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <button
              onClick={() => {
                editor.chain().focus().unsetColor().run()
                setShowColorPicker(false)
              }}
              className="col-span-4 mt-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            >
              색상 초기화
            </button>
          </div>
        )}
      </div>

      <Divider />

      {/* 정렬 */}
      <ToolbarButton
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        title="왼쪽 정렬"
      >
        <AlignLeftIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        title="가운데 정렬"
      >
        <AlignCenterIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        title="오른쪽 정렬"
      >
        <AlignRightIcon className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* 인용구 */}
      <ToolbarButton
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="인용구"
      >
        <QuoteIcon className="h-4 w-4" />
      </ToolbarButton>

      {/* 링크 */}
      <ToolbarButton
        active={editor.isActive('link')}
        onClick={insertLink}
        title="링크 삽입"
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>

      {/* 이미지 */}
      <ToolbarButton onClick={insertImage} title="이미지 삽입">
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="실행 취소 (Ctrl+Z)"
      >
        <UndoIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="다시 실행 (Ctrl+Y)"
      >
        <RedoIcon className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )
}

function ToolbarButton({ children, active, disabled, onClick, title }: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm transition ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-gray-200" />
}

// --- Icons ---

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  )
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function FontSizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5h14v2M8 5v14m-1 0h2m4-14v2m-1 12V7h8v2M17 7v12m-1 0h2" />
    </svg>
  )
}

function ColorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072" />
    </svg>
  )
}

function AlignLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M3 6h18M3 12h12M3 18h16" />
    </svg>
  )
}

function AlignCenterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M3 6h18M6 12h12M4 18h16" />
    </svg>
  )
}

function AlignRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M3 6h18M9 12h12M5 18h16" />
    </svg>
  )
}

function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
    </svg>
  )
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.586-3.828a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.25 9.567" />
    </svg>
  )
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M2.25 18.75h18a.75.75 0 00.75-.75V6a.75.75 0 00-.75-.75H3a.75.75 0 00-.75.75v12c0 .414.336.75.75.75z" />
    </svg>
  )
}

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  )
}

function RedoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l3-3 4 4 5-6" />
    </svg>
  )
}
