# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A private group of friends in Rome, more than 40 people, who go out together. They use the app on their phones, installed on the home screen, mostly to plan the week's outings and to coordinate on the night itself. Members enter only through an invite created by an administrator.

## Product Purpose

Club dei clubbers is the group's private board of what is happening in the city: anyone posts an event they found (a club night, techno, a concert, an aperitivo, a festival, an exhibition, a restaurant, a cultural event), everyone says whether they are in, and they organise together underneath it. Success means a member can see in seconds what is on and who is going, answer with one tap, and sort out lifts, tickets and meeting points without leaving the event.

## Positioning

It is not a public event listing and not a group chat. Every event is chosen by someone in the group, and the answer that matters is who among your friends is going. Attendance (Partecipo / Forse / Non partecipo, with guests) is the primary piece of information on every event, ahead of the venue's own marketing.

## Operating Context

- Events arrive as links copied from Instagram, Facebook, Dice, Eventbrite, Resident Advisor or a venue's site, and as poster images or screenshots; the app reads a pasted link and pre-fills the event.
- Members check the board during the week to plan, and open a single event on the night for the address, the time and the chat.
- Coordination happens in the comments of each event (who drives, who has tickets, where to meet); sharing out happens on WhatsApp.
- The group is based in Rome today; more cities must be addable later (each event already carries a city).

## Capabilities and Constraints

- Invite-only access with email and password or Google; administrators invite, promote and remove members; no public content.
- Events: poster or image, external link, title, optional description, venue and address, city, date and time (optionally an end, across midnight or several days), category.
- RSVP with Partecipo / Forse / Non partecipo, changeable at any time, with up to 10 guests; every event shows who confirmed, who is undecided, how many people are coming and the full list of names.
- Board sections: what you are going to, this weekend, most followed, recently proposed, upcoming; filters by date and category; search; shared calendar; archive of past events; saved events; likes; add to personal calendar; share to WhatsApp.
- Profiles with name or nickname, photo, events proposed, events attended.
- Notifications in the app and as push for new events, new comments and replies, important changes (time, place, cancellation) and friends confirming the same event.
- Stack: Next.js 16 (React 19) with Tailwind CSS 4 on Vercel; Supabase for Postgres with row-level security, auth, private image storage and realtime. Installable PWA for iPhone, Android and desktop.
- Interface language: Italian.

## Brand Commitments

- Name: "Club dei clubbers" (short name "Clubbers").
- The symbol is not decided yet; it will be designed later, so the mark must stay swappable from one source file without touching the rest of the identity.
- The original brief asks for a dark theme by default, posters clearly visible, navigation through a bottom bar, light and smooth animations, and a product that feels professional rather than amateur.

## Evidence on Hand

No real events, photos or members yet. Demonstration content used for screenshots is synthetic and must not ship as real data.

## Product Principles

1. Who is going comes first: attendance is the headline of every event.
2. One tap to answer, and the answer can always change.
3. The posters are the content: show them whole, never bury them under interface.
4. Organising stays inside the event: chat, lifts and tickets live with the event they belong to.
5. Private by construction: nothing is visible outside the group.

## Accessibility & Inclusion

Used on phones at night, often outdoors or in dark venues: legible type at arm's length, strong contrast, large touch targets, no information carried by colour alone (each RSVP state is also labelled), and reduced motion respected.
