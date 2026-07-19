/**
 * people-types.ts — camelCase domain models for the People tab, plus the
 * typed snake_case Row shapes returned by Supabase and the mappers between
 * them. Mirrors supabase/migrations/20260719090000_people.sql exactly.
 */

export const CATEGORIES = ['friend', 'family', 'dating'] as const;
export type Category = (typeof CATEGORIES)[number];

export const RELATIONSHIP_STATUSES = [
  'past',
  'interested',
  'dating',
  'engaged',
  'newlywed',
  'married',
] as const;
export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number];

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Person {
  id: string;
  userId: string;
  name: string;
  photoUrl: string | null;
  category: Category;
  relationshipStatus: RelationshipStatus | null;
  weddingDate: string | null; // YYYY-MM-DD, nullable
  address: string | null;
  phone: string | null;
  email: string | null;
  socialLinks: SocialLink[];
  latitude: number | null;
  longitude: number | null;
  lastContactAt: string | null; // ISO timestamp
  birthday: string | null; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

/** Raw `people` row shape as returned by Supabase (snake_case). */
export interface PersonRow {
  id: string;
  user_id: string;
  name: string;
  photo_url: string | null;
  category: Category;
  relationship_status: RelationshipStatus | null;
  wedding_date: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  social_links: unknown;
  latitude: number | null;
  longitude: number | null;
  last_contact_at: string | null;
  birthday: string | null;
  created_at: string;
  updated_at: string;
}

/** Defensive jsonb -> SocialLink[] coercion: anything not an array becomes []. */
function socialLinksFromJson(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SocialLink =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).platform === 'string' &&
      typeof (item as Record<string, unknown>).url === 'string'
  );
}

export function personFromRow(row: PersonRow): Person {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    photoUrl: row.photo_url,
    category: row.category,
    relationshipStatus: row.relationship_status,
    weddingDate: row.wedding_date,
    address: row.address,
    phone: row.phone,
    email: row.email,
    socialLinks: socialLinksFromJson(row.social_links),
    latitude: row.latitude,
    longitude: row.longitude,
    lastContactAt: row.last_contact_at,
    birthday: row.birthday,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
