/**
 * Lakbay Church Color Themes
 * Curated sets of Tailwind classes to ensure a premium look across the app.
 */

export interface ChurchTheme {
  id: string;
  name: string;
  bg: string;      // Background (Lighter)
  text: string;    // Text color
  border: string;  // Border color
  vibrant: string; // Saturated color for indicators/legends
}

export const LAKBAY_THEMES: ChurchTheme[] = [
  { id: 'blue', name: 'Ocean Blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', vibrant: 'bg-blue-500' },
  { id: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', vibrant: 'bg-emerald-500' },
  { id: 'purple', name: 'Royal Purple', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', vibrant: 'bg-purple-500' },
  { id: 'amber', name: 'Amber Gold', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', vibrant: 'bg-amber-500' },
  { id: 'rose', name: 'Rose Petal', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', vibrant: 'bg-rose-500' },
  { id: 'indigo', name: 'Deep Indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', vibrant: 'bg-indigo-500' },
  { id: 'cyan', name: 'Sky Cyan', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100', vibrant: 'bg-cyan-500' },
  { id: 'orange', name: 'Sunset Orange', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', vibrant: 'bg-orange-500' },
  { id: 'lime', name: 'Fresh Lime', bg: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-100', vibrant: 'bg-lime-500' },
  { id: 'pink', name: 'Bubblegum Pink', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100', vibrant: 'bg-pink-500' },
  { id: 'teal', name: 'Tropical Teal', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', vibrant: 'bg-teal-500' },
  { id: 'fuchsia', name: 'Fuchsia Flash', bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-100', vibrant: 'bg-fuchsia-500' },
  { id: 'sky', name: 'Clear Sky', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100', vibrant: 'bg-sky-500' },
  { id: 'red', name: 'Power Red', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', vibrant: 'bg-red-500' },
  { id: 'green', name: 'Forest Green', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', vibrant: 'bg-green-500' },
  { id: 'yellow', name: 'Sunny Yellow', bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-100', vibrant: 'bg-yellow-500' },
  { id: 'violet', name: 'Deep Violet', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100', vibrant: 'bg-violet-500' },
  { id: 'slate', name: 'Cool Slate', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', vibrant: 'bg-slate-500' },
  { id: 'stone', name: 'River Stone', bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-100', vibrant: 'bg-stone-500' },
  { id: 'deep-blue', name: 'Deep Sea', bg: 'bg-blue-900', text: 'text-white', border: 'border-blue-700', vibrant: 'bg-blue-800' },
  { id: 'deep-emerald', name: 'Deep Forest', bg: 'bg-emerald-900', text: 'text-white', border: 'border-emerald-700', vibrant: 'bg-emerald-800' },
  { id: 'deep-purple', name: 'Deep Royal', bg: 'bg-purple-900', text: 'text-white', border: 'border-purple-700', vibrant: 'bg-purple-800' },
  { id: 'deep-red', name: 'Deep Crimson', bg: 'bg-red-900', text: 'text-white', border: 'border-red-700', vibrant: 'bg-red-800' },
  { id: 'deep-orange', name: 'Deep Sunset', bg: 'bg-orange-900', text: 'text-white', border: 'border-orange-700', vibrant: 'bg-orange-800' },
  { id: 'deep-teal', name: 'Deep Lagoon', bg: 'bg-teal-900', text: 'text-white', border: 'border-teal-700', vibrant: 'bg-teal-800' },
  { id: 'deep-rose', name: 'Deep Ruby', bg: 'bg-rose-900', text: 'text-white', border: 'border-rose-700', vibrant: 'bg-rose-800' },
  { id: 'deep-indigo', name: 'Midnight', bg: 'bg-indigo-900', text: 'text-white', border: 'border-indigo-700', vibrant: 'bg-indigo-800' },
  { id: 'charcoal', name: 'Charcoal', bg: 'bg-gray-800', text: 'text-white', border: 'border-gray-600', vibrant: 'bg-gray-900' },
  { id: 'zinc', name: 'Silver Zinc', bg: 'bg-zinc-200', text: 'text-zinc-800', border: 'border-zinc-400', vibrant: 'bg-zinc-600' },
  { id: 'stone-dark', name: 'Dark Stone', bg: 'bg-stone-800', text: 'text-stone-100', border: 'border-stone-600', vibrant: 'bg-stone-900' },
  { id: 'sky-deep', name: 'Deep Sky', bg: 'bg-sky-900', text: 'text-white', border: 'border-sky-700', vibrant: 'bg-sky-800' },
  { id: 'lime-deep', name: 'Deep Lime', bg: 'bg-lime-900', text: 'text-white', border: 'border-lime-700', vibrant: 'bg-lime-800' },
  { id: 'pink-deep', name: 'Deep Pink', bg: 'bg-pink-900', text: 'text-white', border: 'border-pink-700', vibrant: 'bg-pink-800' },
  { id: 'gray-dark', name: 'Dark Gray', bg: 'bg-gray-700', text: 'text-white', border: 'border-gray-500', vibrant: 'bg-gray-800' },
  { id: 'orange-light', name: 'Light Orange', bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300', vibrant: 'bg-orange-400' }
];

/**
 * Gets the color classes for a church, with support for manual overrides.
 */
export const getChurchColor = (church: string, churchColors?: Record<string, string>) => {
  if (!church) return 'bg-gray-100 text-gray-600 border-gray-200';

  // 1. Check for manual override (Case-insensitive & Trimmed)
  if (churchColors) {
    const normalizedTarget = church.toLowerCase().trim();
    const matchKey = Object.keys(churchColors).find(k => k.toLowerCase().trim() === normalizedTarget);
    
    if (matchKey) {
      const theme = LAKBAY_THEMES.find(t => t.id === churchColors[matchKey]);
      if (theme) return `${theme.bg} ${theme.text} ${theme.border}`;
    }
  }

  // 2. Fallback to hash-based selection
  let hash = 0;
  for (let i = 0; i < church.length; i++) {
    hash = church.charCodeAt(i) + ((hash << 5) - hash);
  }
  const theme = LAKBAY_THEMES[Math.abs(hash) % LAKBAY_THEMES.length];
  return `${theme.bg} ${theme.text} ${theme.border}`;
};

/**
 * Gets the vibrant color class for church indicators (legends, pulsars).
 */
export const getChurchVibrantColor = (church: string, churchColors?: Record<string, string>) => {
  if (!church) return 'bg-gray-400';

  // 1. Check for manual override (Case-insensitive & Trimmed)
  if (churchColors) {
    const normalizedTarget = church.toLowerCase().trim();
    const matchKey = Object.keys(churchColors).find(k => k.toLowerCase().trim() === normalizedTarget);
    
    if (matchKey) {
      const theme = LAKBAY_THEMES.find(t => t.id === churchColors[matchKey]);
      if (theme) return theme.vibrant;
    }
  }

  // 2. Fallback to hash-based selection
  let hash = 0;
  for (let i = 0; i < church.length; i++) {
    hash = church.charCodeAt(i) + ((hash << 5) - hash);
  }
  const theme = LAKBAY_THEMES[Math.abs(hash) % LAKBAY_THEMES.length];
  return theme.vibrant;
};
