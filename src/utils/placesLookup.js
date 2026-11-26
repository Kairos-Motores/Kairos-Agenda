const placeCache = new Map();

export const getCachedPlace = (key) => {
  if (!key) return null;
  return placeCache.get(String(key).trim().toLowerCase()) || null;
};

export const setCachedPlace = (key, place) => {
  if (!key || !place) return;
  placeCache.set(String(key).trim().toLowerCase(), place);
};

export const fetchPlaceDetails = async ({ placeId, query, signal } = {}) => {
  const cacheKey = placeId ? `id:${placeId}` : String(query || '').trim();
  const cached = getCachedPlace(cacheKey);
  if (cached !== null) return cached;

  try {
    const params = new URLSearchParams({ action: 'details' });
    if (placeId) params.set('placeId', placeId);
    else if (query) params.set('q', query);
    else return null;

    const res = await fetch(`/api/places-proxy?${params.toString()}`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.place || null;
    if (place) {
      setCachedPlace(cacheKey, place);
      if (place.name && place.address) {
        setCachedPlace(`${place.name} — ${place.address}`, place);
      }
      if (place.address) {
        setCachedPlace(place.address, place);
      }
    }
    return place;
  } catch {
    return null;
  }
};
