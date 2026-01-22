/**
 * Place Service
 * 
 * Main service for fetching place information from various providers
 * Supports easy switching between providers (Overpass, Google Places, etc.)
 */

import { PlaceProvider, PlaceInfo, PlaceSearchOptions, PlaceProviderType } from './types';
import { OverpassProvider } from './overpass';

// Environment variable to control provider
const PLACE_PROVIDER: PlaceProviderType = 
  (process.env.NEXT_PUBLIC_PLACE_PROVIDER as PlaceProviderType) || 'overpass';

class PlaceService {
  private provider: PlaceProvider;
  
  constructor(providerType: PlaceProviderType = PLACE_PROVIDER) {
    this.provider = this.createProvider(providerType);
  }
  
  /**
   * Create a provider instance based on type
   */
  private createProvider(type: PlaceProviderType): PlaceProvider {
    switch (type) {
      case 'overpass':
        return new OverpassProvider();
      
      case 'google':
        // TODO: Implement Google Places provider
        console.warn('Google Places provider not yet implemented, falling back to Overpass');
        return new OverpassProvider();
      
      case 'foursquare':
        // TODO: Implement Foursquare provider
        console.warn('Foursquare provider not yet implemented, falling back to Overpass');
        return new OverpassProvider();
      
      default:
        console.warn(`Unknown provider type: ${type}, using Overpass`);
        return new OverpassProvider();
    }
  }
  
  /**
   * Switch to a different provider
   */
  switchProvider(type: PlaceProviderType): void {
    this.provider = this.createProvider(type);
  }
  
  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }
  
  /**
   * Search for places near a location
   */
  async searchNearby(options: PlaceSearchOptions): Promise<PlaceInfo[]> {
    try {
      return await this.provider.search(options);
    } catch (error) {
      console.error(`Place search failed with ${this.provider.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for specific types of places (e.g., cafes, restaurants)
   */
  async searchByType(
    lat: number,
    lng: number,
    types: string[],
    radius: number = 500
  ): Promise<PlaceInfo[]> {
    return this.searchNearby({
      lat,
      lng,
      radius,
      types,
      limit: 20,
    });
  }
  
  /**
   * Get all nearby places (no type filter)
   */
  async getAllNearby(
    lat: number,
    lng: number,
    radius: number = 500,
    limit: number = 20
  ): Promise<PlaceInfo[]> {
    return this.searchNearby({
      lat,
      lng,
      radius,
      limit,
    });
  }
}

// Export singleton instance
export const placeService = new PlaceService();

// Export types for convenience
export type { PlaceInfo, PlaceSearchOptions };
