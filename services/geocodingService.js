// services/geocodingService.js
const opencage = require('opencage-api-client');

const OPENCAGE_KEY = '9a6f7ec6a40748c3bba770318a958e7e';

exports.reverseGeocode = async (lat, lon) => {
  try {
    const response = await opencage.geocode({ q: `${lat},${lon}`, key: OPENCAGE_KEY });

    if (response?.results?.length > 0) {
      return response.results[0].formatted;
    }
    return null;
  } catch (err) {
    console.error('[Geocoding Error]', err.message);
    return null;
  }
};
