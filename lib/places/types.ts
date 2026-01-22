/**
 * Place Service Types
 * 
 * Defines the interface for different place providers (Overpass, Google Places, etc.)
 */

export interface PlaceInfo {
  id: string;
  name: string;
  type: string; // e.g., 'cafe', 'restaurant', 'shop', 'park'
  lat: number;
  lng: number;
  address?: string;
  tags?: Record<string, string>; // Additional metadata from provider
}

export interface PlaceSearchOptions {
  lat: number;
  lng: number;
  radius?: number; // meters, default 500
  types?: string[]; // filter by place types
  limit?: number; // max results, default 20
}

export interface PlaceProvider {
  name: string;
  search(options: PlaceSearchOptions): Promise<PlaceInfo[]>;
}

export type PlaceProviderType = 'overpass' | 'google' | 'foursquare';
