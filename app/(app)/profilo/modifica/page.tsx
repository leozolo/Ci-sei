'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LuCamera } from 'react-icons/lu'
import { useApp } from '@/components/app-context'
import { Avatar } from '@/components/avatar'
import { PageBody, PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/field'
import { toast } from '@/components/ui/feedback'
import { errorMessage, updateProfile } from '@/lib/actions'
import { useI18n } from '@/lib/i18n/react'
import { invalidate } from '@/lib/query'

export default function EditProfilePage() {
  const { me, refreshMe } = useApp()
  const router = useRouter()
  const { m } = useI18n()
  const [name, setName] = useState(me.display_name)
  const [avatar, setAvatar] = useState<Blob | null | undefined>(undefined)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!(avatar instanceof Blob)) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(avatar)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatar])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error(m.editProfile.nameRequired)
      return
    }
    setSaving(true)
    try {
      await updateProfile(me, { display_name: name, avatar })
      await refreshMe()
      invalidate((k) => k[0] === 'members')
      toast.success(m.editProfile.saved)
      router.replace(`/u/${me.id}`)
    } catch (err) {
      toast.error(errorMessage(err))
      setSaving(false)
    }
  }

  const hasPhoto = avatar instanceof Blob || (avatar === undefined && !!me.avatar_url)

  return (
    <main>
      <PageHeader back={`/u/${me.id}`} title={m.profile.edit} />
      <PageBody>
        <form onSubmit={submit} className="space-y-6 pt-2">
          <div className="flex flex-col items-center gap-3">
            <button type="button" onClick={() => file.current?.click()} className="press relative" aria-label={m.editProfile.changePhoto}>
              {preview ? (
                <img src={preview} alt="" className="size-28 rounded-full object-cover" />
              ) : avatar === null ? (
                <Avatar person={{ ...me, avatar_url: null }} size={112} />
              ) : (
                <Avatar person={me} size={112} />
              )}
              <span className="absolute bottom-0 right-0 inline-flex size-9 items-center justify-center rounded-full bg-invert text-invert-fg ring-4 ring-bg">
                <LuCamera className="size-[18px]" />
              </span>
            </button>
            <input
              ref={file}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setAvatar(f)
                e.target.value = ''
              }}
            />
            {hasPhoto ? (
              <button type="button" onClick={() => setAvatar(null)} className="text-[14px] text-muted underline-offset-4 hover:underline">
                {m.editProfile.removePhoto}
              </button>
            ) : null}
          </div>

          <TextField
            id="nome"
            label={m.editProfile.name}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            hint={m.editProfile.nameHint}
          />

          <Button type="submit" size="lg" className="w-full" loading={saving}>
            {m.common.save}
          </Button>
        </form>
      </PageBody>
    </main>
  )
}
