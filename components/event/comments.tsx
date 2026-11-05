'use client'

import Link from 'next/link'
import { Fragment, useMemo, useRef, useState } from 'react'
import { LuArrowUp, LuX } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Avatar } from '@/components/avatar'
import { confirmDialog, toast } from '@/components/ui/feedback'
import { addComment, deleteComment, errorMessage } from '@/lib/actions'
import { cn } from '@/lib/cn'
import { relativeTime } from '@/lib/format'
import { useI18n } from '@/lib/i18n/react'
import { invalidate, isEventKey, updateCache, useQuery } from '@/lib/query'
import { sb } from '@/lib/supabase/client'
import type { CommentRow } from '@/lib/types'


async function fetchComments(eventId: string): Promise<CommentRow[]> {
  const { data, error } = await sb()
    .from('comments')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) throw error
  return (data ?? []) as CommentRow[]
}

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g

export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
            {part.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

export function Comments({ eventId }: { eventId: string }) {
  const { me, memberMap } = useApp()
  const { m } = useI18n()
  const key = ['comments', eventId] as const
  const { data: comments, isLoading } = useQuery(key, () => fetchComments(eventId))
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null)
  const [sending, setSending] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)

  const threads = useMemo(() => {
    const list = comments ?? []
    const roots = list.filter((c) => !c.parent_id || !list.some((p) => p.id === c.parent_id))
    return roots.map((root) => ({ root, replies: list.filter((c) => c.parent_id === root.id) }))
  }, [comments])

  const isThisKey = (k: readonly unknown[]) => k[0] === 'comments' && k[1] === eventId

  const autosize = () => {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const reply = (c: CommentRow) => {
    setReplyTo(c)
    requestAnimationFrame(() => input.current?.focus())
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    const parentId = replyTo ? (replyTo.parent_id ?? replyTo.id) : null
    const temp: CommentRow = {
      id: `tmp-${Date.now()}`,
      event_id: eventId,
      user_id: me.id,
      parent_id: parentId,
      body,
      created_at: new Date().toISOString(),
      edited_at: null,
    }
    updateCache<CommentRow[]>(isThisKey, (list) => [...list, temp])
    setText('')
    setReplyTo(null)
    requestAnimationFrame(autosize)
    setSending(true)
    try {
      await addComment(eventId, body, parentId)
    } catch (err) {
      updateCache<CommentRow[]>(isThisKey, (list) => list.filter((c) => c.id !== temp.id))
      setText(body)
      toast.error(errorMessage(err, m.comments.sendError))
    } finally {
      setSending(false)
      invalidate(isThisKey)
      invalidate(isEventKey)
    }
  }

  const remove = async (c: CommentRow) => {
    const ok = await confirmDialog({ title: m.comments.deleteTitle, confirmLabel: m.common.delete, destructive: true })
    if (!ok) return
    updateCache<CommentRow[]>(isThisKey, (list) => list.filter((x) => x.id !== c.id && x.parent_id !== c.id))
    try {
      await deleteComment(c.id)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      invalidate(isThisKey)
      invalidate(isEventKey)
    }
  }

  const canDelete = (c: CommentRow) => c.user_id === me.id || me.role === 'admin'

  const renderComment = (c: CommentRow, nested: boolean) => {
    const name = memberMap.get(c.user_id)?.display_name ?? m.common.exMember
    const pending = c.id.startsWith('tmp-')
    return (
      <li key={c.id} className={cn('flex gap-2.5', nested && 'ml-11 mt-3', pending && 'opacity-60')}>
        <Link href={`/u/${c.user_id}`} className="shrink-0" aria-label={name}>
          <Avatar id={c.user_id} size={nested ? 28 : 34} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="inline-block max-w-full rounded-[14px] rounded-tl-[4px] border border-line bg-elev px-3.5 py-2.5">
            <p className="font-list text-[14px] font-bold uppercase tracking-[0.01em]">{name}</p>
            <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">
              <Linkify text={c.body} />
            </p>
          </div>
          <div className="mt-1 flex items-center gap-4 px-2 text-[12px] text-muted">
            <span>{pending ? m.comments.sending : relativeTime(c.created_at)}</span>
            {!pending ? (
              <button type="button" onClick={() => reply(c)} className="font-semibold hover:text-fg">
                {m.comments.reply}
              </button>
            ) : null}
            {!pending && canDelete(c) ? (
              <button type="button" onClick={() => void remove(c)} className="hover:text-no">
                {m.common.delete}
              </button>
            ) : null}
          </div>
        </div>
      </li>
    )
  }

  return (
    <section id="commenti" className="scroll-mt-20" aria-labelledby="commenti-titolo">
      <h2 id="commenti-titolo" className="font-list text-[23px] font-extrabold leading-none">
        {m.comments.title}
        {comments && comments.length ? <span className="ml-2 text-muted">{comments.length}</span> : null}
      </h2>
      <p className="mt-1 text-[13px] text-muted">{m.comments.subtitle}</p>

      {isLoading ? (
        <div className="mt-4 space-y-3" aria-hidden>
          <div className="skeleton h-14 w-3/4 rounded-2xl" />
          <div className="skeleton h-14 w-2/3 rounded-2xl" />
        </div>
      ) : threads.length ? (
        <ul className="mt-4 space-y-4">
          {threads.map(({ root, replies }) => (
            <Fragment key={root.id}>
              {renderComment(root, false)}
              {replies.length ? <ul>{replies.map((r) => renderComment(r, true))}</ul> : null}
            </Fragment>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 rounded-[16px] border border-line bg-elev p-1.5">
        {replyTo ? (
          <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-1.5 text-[13px] text-muted">
            <span className="truncate">
              {m.comments.replyingTo} <b className="text-fg">{memberMap.get(replyTo.user_id)?.display_name ?? m.common.exMember}</b>
            </span>
            <button type="button" aria-label={m.comments.cancelReply} onClick={() => setReplyTo(null)} className="p-1">
              <LuX className="size-4" />
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-1.5">
          <textarea
            ref={input}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              autosize()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send()
            }}
            placeholder={replyTo ? m.comments.replyPlaceholder : m.comments.placeholder}
            maxLength={2000}
            aria-label={m.comments.inputLabel}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[16px] leading-snug outline-none placeholder:text-faint"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!text.trim() || sending}
            aria-label={m.comments.send}
            className="press mb-0.5 mr-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-fg text-bg disabled:opacity-30"
          >
            <LuArrowUp className="size-5" strokeWidth={2.6} />
          </button>
        </div>
      </div>

      {!text && !replyTo ? (
        <div className="no-scrollbar relative -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 sm:flex-wrap sm:overflow-visible">
          {m.comments.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setText(s)
                requestAnimationFrame(() => {
                  autosize()
                  input.current?.focus()
                })
              }}
              className="press shrink-0 rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] text-muted hover:border-fg hover:text-fg"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
