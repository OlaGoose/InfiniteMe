/**
 * Place Service - Main Export
 * 
 * Centralized place information service with support for multiple providers
 */

export { placeService } from './service';
export { OverpassProvider } from './overpass';
export type { PlaceInfo, PlaceSearchOptions, PlaceProvider, PlaceProviderType } from './types';
