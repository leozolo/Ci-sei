# Ci sei?

La bacheca privata degli eventi per il vostro gruppo di amici: qualcuno pubblica una serata, una mostra o una cena, gli altri rispondono **Partecipo / Forse / Non partecipo**, si organizzano nei messaggi e ricevono le notifiche sul telefono.

È una **PWA**: si installa sulla schermata Home di iPhone e Android senza passare dagli store, e funziona anche da computer.

## Cosa fa

- **Eventi** con locandina, link (Instagram, Dice, Eventbrite, Resident Advisor…), titolo, descrizione, luogo, indirizzo, data/ora e categoria. Incollando il link, l'app prova a compilare da sola titolo, data, luogo e locandina.
- **Partecipazione**: Partecipo / Forse / Non partecipo, modificabile in ogni momento, con eventuali ospiti ("porto 2 amici"). Ogni evento mostra quante persone arrivano, chi ha confermato, chi è indeciso e chi non ha ancora risposto (tocca i numeri per l'elenco dei nomi).
- **Bacheca** a sezioni: Ci vai, Questo weekend, I più seguiti, Proposti da poco, Prossimi eventi; filtri per data e categoria.
- **Messaggi** sotto ogni evento con risposte, **mi piace**, **salvati**.
- **Notifiche** (nell'app in tempo reale e push sul telefono) per nuovi eventi, nuovi messaggi, cambi di data/ora/luogo, annullamenti e amici che confermano la partecipazione. Ognuno può scegliere quali ricevere.
- **Calendario** del gruppo, **ricerca**, **archivio** degli eventi passati, **aggiungi al calendario** (iPhone/Outlook/Google), **condividi su WhatsApp**.
- **Profili** con foto, eventi proposti, partecipazioni e salvati.
- **Accesso privato**: registrazione solo con link d'invito, accesso con email e password (o Google). Gli amministratori creano e disattivano gli inviti, rimuovono o riattivano i membri.
- Tema scuro (predefinito), chiaro o come il telefono.

## Tecnologia

Next.js 16 (React 19) + Tailwind CSS 4 sul frontend; Supabase per database Postgres, autenticazione, archivio immagini e tempo reale. La sicurezza è nel database: ogni tabella ha regole (Row Level Security) che mostrano i dati **solo ai membri attivi del gruppo**; le immagini stanno in archivi privati.

---

## Pubblicarla online (circa 20 minuti, gratis)

Servono tre account gratuiti: **Supabase** (database), **GitHub** (dove sta il codice) e **Vercel** (che pubblica l'app). Conviene farlo da computer.

### 1. Crea il database su Supabase

1. Vai su [supabase.com](https://supabase.com) → **New project**. Scegli un nome, una password del database e la regione **Central EU (Frankfurt)**.
2. Quando il progetto è pronto apri **SQL Editor** → **New query**, incolla tutto il contenuto del file `supabase/schema.sql` e premi **Run**. Deve comparire "Success".
3. Vai su **Authentication → Sign In / Providers → Email** e **disattiva "Confirm email"**, poi salva.
   *Perché:* il servizio email gratuito di Supabase spedisce pochissime email all'ora; gli inviti proteggono già l'accesso.
4. Vai su **Project Settings → API Keys** (o il pulsante **Connect**) e tieni a portata di mano:
   - **Project URL** (es. `https://abcd1234.supabase.co`)
   - **Publishable key** (`sb_publishable_…`; nei progetti vecchi si chiama *anon*)
   - **Secret key** (`sb_secret_…`; nei progetti vecchi *service_role*). È segreta: non condividerla.

### 2. Metti il codice su GitHub

1. Su [github.com](https://github.com) crea un nuovo repository **privato** (es. `ci-sei`).
2. Scegli **uploading an existing file** e trascina dentro **il contenuto** della cartella del progetto (tutte le cartelle e i file, non la cartella stessa). Conferma con **Commit changes**.

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

1. Apri **Profilo → ⚙️ Impostazioni → Inviti e membri**.
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

- Nome dell'app: variabile `NEXT_PUBLIC_APP_NAME` su Vercel (predefinito: *Ci sei?*), poi Redeploy.
- Categorie: `lib/categories.ts` (aggiornare anche il controllo `category in (...)` in `supabase/schema.sql`).

## Sviluppo sul computer

```bash
npm install
cp .env.example .env.local   # e inserisci le chiavi di Supabase
npm run dev                  # http://localhost:3000
npm run typecheck
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
components/          interfaccia (card, partecipazione, messaggi, modulo evento…)
lib/                 dati, date in italiano, immagini, notifiche, calendario
public/sw.js         service worker (installazione, push, pagina offline)
supabase/schema.sql  database, sicurezza, notifiche automatiche, archivio immagini
proxy.ts             sessione e accesso alle pagine
```
