import Link from 'next/link'
import { Mark } from '@/components/brand'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <Mark size={56} className="text-fg" />
      <h1 className="text-[20px] font-bold">Pagina non trovata</h1>
      <p className="text-[15px] text-muted">Il link potrebbe essere sbagliato o l’evento non esiste più.</p>
      <Link href="/" className="font-semibold underline underline-offset-4">
        Torna alla bacheca
      </Link>
    </main>
  )
}
