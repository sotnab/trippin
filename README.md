# Trippin — Collaborative Travel Map Web Application

**Trippin** is a full-stack web application that lets friends co-create custom world maps, drop interactive pins for trips they've taken together, attach photo/video galleries to each pin, and manage fine-grained collaborative access control.

---

## 1. Tech Stack & Infrastructure

* **Framework:** Next.js 14 (App Router, TypeScript, Tailwind CSS)
* **Database:** PostgreSQL via **Prisma ORM**
* **Authentication:** **NextAuth.js (Auth.js)** with Google and GitHub OAuth, using **database sessions** (not JWT — see note below)
* **Maps API:** Mapbox GL JS, **Standard style** with a `dusk` light preset for a dark theme that retains outdoor POIs, peaks, and trail labels
* **Media Storage:** **Cloudflare R2** (S3-compatible object storage) — replaced the original local Docker-volume approach
* **Local Dev Database:** PostgreSQL via Docker Compose

### Why database sessions, not JWT

The project briefly used JWT session strategy to debug a redirect loop, but the loop was actually caused by a misconfigured `signIn`/`jwt` callback chain, not the session strategy itself. Database sessions were restored because they allow instant session invalidation and don't require duplicating user data into a signed token. If you ever hit a redirect loop after changing `auth.ts` or the `User` schema, it is almost always a **stale `next-auth.session-token` cookie** issue — clear cookies for `localhost:3000` and restart the dev server before assuming the code is broken.

---

## 2. Database Schema (Prisma)

```prisma
enum UserRole {
  ADMIN
  USER
}

model User {
  id            String         @id @default(cuid())
  name          String?
  email         String?        @unique
  emailVerified DateTime?
  image         String?
  role          UserRole       @default(USER)

  accounts       Account[]
  sessions       Session[]
  ownedMaps      Map[]          @relation("MapOwner")
  collaborations Collaborator[]
  createdPins    Pin[]
}

model Map {
  id            String         @id @default(cuid())
  title         String
  description   String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  ownerId       String
  owner         User           @relation("MapOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  collaborators Collaborator[]
  pins          Pin[]
}

enum CollaboratorRole {
  MEMBER
  VIEWER
}

model Collaborator {
  id     String           @id @default(cuid())
  mapId  String
  map    Map              @relation(fields: [mapId], references: [id], onDelete: Cascade)
  userId String
  user   User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   CollaboratorRole

  @@unique([mapId, userId])
}

model Pin {
  id           String     @id @default(cuid())
  mapId        String
  map          Map        @relation(fields: [mapId], references: [id], onDelete: Cascade)
  title        String
  description  String?
  lat          Float
  lng          Float
  tripDate     DateTime?
  participants String[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  createdById  String
  createdBy    User       @relation(fields: [createdById], references: [id])
  entries      PinEntry[]
  media        Media[]
}

model PinEntry {
  id        String   @id @default(cuid())
  pinId     String
  pin       Pin      @relation(fields: [pinId], references: [id], onDelete: Cascade)
  content   String   @db.Text
  createdAt DateTime @default(now())
}

enum MediaType {
  IMAGE
  VIDEO
}

model Media {
  id        String    @id @default(cuid())
  pinId     String
  pin       Pin       @relation(fields: [pinId], references: [id], onDelete: Cascade)
  fileUrl   String    // full public R2 URL, e.g. https://pub-xxx.r2.dev/pins/<pinId>/<uuid>.jpg
  fileType  MediaType
  createdAt DateTime  @default(now())
}
```

Changes from the original spec:
- **`Pin.tripDate`** — optional date of the trip, shown inline next to the pin title
- **`Pin.participants`** — plain string array of names (not linked to `User` records); manually entered, not app users
- **`PinEntry`** intentionally has no date shown in the UI — entries read as a running memory log, not a timestamped feed
- **`Media.fileUrl`** is now a full external R2 URL rather than a relative `/api/media/[filename]` path

---

## 3. Permissions & Access Control Matrix

| Feature Permission | System Admin | Map Creator (Owner) | Collaborator (MEMBER) | Collaborator (VIEWER) |
| --- | --- | --- | --- | --- |
| View Map, Pins & Media | ✅ | ✅ | ✅ | ✅ |
| **Create a new Map** | ✅ | ❌ | ❌ | ❌ |
| Add New Pins / Entries / Media | ✅ | ✅ | ✅ | ❌ |
| Edit / Delete Own Pins & Content | ✅ | ✅ | ✅ | ❌ |
| Delete Map Entirely | ✅ | ✅ | ❌ | ❌ |
| Manage Collaborators (Invite/Roles) | ✅ | ✅ | ❌ | ❌ |

### Key change from the original spec — map creation is admin-only

The original design let any authenticated user create a map and become its owner. **This has changed: only users with `UserRole.ADMIN` can create maps.** Once a map exists, the standard Owner / MEMBER / VIEWER hierarchy works exactly as before — an admin who creates a map is that map's Owner with full rights over it.

This is enforced in two places:
- **API:** `POST /api/maps` checks `session.user.role === "ADMIN"` and returns `403` otherwise
- **UI:** the "New Map" button on the dashboard is only rendered when `session.user.role === "ADMIN"`

### Promoting a user to Admin

There is still no UI or API endpoint to self-promote — this is intentional, to prevent privilege escalation. Promote via Prisma Studio:

```bash
npx prisma studio
```
Open the `User` table, find the row, change `role` from `USER` to `ADMIN`, save.

Or via SQL:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

---

## 4. Core Features

### 4.1. Authentication & Layout Protection

- Entire app sits behind an auth wall; unauthenticated requests redirect to `/login`.
- Google and GitHub OAuth, both with `allowDangerousEmailAccountLinking: true` so a person can sign in with either provider against the same email without hitting `OAuthAccountNotLinked`.
- Middleware checks for the presence of the `next-auth.session-token` (or `__Secure-` prefixed variant) cookie directly, rather than decoding a JWT — required because the project uses database sessions.

### 4.2. Dashboard & Map Management

- "My Maps" and "Shared with Me" sections.
- "New Map" creation button — **visible to admins only.**

### 4.3. User Search & Collaboration Suite

- Map owners search for any platform user by exact email and invite them as `MEMBER` or `VIEWER`.
- Role changes and removal are available from the same Map Settings panel.
- Map deletion ("danger zone") also lives in Map Settings, owner/admin only.

### 4.4. Interactive Map Component

- Full-screen Mapbox map using the **Standard style** with the `dusk` light preset — dark theme while retaining terrain, peaks, trails, and POI labels.
- Default centered on Poland.
- Clicking the map (for users with edit rights) opens an inline pin-creation form with Title, Description, **Trip Date**, and a free-text **Participants** field (comma-separated names — not tied to user accounts).
- Pins render as plain colored circular markers (no text label next to them, by design).

### 4.5. Pin Detail — Gallery-First Modal

This replaced the original sidebar design. Clicking a pin opens a **large modal covering most of the screen**, structured as:

- **Header:** title and trip date shown inline, participant names as individual pills, description below, delete button top-right (owners/members only)
- **Body:** a photo/video **gallery grid** is the primary content — clicking a photo opens a full-screen lightbox with keyboard arrow/Escape navigation
- **Notes & Memories:** a simple list of text entries below the gallery, with a single-line input + inline "Add" button (no per-entry timestamps shown)
- Each media tile has a hover-revealed delete button (✕) for users with edit rights

### 4.6. Media Storage — Cloudflare R2

Local Docker-volume storage was replaced with Cloudflare R2:

- Uploads go directly from the API route to R2 via `@aws-sdk/client-s3`, under the key pattern `pins/<pinId>/<uuid>.<ext>`
- `Media.fileUrl` stores the full public R2 URL — the rest of the app just renders `<img src={fileUrl}>` with no proxying needed
- Deleting a media item removes both the R2 object and the database row
- The old `/api/media/[filename]` streaming route and `/api/media/delete/[mediaId]` local-disk route were removed entirely, along with the `UPLOAD_DIR` env var and the Docker volume mapping

---

## 5. Environment Variables

```
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXT_PUBLIC_MAPBOX_TOKEN=

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

`UPLOAD_DIR` is no longer used.

---

## 6. Local Development

```bash
cp .env.example .env.local   # fill in values above
npm install
docker-compose up -d db      # Postgres only — media now lives on R2
npx prisma migrate dev
npm run dev
```

Then promote your own account to `ADMIN` via Prisma Studio before trying to create a map.

---

## 7. Codebase Structure (post-refactor)

```
src/
├── types/
│   ├── next-auth.d.ts     # Session/User type augmentation, includes role
│   └── map.ts              # shared Map/Pin/Media/Collaborator interfaces
├── hooks/
│   ├── usePinModal.ts      # pin fetch + entries/media actions
│   └── useMapMarkers.ts    # marker lifecycle on the Mapbox instance
├── components/
│   ├── user-menu.tsx
│   ├── media-gallery.tsx
│   ├── lightbox.tsx
│   └── create-pin-form.tsx
├── lib/
│   ├── auth.ts              # NextAuth config, database sessions
│   ├── permissions.ts       # getMapRole / canView / canEdit / canManage
│   ├── prisma.ts
│   └── r2.ts                # Cloudflare R2 (S3-compatible) client
└── app/
    ├── dashboard/
    ├── login/
    └── maps/[id]/
        ├── map-view.tsx
        ├── pin-sidebar.tsx   # now a full-screen gallery modal, not a sidebar
        └── map-settings.tsx
```

---

## 8. Implementation History (chronological)

```
Phase 1 — Environment setup, Docker Compose, Prisma schema
Phase 2 — NextAuth config, OAuth providers, layout protection
Phase 3 — Collaboration engine, user search, invite flow
Phase 4 — Mapbox integration, Pin CRUD, local media upload
Phase 5 — UX pass: trip date + participants on pins,
          gallery-first full-screen pin modal, media delete
Phase 6 — Admin/User role system — map creation restricted to admins
Phase 7 — Migrated media storage from local Docker volume to Cloudflare R2
```
