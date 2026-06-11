# Trippin — Collaborative Travel Map Web Application

**Trippin** is a full-stack, production-ready web application designed to allow friends to co-create custom world maps, drop interactive pins, share rich media memories (images and videos), and manage precise, multi-tiered collaborative access control.

---

## 1. Tech Stack & Infrastructure

The application is built using a modern, scalable, and type-safe ecosystem designed for easy containerization and deployment.

* **Framework:** Next.js 14+ utilizing the **App Router**, TypeScript, and Tailwind CSS for rapid UI development.
* **Database:** PostgreSQL managed via **Prisma ORM** for type-safe schema modeling and queries.
* **Authentication:** **NextAuth.js (Auth.js)** integrated with Google and GitHub OAuth providers.
* **Maps API:** **Mapbox GL JS** implemented via native React integration or wrappers, utilizing free-tier access tokens.
* **Media Storage (Docker-Safe):** To prevent data loss in volatile container layers, media files are stored outside the Next.js `public` directory.
* Files are written to a path defined by the `UPLOAD_DIR` environment variable, mapping directly to a persistent **Docker Volume** (e.g., `/app/uploads`).
* A secure API streaming route at `app/api/media/[filename]/route.ts` utilizes native Node.js `fs` to stream assets back to the client with strict path-traversal protection and appropriate mime-type headers.



---

## 2. Database Schema (Prisma)

The application relies on a relational PostgreSQL database structure. The core models and relationships are defined as follows:

```prisma
// Core NextAuth.js User Model
model User {
  id            String         @id @default(cuid())
  name          String?
  email         String?        @unique // Indexed for user search functionality
  image         String?
  role          UserRole       @default(USER) // Base platform role
  accounts      Account[]
  sessions      Session[]
  ownedMaps     Map[]          @relation("MapOwner")
  collaborations Collaborator[]
  createdPins   Pin[]
}

enum UserRole {
  ADMIN
  USER
}

// Map Container
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

// Access Control Joint Table for Map Collaboration
model Collaborator {
  id            String         @id @default(cuid())
  mapId         String
  map           Map            @relation(fields: [mapId], references: [id], onDelete: Cascade)
  userId        String
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  role          CollaboratorRole

  @@unique([mapId, userId])
}

enum CollaboratorRole {
  MEMBER
  VIEWER
}

// Interactive Map Pins
model Pin {
  id            String         @id @default(cuid())
  mapId         String
  map           Map            @relation(fields: [mapId], references: [id], onDelete: Cascade)
  title         String
  description   String?
  lat           Float
  lng           Float
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  createdById   String
  createdBy     User           @relation(fields: [createdById], references: [id])
  entries       PinEntry[]
  media         Media[]
}

// Chronological Text Logs for Pins
model PinEntry {
  id            String         @id @default(cuid())
  pinId         String
  pin           Pin            @relation(fields: [pinId], references: [id], onDelete: Cascade)
  content       String         @db.Text
  createdAt     DateTime       @default(now())
}

// Media Assets Attached to Pins
model Media {
  id            String         @id @default(cuid())
  pinId         String
  pin           Pin            @relation(fields: [pinId], references: [id], onDelete: Cascade)
  fileUrl       String
  fileType      MediaType
  createdAt     DateTime       @default(now())
}

enum MediaType {
  IMAGE
  VIDEO
}

```

---

## 3. Permissions & Access Control Matrix

The platform enforces strict server-side validation alongside client-side state management based on three distinct map-level tiers and a global system administrator tier.

| Feature Permission | System Admin | Map Creator (Owner) | Collaborator (MEMBER) | Collaborator (VIEWER) |
| --- | --- | --- | --- | --- |
| View Map, Pins & Media | ✅ | ✅ | ✅ | ✅ |
| Add New Pins / Entries / Media | ✅ | ✅ | ✅ | ❌ |
| Edit / Delete Own Pins & Content | ✅ | ✅ | ✅ | ❌ |
| Delete Map Entirely | ✅ | ✅ | ❌ | ❌ |
| Manage Collaborators (Invite/Roles) | ✅ | ✅ | ❌ | ❌ |

### ⚠️ Critical Administrative Note

To maintain absolute security and prevent privilege escalation vulnerabilities, **there is no client-facing UI or API endpoint to grant a user global Administrator status (`UserRole.ADMIN`)**.

Promoting a standard user to a system administrator must be done directly through the database layer using **Prisma Studio** or a Prisma script:

```bash
# To open the visual database editor and manually change a user's role:
npx prisma studio

```

---

## 4. Core Features

### 4.1. Authentication & Layout Protection

* **Global Auth Wall:** The entire application sits behind an authentication guard. Unauthenticated sessions are instantly redirected to a unified gateway login screen.
* **OAuth Providers:** Users can authenticate via standard Google or GitHub single sign-on (SSO).

### 4.2. Dashboard & Map Management

* **Centralized Hub:** A clean dashboard split into two primary views: **"My Maps"** (projects created by the user) and **"Shared with Me"** (maps where the user has been granted `MEMBER` or `VIEWER` access).
* **Creation Wizard:** Fast inline map creation requiring only a Title and an optional Description.

### 4.3. User Search & Collaboration Suite

* **Targeted User Discovery:** Authenticated users have access to an internal search endpoint to find active users by typing their exact email address.
* **Permission Delegation:** Inside the Map Settings panel, owners can look up users, assign them a specific role (`MEMBER` or `VIEWER`), and add them to the map's direct collaborator pool.

### 4.4. Interactive Map Component

* **Full-Screen Mapbox Canvas:** Implements a highly responsive Mapbox GL JS map engine.
* **Geolocated Pin Placement:** Clicking or long-pressing anywhere on the canvas captures precise GPS coordinates ($lat$, $lng$) and prompts a creation modal.
* **Contextual Sidebars:** Map markers represent dropped pins; clicking a marker shifts focus to a rich contextual sidebar detailing that specific location.

### 4.5. Rich Pin Entries & Local Media Upload

* **Memories Feed:** Each pin hosts a chronological timeline feed of text entries, allowing friends to log ongoing memories at specific locations.
* **Multipart Media Uploads:** Users can drag and drop multiple images or videos directly to a pin.
* **Secure API Pipeline:** Uploaded assets pass to a local storage backend handler. The file is renamed uniquely, written directly to the Docker-mounted `UPLOAD_DIR`, and cataloged in the database via an isolated `/api/media/[filename]` proxy stream.

---

## 5. System Implementation & Architecture Roadmap

The implementation of the system is broken down into the following structured lifecycle phases:

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: Environment Setup & Docker Containers         │
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 2: Prisma Modeling & DB Migrations               │
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 3: NextAuth Config & Global Layout Security      │
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 4: Collaboration Engine & User Search Lookup     │
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 5: Interactive Mapbox Elements & Pin CRUD        │
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 6: Persistent Docker Media Upload/Stream Service  │
└────────────────────────────────────────────────────────┘

```
