/**
 * social-icon.ts — platform name -> SF Symbol name lookup for social link
 * rows on the Person detail screen. Reuses expo-symbols' SymbolView (already
 * the app's icon mechanism — see app-tabs.web.tsx, collapsible.tsx,
 * explore.tsx) rather than adding an icon package. SF Symbols has no actual
 * third-party brand marks (Apple doesn't ship Instagram/Twitter/etc. logos),
 * so each entry is a generic pictograph that evokes the platform; anything
 * unrecognized falls back to a plain link glyph.
 */

import type { SFSymbol } from 'sf-symbols-typescript';

const PLATFORM_SYMBOL: Record<string, SFSymbol> = {
  instagram: 'camera',
  twitter: 'bubble.left',
  x: 'bubble.left',
  facebook: 'person.2',
  linkedin: 'briefcase',
  tiktok: 'music.note',
};

/** Case/whitespace-insensitive lookup; unrecognized platforms get a generic link glyph. */
export function symbolNameForPlatform(platform: string): SFSymbol {
  const key = platform.trim().toLowerCase();
  return PLATFORM_SYMBOL[key] ?? 'link';
}
