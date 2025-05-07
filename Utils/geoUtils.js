// geoUtils.js - Geospatial utility functions

/**
 * Calculate distance between two points using Haversine formula
 * @param {Number} lat1 - Latitude of first point in degrees
 * @param {Number} lon1 - Longitude of first point in degrees
 * @param {Number} lat2 - Latitude of second point in degrees
 * @param {Number} lon2 - Longitude of second point in degrees
 * @returns {Number} Distance in meters
 */
function getDistance(lat1, lon1, lat2, lon2) {
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
        typeof lat2 !== 'number' || typeof lon2 !== 'number') {
      return Infinity;
    }
    
    // Earth's radius in meters
    const R = 6371000;
    
    // Convert latitude and longitude from degrees to radians
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    // Haversine formula
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }
  
  /**
   * Check if a point is inside a polygon using ray casting algorithm
   * @param {Array} point - [lat, lon] coordinates of the point
   * @param {Array} polygon - Array of [lat, lon] coordinate pairs forming the polygon
   * @returns {Boolean} True if point is inside polygon
   */
  function pointInPolygon(point, polygon) {
    if (!Array.isArray(point) || point.length !== 2 ||
        !Array.isArray(polygon) || polygon.length < 3) {
      return false;
    }
    
    const x = point[0];
    const y = point[1];
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];
      
      const intersect = ((yi > y) !== (yj > y)) &&
                        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  }
  
  /**
   * Create a circular geofence
   * @param {Number} lat - Latitude of center in degrees
   * @param {Number} lon - Longitude of center in degrees
   * @param {Number} radiusMeters - Radius in meters
   * @returns {Object} Geofence object
   */
  function createCircularGeofence(lat, lon, radiusMeters) {
    return {
      type: 'circle',
      center: { lat, lon },
      radius: radiusMeters
    };
  }
  
  /**
   * Create a polygon geofence
   * @param {Array} coordinates - Array of {lat, lon} objects forming the polygon
   * @returns {Object} Geofence object
   */
  function createPolygonGeofence(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      throw new Error('Polygon must have at least 3 points');
    }
    
    return {
      type: 'polygon',
      coordinates
    };
  }
  
  module.exports = {
    getDistance,
    pointInPolygon,
    createCircularGeofence,
    createPolygonGeofence
  };