/**
 * Cloud Sync — Supabase real-time data synchronization
 *
 * Syncs localStorage data to Supabase for multi-device access.
 * Uses optimistic local-first approach: localStorage is always the source of truth,
 * Supabase is the persistence/sync layer.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';
const LS_SYNC_META = 'up_cloud_sync_meta';
const SYNC_TABLE = 'user_data';

let supabase = null;

function getClient() {
  if (!supabase && SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabase;
}

// ── Sync metadata ────────────────────────────────────────────────────────────

function getSyncMeta() {
  try {
    return JSON.parse(localStorage.getItem(LS_SYNC_META) || '{}');
  } catch { return {}; }
}

function setSyncMeta(meta) {
  try {
    localStorage.setItem(LS_SYNC_META, JSON.stringify(meta));
  } catch { /* ignore */ }
}

// ── Check if cloud sync is available ─────────────────────────────────────────

export function isCloudSyncAvailable() {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

export function getSyncStatus() {
  const meta = getSyncMeta();
  return {
    lastSync: meta.lastSync || null,
    enabled: meta.enabled !== false,
    deviceId: meta.deviceId || null,
  };
}

// ── Device ID ────────────────────────────────────────────────────────────────

function getDeviceId() {
  const meta = getSyncMeta();
  if (meta.deviceId) return meta.deviceId;
  const id = `device_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
  setSyncMeta({ ...meta, deviceId: id });
  return id;
}

// ── Push local data to cloud ─────────────────────────────────────────────────

export async function pushToCloud(userId, data) {
  const client = getClient();
  if (!client || !userId) return { ok: false, error: 'Cloud sync not configured' };

  try {
    const deviceId = getDeviceId();
    const payload = {
      user_id: userId,
      device_id: deviceId,
      data: JSON.stringify(data),
      updated_at: new Date().toISOString(),
      version: Date.now(),
    };

    const { error } = await client
      .from(SYNC_TABLE)
      .upsert(payload, { onConflict: 'user_id' });

    if (error) throw error;

    setSyncMeta({
      ...getSyncMeta(),
      lastSync: new Date().toISOString(),
      lastPush: new Date().toISOString(),
    });

    return { ok: true };
  } catch (err) {
    console.warn('[CloudSync] Push failed:', err);
    return { ok: false, error: err.message };
  }
}

// ── Pull remote data from cloud ───────────────────────────────────��──────────

export async function pullFromCloud(userId) {
  const client = getClient();
  if (!client || !userId) return { ok: false, error: 'Cloud sync not configured' };

  try {
    const { data, error } = await client
      .from(SYNC_TABLE)
      .select('data, updated_at, version, device_id')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { ok: true, data: null }; // No data yet
      throw error;
    }

    const parsed = JSON.parse(data.data);
    const meta = getSyncMeta();

    setSyncMeta({
      ...meta,
      lastSync: new Date().toISOString(),
      lastPull: new Date().toISOString(),
      remoteVersion: data.version,
      remoteDevice: data.device_id,
    });

    return {
      ok: true,
      data: parsed,
      updatedAt: data.updated_at,
      version: data.version,
      fromDevice: data.device_id,
    };
  } catch (err) {
    console.warn('[CloudSync] Pull failed:', err);
    return { ok: false, error: err.message };
  }
}

// ── Auto-sync with conflict resolution ───────────────────────────────────────

/**
 * Sync data between local and cloud.
 * Strategy: Last-write-wins by timestamp, per-device tracking.
 *
 * Returns { action: 'pushed'|'pulled'|'conflict'|'noop', data?: object }
 */
export async function autoSync(userId, localData) {
  if (!isCloudSyncAvailable() || !userId) {
    return { action: 'noop', reason: 'not configured' };
  }

  try {
    // Pull remote state
    const remote = await pullFromCloud(userId);
    if (!remote.ok) return { action: 'noop', reason: remote.error };

    const deviceId = getDeviceId();

    // No remote data — push local
    if (!remote.data) {
      await pushToCloud(userId, localData);
      return { action: 'pushed' };
    }

    // Remote data exists — compare versions
    const meta = getSyncMeta();
    const localVersion = meta.localVersion || 0;
    const remoteVersion = remote.version || 0;

    // If remote is from this device, push local (we're the author)
    if (remote.fromDevice === deviceId) {
      if (localVersion > remoteVersion) {
        await pushToCloud(userId, localData);
        return { action: 'pushed' };
      }
      return { action: 'noop', reason: 'up to date' };
    }

    // Remote is from different device — pull if newer
    if (remoteVersion > localVersion) {
      return { action: 'pulled', data: remote.data };
    }

    // Local is newer — push
    await pushToCloud(userId, localData);
    return { action: 'pushed' };
  } catch (err) {
    console.warn('[CloudSync] Auto-sync failed:', err);
    return { action: 'noop', reason: err.message };
  }
}

// ── Toggle sync ──────────────────────────────────────────────────────────────

export function enableSync() {
  setSyncMeta({ ...getSyncMeta(), enabled: true });
}

export function disableSync() {
  setSyncMeta({ ...getSyncMeta(), enabled: false });
}

// ── Real-time subscription ───────────────────────────────────────────────────

export function subscribeToChanges(userId, onUpdate) {
  const client = getClient();
  if (!client || !userId) return null;

  const channel = client
    .channel('user-data-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: SYNC_TABLE,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const deviceId = getDeviceId();
        // Only process changes from other devices
        if (payload.new.device_id !== deviceId) {
          try {
            const data = JSON.parse(payload.new.data);
            onUpdate(data, payload.new.updated_at);
          } catch { /* ignore parse errors */ }
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
