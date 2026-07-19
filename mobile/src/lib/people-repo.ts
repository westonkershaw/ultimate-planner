/**
 * people-repo.ts — typed Supabase access for the People tab. Every function
 * returns { data, error: string | null } so callers never have to branch on
 * thrown exceptions. Row <-> model mapping goes through personFromRow
 * (people-types.ts) — never read snake_case fields outside this file.
 */

import { supabase } from '@/lib/supabase';

import type { Category, Person, PersonRow, RelationshipStatus, SocialLink } from './people-types';
import { personFromRow } from './people-types';

export interface Result<T> {
  data: T | null;
  error: string | null;
}

export interface CreatePersonInput {
  name: string;
  photoUrl?: string | null;
  category?: Category;
  relationshipStatus?: RelationshipStatus | null;
  weddingDate?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  socialLinks?: SocialLink[];
  latitude?: number | null;
  longitude?: number | null;
  birthday?: string | null;
}

export interface UpdatePersonPatch {
  name?: string;
  photoUrl?: string | null;
  category?: Category;
  relationshipStatus?: RelationshipStatus | null;
  weddingDate?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  socialLinks?: SocialLink[];
  latitude?: number | null;
  longitude?: number | null;
  birthday?: string | null;
}

/** All of the signed-in user's people, alphabetical by name. */
export async function listPeople(): Promise<Result<Person[]>> {
  const { data, error } = await supabase.from('people').select('*').order('name', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: (data as PersonRow[]).map(personFromRow), error: null };
}

export async function createPerson(input: CreatePersonInput): Promise<Result<Person>> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { data: null, error: userError?.message ?? 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('people')
    .insert({
      user_id: userData.user.id,
      name: input.name,
      photo_url: input.photoUrl ?? null,
      category: input.category ?? 'friend',
      relationship_status: input.relationshipStatus ?? null,
      wedding_date: input.weddingDate ?? null,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      social_links: input.socialLinks ?? [],
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      birthday: input.birthday ?? null,
    })
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: personFromRow(data as PersonRow), error: null };
}

export async function updatePerson(id: string, patch: UpdatePersonPatch): Promise<Result<Person>> {
  const row: Partial<PersonRow> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.relationshipStatus !== undefined) row.relationship_status = patch.relationshipStatus;
  if (patch.weddingDate !== undefined) row.wedding_date = patch.weddingDate;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.socialLinks !== undefined) row.social_links = patch.socialLinks;
  if (patch.latitude !== undefined) row.latitude = patch.latitude;
  if (patch.longitude !== undefined) row.longitude = patch.longitude;
  if (patch.birthday !== undefined) row.birthday = patch.birthday;

  const { data, error } = await supabase.from('people').update(row).eq('id', id).select('*').single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: personFromRow(data as PersonRow), error: null };
}

/** Hard delete. */
export async function deletePerson(id: string): Promise<Result<null>> {
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: null, error: null };
}

/** Updates ONLY category — must not touch relationship_status/wedding_date. */
export async function setCategory(id: string, category: Category): Promise<Result<Person>> {
  const { data, error } = await supabase
    .from('people')
    .update({ category })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: personFromRow(data as PersonRow), error: null };
}

/** Marks a person as contacted right now. */
export async function logContact(id: string): Promise<Result<Person>> {
  const { data, error } = await supabase
    .from('people')
    .update({ last_contact_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: personFromRow(data as PersonRow), error: null };
}
