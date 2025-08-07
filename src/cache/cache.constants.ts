export const CACHE_KEYS = {
  DISCOVERY_SEARCH: 'discovery:search',
  DISCOVERY_BROWSE: 'discovery:browse',
  DISCOVERY_PROGRAM: 'discovery:program',
  CATEGORIES_LIST: 'categories:list',
} as const;

export const CACHE_TTL = {
  DISCOVERY_SEARCH: 5 * 60, // 5 minutes
  DISCOVERY_BROWSE: 5 * 60, // 5 minutes
  DISCOVERY_PROGRAM: 10 * 60, // 10 minutes
  CATEGORIES_LIST: 30 * 60, // 30 minutes
} as const;
