/**
 * Simple in-memory cache with per-key TTL.
 *
 * Used to avoid redundant DynamoDB reads for data that changes only when
 * the GA4 sync runs (every N minutes).
 */

import { config } from "../config";

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Date.now() + ttl
}

const store = new Map<string, CacheEntry<unknown>>();

// ─── Stats ──────────────────────────────────────────────────────────────────

let hits = 0;
let misses = 0;

// ─── Public API ─────────────────────────────────────────────────────────────

export function get<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) {
    misses++;
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    misses++;
    return null;
  }
  hits++;
  return entry.value as T;
}

export function set<T>(key: string, value: T, ttlMs?: number): void {
  const ttl = ttlMs ?? config.cacheTtlMs;
  store.set(key, { value, expiresAt: Date.now() + ttl });
}

export function invalidate(key: string): void {
  store.delete(key);
}

export function invalidateAll(): void {
  store.clear();
}

export function getStats(): {
  size: number;
  hits: number;
  misses: number;
  hitRate: string;
} {
  const total = hits + misses;
  return {
    size: store.size,
    hits,
    misses,
    hitRate: total === 0 ? "0%" : `${((hits / total) * 100).toFixed(1)}%`,
  };
}
