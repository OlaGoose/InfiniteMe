/**
 * Overpass API Provider
 * 
 * Free OpenStreetMap-based place data provider
 * API Documentation: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

import { PlaceProvider, PlaceInfo, PlaceSearchOptions } from './types';

// Multiple Overpass API endpoints for failover
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

const REQUEST_TIMEOUT = 12000; // 12 seconds (slightly longer than query timeout)
const MAX_RETRIES = 2;

// Map OSM amenity types to our simplified types
const AMENITY_TYPE_MAP: Record<string, string> = {
  cafe: 'cafe',
  restaurant: 'restaurant',
  fast_food: 'restaurant',
  pub: 'restaurant',
  bar: 'restaurant',
  shop: 'shop',
  supermarket: 'shop',
  convenience: 'shop',
  mall: 'shop',
  park: 'park',
  garden: 'park',
  museum: 'museum',
  library: 'library',
  theatre: 'theatre',
  cinema: 'cinema',
  hospital: 'hospital',
  pharmacy: 'pharmacy',
  bank: 'bank',
  atm: 'bank',
  hotel: 'hotel',
  hostel: 'hotel',
  subway_entrance: 'transit',
  bus_station: 'transit',
  train_station: 'transit',
};

export class OverpassProvider implements PlaceProvider {
  name = 'overpass';

  /**
   * Build Overpass QL query
   * Documentation: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
   */
  private buildQuery(options: PlaceSearchOptions): string {
    const { lat, lng, radius = 500, types } = options;
    
    // If specific types requested, filter by them
    let amenityFilter = '';
    if (types && types.length > 0) {
      const osmAmenities = types
        .map(t => Object.entries(AMENITY_TYPE_MAP).find(([_, v]) => v === t)?.[0])
        .filter(Boolean);
      
      if (osmAmenities.length > 0) {
        amenityFilter = `["amenity"~"${osmAmenities.join('|')}"]`;
      }
    }
    
    // Query for nodes and ways (buildings) with amenity tags
    // around: search around a point (lat, lng, radius)
    // Reduce timeout to 10 seconds to avoid gateway timeouts
    const query = `
      [out:json][timeout:10];
      (
        node${amenityFilter}(around:${radius},${lat},${lng});
        way${amenityFilter}(around:${radius},${lat},${lng});
      );
      out center;
    `;
    
    return query.trim();
  }

  /**
   * Parse Overpass API response
   */
  private parseResponse(data: any, limit: number = 20): PlaceInfo[] {
    if (!data.elements || !Array.isArray(data.elements)) {
      return [];
    }

    const places: PlaceInfo[] = [];
    
    for (const element of data.elements) {
      if (places.length >= limit) break;
      
      const tags = element.tags || {};
      const name = tags.name || tags['name:en'] || tags.brand;
      
      // Skip if no name
      if (!name) continue;
      
      // Get coordinates
      let lat: number, lng: number;
      if (element.type === 'node') {
        lat = element.lat;
        lng = element.lon;
      } else if (element.center) {
        lat = element.center.lat;
        lng = element.center.lon;
      } else {
        continue;
      }
      
      // Determine type
      const amenity = tags.amenity || tags.shop || tags.leisure || 'unknown';
      const placeType = AMENITY_TYPE_MAP[amenity] || 'other';
      
      // Build address from tags
      const addressParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:city'],
      ].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(', ') : undefined;
      
      places.push({
        id: `osm-${element.type}-${element.id}`,
        name,
        type: placeType,
        lat,
        lng,
        address,
        tags: {
          amenity,
          cuisine: tags.cuisine,
          opening_hours: tags.opening_hours,
          phone: tags.phone,
          website: tags.website,
          ...tags,
        },
      });
    }
    
    return places;
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = REQUEST_TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout: Overpass API took too long to respond');
      }
      throw error;
    }
  }

  /**
   * Search for places near a location with retry and failover
   */
  async search(options: PlaceSearchOptions): Promise<PlaceInfo[]> {
    const { limit = 20 } = options;
    const query = this.buildQuery(options);
    
    let lastError: Error | null = null;
    
    // Try each endpoint with retries
    for (const endpoint of OVERPASS_ENDPOINTS) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            // Exponential backoff: wait 1s, 2s, 4s...
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
          }

          const response = await this.fetchWithTimeout(
            endpoint,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `data=${encodeURIComponent(query)}`,
            },
            REQUEST_TIMEOUT
          );
          
          if (!response.ok) {
            // If it's a server error (5xx), try next endpoint
            if (response.status >= 500 && response.status < 600) {
              throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            // For client errors (4xx), don't retry
            throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          const places = this.parseResponse(data, limit);
          
          // If we got results, return them
          if (places.length > 0 || attempt === MAX_RETRIES) {
            return places;
          }
          
          // If no results but not last attempt, continue to next attempt
          continue;
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Don't retry on client errors (4xx)
          if (error instanceof Error && error.message.includes('4')) {
            break;
          }
          
          // Log but continue to next attempt/endpoint
          console.warn(
            `Overpass API attempt ${attempt + 1} failed for ${endpoint}:`,
            error instanceof Error ? error.message : String(error)
          );
          
          // If this was the last attempt for this endpoint, try next endpoint
          if (attempt === MAX_RETRIES) {
            break;
          }
        }
      }
    }
    
    // All endpoints failed, return empty array with warning
    console.warn('All Overpass API endpoints failed, returning empty results');
    return [];
  }
}
