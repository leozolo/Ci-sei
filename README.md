# Club dei clubbers

La bacheca privata delle serate del vostro gruppo: qualcuno propone una serata, una mostra o una cena, gli altri rispondono **Mettimi in lista / Forse / No**, si organizzano nei messaggi e ricevono le notifiche sul telefono.

È una **PWA**: si installa sulla schermata Home di iPhone e Android senza passare dagli store, e funziona anche da computer.

## Cosa fa

- **Eventi** con locandina, link (Instagram, Dice, Eventbrite, Resident Advisor…), titolo, descrizione, luogo, indirizzo, città, data/ora e categoria. Incollando il link, l'app prova a compilare da sola titolo, data, luogo, città e locandina.
- **La lista**: ogni evento è una lista all'ingresso. Rispondi con **Mettimi in lista / Forse / No** (si cambia quando vuoi) e indica se porti qualcuno ("+2"). Ogni evento mostra quante persone arrivano, i nomi spuntati con i loro ospiti, chi è indeciso, chi non viene e chi non ha ancora risposto.
- **Bacheca**: Sei in lista, Questo weekend, Dove vanno tutti (le liste più lunghe), Appena proposti, In programma giorno per giorno; filtri per data e categoria.
- **Città**: oggi Roma; ogni evento ha la sua città e, quando ce n'è più di una, in bacheca e nel calendario compare la scelta della città.
- **Messaggi** sotto ogni evento con risposte, **mi piace**, **salvati**.
- **Notifiche** (nell'app in tempo reale e push sul telefono) per nuovi eventi, nuovi messaggi, cambi di data/ora/luogo, annullamenti e amici che si mettono in lista. Ognuno sceglie quali ricevere.
- **Calendario** del gruppo, **ricerca**, **archivio** degli eventi passati, **aggiungi al calendario** (iPhone/Outlook/Google), **condividi su WhatsApp**.
- **Profili** con foto, eventi proposti, partecipazioni e salvati.
- **Accesso privato**: registrazione solo con link d'invito, accesso con email e password (o Google). Gli amministratori creano e disattivano gli inviti, rimuovono o riattivano i membri.
- Tema scuro blu notte (predefinito), chiaro o come il telefono.

## Tecnologia

Next.js 16 (React 19) + Tailwind CSS 4 sul frontend; Supabase per database Postgres, autenticazione, archivio immagini e tempo reale. La sicurezza è nel database: ogni tabella ha regole (Row Level Security) che mostrano i dati **solo ai membri attivi del gruppo**; le immagini stanno in archivi privati.

## Design

Il design "In lista" è descritto in [`DESIGN.md`](DESIGN.md) (colori, caratteri, componenti, regole) e il prodotto in [`PRODUCT.md`](PRODUCT.md). È stato costruito con la skill [impeccable](https://github.com/pbakaus/impeccable) (Apache 2.0), inclusa in `.claude/skills/impeccable` con i suoi agenti in `.claude/agents`: aprendo il progetto con Claude Code, `/impeccable` la usa per nuove schermate, revisioni e rifiniture, rispettando `DESIGN.md`.

---

## Pubblicarla online (circa 20 minuti, gratis)

Servono tre account gratuiti: **Supabase** (database), **GitHub** (dove sta il codice) e **Vercel** (che pubblica l'app). Conviene farlo da computer.

### 1. Crea il database su Supabase

1. Vai su [supabase.com](https://supabase.com) → **New project**. Scegli un nome, una password del database e la regione **Central EU (Frankfurt)**.
2. Quando il progetto è pronto apri **SQL Editor** → **New query**, incolla tutto il contenuto del file `supabase/schema.sql` e premi **Run**. Deve comparire "Success". (Se il database è già stato installato, puoi saltare questo passaggio: rieseguirlo comunque non cancella dati.)
3. Vai su **Authentication → Sign In / Providers → Email** e **disattiva "Confirm email"**, poi salva.
   *Perché:* il servizio email gratuito di Supabase spedisce pochissime email all'ora; gli inviti proteggono già l'accesso.
4. Vai su **Project Settings → API Keys** (o il pulsante **Connect**) e tieni a portata di mano:
   - **Project URL** (es. `https://abcd1234.supabase.co`)
   - **Publishable key** (`sb_publishable_…`; nei progetti vecchi si chiama *anon*)
   - **Secret key** (`sb_secret_…`; nei progetti vecchi *service_role*). È segreta: non condividerla.

### 2. Metti il codice su GitHub

Il codice sta nel repository `leozolo/Ci-sei`. Per ripartire da zero: crea un repository **privato** su [github.com](https://github.com), scegli **uploading an existing file** e trascina dentro **il contenuto** della cartella del progetto.

### 3. Pubblica con Vercel

1. Su [vercel.com](https://vercel.com) accedi con GitHub → **Add New → Project** → importa il repository.
2. Prima di premere Deploy apri **Environment Variables** e aggiungi:

   | Nome | Valore |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | il Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | la Publishable key |
   | `SUPABASE_SECRET_KEY` | la Secret key (serve per le notifiche push) |

3. Premi **Deploy**. Dopo un paio di minuti avrai un indirizzo tipo `https://ci-sei.vercel.app`.

### 4. Collega l'indirizzo a Supabase

In Supabase → **Authentication → URL Configuration**:

- **Site URL**: il tuo indirizzo Vercel (es. `https://ci-sei.vercel.app`)
- **Redirect URLs**: aggiungi `https://ci-sei.vercel.app/**`

### 5. Crea il gruppo

Apri l'indirizzo dal telefono: la prima volta trovi **Crea il gruppo**. Il primo account diventa **amministratore**.

---

## Invitare gli amici

1. Apri **Profilo → Impostazioni** (l'ingranaggio in alto) **→ Inviti e membri**.
2. Scegli quante persone possono usare il link (1, 5, 10, 25) e per quanto è valido, poi **Crea link d'invito**.
3. Tocca **Invia su WhatsApp** (o **Copia link**). Un link da 10 persone si può mettere direttamente nel gruppo WhatsApp.
4. Chi lo apre si registra con nome, email e password ed entra subito.

Per installare l'app sulla schermata Home:

- **iPhone**: apri il link con **Safari** → tasto **Condividi** → **Aggiungi alla schermata Home**.
- **Android**: Chrome propone **Installa app** (oppure menu ⋮ → *Installa app*).

Le **notifiche sul telefono** si attivano da **Attività** (o Impostazioni) → *Notifiche su questo dispositivo*. Su iPhone servono iOS 16.4 o successivo e l'app aperta dalla schermata Home.

Dal pannello **Inviti e membri** l'amministratore può anche disattivare un link, nominare altri amministratori e **rimuovere** un membro (non vedrà più nulla; i suoi eventi restano; può essere riattivato).

---

## Facoltativo: accesso con Google

1. In [Google Cloud Console](https://console.cloud.google.com) → *APIs & Services → Credentials* → **Create credentials → OAuth client ID** (tipo *Web application*). Come *Authorized redirect URI* usa quello mostrato da Supabase in **Authentication → Providers → Google**.
2. Incolla Client ID e Client Secret in Supabase (Google provider) e attivalo.
3. Su Vercel aggiungi la variabile `NEXT_PUBLIC_GOOGLE_AUTH` = `true` e ripubblica (**Deployments → Redeploy**).

## Personalizzare

- **Nome**: variabili `NEXT_PUBLIC_APP_NAME` (predefinito *Club dei clubbers*) e `NEXT_PUBLIC_APP_SHORT_NAME` (il nome sotto l'icona, predefinito *Clubbers*) su Vercel, poi Redeploy.
- **Simbolo** (oggi provvisorio: la spunta verde): sostituisci `public/brand/mark.svg` con il nuovo disegno (SVG quadrato, fondo trasparente) e lancia `npm run icons`, che rigenera le icone dell'app in `public/icons`. Nell'app il simbolo viene preso da quello stesso file.
- **Città**: la città proposta per i nuovi eventi è *Roma*; si cambia con `NEXT_PUBLIC_DEFAULT_CITY`. Per aggiungere un'altra città basta scriverla nel campo Città di un evento: la scelta della città compare da sola.
- **Categorie**: `lib/categories.ts` (aggiornare anche il controllo `category in (...)` in `supabase/schema.sql`).

## Sviluppo sul computer

```bash
npm install
cp .env.example .env.local   # e inserisci le chiavi di Supabase
npm run dev                  # http://localhost:3000
npm run typecheck
npm run icons                # rigenera le icone da public/brand/mark.svg
```

## Buono a sapersi

- **Piano gratuito di Supabase**: 500 MB di database e 1 GB di immagini (le locandine vengono ridotte sul telefono prima del caricamento, quindi bastano per migliaia di eventi). Un progetto gratuito **si mette in pausa dopo 7 giorni senza alcun utilizzo**: basta riattivarlo dalla dashboard.
- Rieseguire `supabase/schema.sql` è sicuro: non cancella dati.
- Le chiavi per le notifiche push vengono generate automaticamente al primo uso e salvate in una tabella privata del database.

## Struttura

```
app/                 schermate (bacheca, evento, calendario, profilo, admin, accesso) e API
  api/link-preview   legge i link degli eventi (con protezioni di sicurezza)
  api/push           invio notifiche push
  api/eventi/[id]/ics  file per il calendario
  fonts/             Archivo (carattere dei titoli, licenza OFL)
components/          interfaccia (card, lista, partecipazione, messaggi, modulo evento…)
lib/                 dati, date in italiano, città, immagini, notifiche, calendario
public/brand/        simbolo dell'app (mark.svg)
public/icons/        icone generate da `npm run icons`
public/sw.js         service worker (installazione, push, pagina offline)
scripts/icons.mjs    genera le icone dal simbolo
supabase/schema.sql  database, sicurezza, notifiche automatiche, archivio immagini
proxy.ts             sessione e accesso alle pagine
DESIGN.md            sistema di design "In lista"
PRODUCT.md           a chi serve l'app e cosa deve fare
.impeccable/         contratto di design e dati per la skill impeccable
.claude/             skill e agenti impeccable per Claude Code
```
