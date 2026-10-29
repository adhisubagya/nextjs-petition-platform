export type Petition = {
  id: string;
  title: string;
  description: string;
  goal: number;
  signatureCount: number;
};

export type Comment = {
  id: string;
  name: string;
  message: string;
  avatarUrl: string | null;
  pinned: boolean;
  createdAt: string; // ISO 8601, serialisable across the server/client boundary
};
