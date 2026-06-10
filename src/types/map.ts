// src/types/map.ts

export interface SimpleUser {
  id: string;
  name: string | null;
  image: string | null;
}

export interface CollabUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface Collaborator {
  id: string;
  role: "MEMBER" | "VIEWER";
  user: CollabUser;
}

export interface PinStub {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  tripDate: string | null;
  participants: string[];
  createdBy: SimpleUser;
  _count: { entries: number; media: number };
}

export interface MapData {
  id: string;
  title: string;
  description: string | null;
  owner: SimpleUser;
  collaborators: Collaborator[];
  pins: PinStub[];
}

export interface PinEntry {
  id: string;
  content: string;
}

export interface Media {
  id: string;
  fileUrl: string;
  fileType: "IMAGE" | "VIDEO";
}

export interface PinFull {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  createdAt: string;
  tripDate: string | null;
  participants: string[];
  createdBy: SimpleUser;
  entries: PinEntry[];
  media: Media[];
}