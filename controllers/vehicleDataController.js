const alertService = require('../services/alertService');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const axios = require('axios');

/**
 * Fetch vehicle data and process alerts
 */
exports.processVehicleData = async (req, res) => {
  try {
    const result = await fetchAndProcessVehicleData();
    res.status(200).json({
      success: true,
      message: `Processed data for ${result.processed} vehicles`,
      errors: result.errors
    });
  } catch (error) {
    console.error('Error in processVehicleData controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process vehicle data',
      error: error.message
    });
  }
};

/**
 * Process data for a specific vehicle
 */
exports.processVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate vehicle exists and belongs to user
    const vehicle = await Vehicle.findOne({ 
      _id: id,
      user: req.user.id 
    });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or not authorized'
      });
    }
    
    const result = await fetchAndProcessSingleVehicle(vehicle);
    
    res.status(200).json({
      success: true,
      message: result.success ? 'Vehicle data processed successfully' : 'Failed to process vehicle data',
      data: result
    });
    
  } catch (error) {
    console.error('Error in processVehicleById controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process vehicle data',
      error: error.message
    });
  }
};

/**
 * Fetch and process data for all vehicles
 */
async function fetchAndProcessVehicleData() {
  try {
    // Fetch data from external API
    const response = await axios.get(process.env.VEHICLE_API_URL || 'http://www.pogog.ovh:5051/devices');
    const vehiclesData = response.data;
    
    let processed = 0;
    const errors = [];
    
    // Process each vehicle
    for (const vehicleData of vehiclesData) {
      try {
        // Skip if no IMEI
        if (!vehicleData.IMEI) {
          continue;
        }
        
        // Find vehicle in database
        const vehicle = await Vehicle.findOne({ imei: vehicleData.IMEI });
        
        if (!vehicle) {
          continue; // Skip vehicles not in our database
        }
        
        // Find vehicle owner
        const user = await User.findById(vehicle.user);
        
        if (!user) {
          continue; // Skip if no user found
        }
        
        // Update vehicle status
        await updateVehicleStatus(vehicle, vehicleData);
        
        // Process alerts
        await alertService.processVehicleAlerts(vehicleData, vehicle, user);
        
        processed++;
        
      } catch (error) {
        console.error(`Error processing vehicle ${vehicleData.IMEI}:`, error);
        errors.push({
          imei: vehicleData.IMEI,
          error: error.message
        });
      }
    }
    
    return { processed, errors };
    
  } catch (error) {
    console.error('Error fetching and processing vehicle data:', error);
    throw new Error('Failed to fetch vehicle data');
  }
}

/**
 * Fetch and process data for a single vehicle
 */
async function fetchAndProcessSingleVehicle(vehicle) {
  try {
    // Fetch data from external API
    const response = await axios.get(`${process.env.VEHICLE_API_URL || 'http://www.pogog.ovh:5051/devices'}/${vehicle.imei}`);
    const vehicleData = response.data;
    
    if (!vehicleData || !vehicleData.IMEI) {
      return { success: false, message: 'No data returned from API' };
    }
    
    // Find vehicle owner
    const user = await User.findById(vehicle.user);
    
    if (!user) {
      return { success: false, message: 'Vehicle owner not found' };
    }
    
    // Update vehicle status
    await updateVehicleStatus(vehicle, vehicleData);
    
    // Process alerts
    await alertService.processVehicleAlerts(vehicleData, vehicle, user);
    
    return { 
      success: true, 
      vehicle: vehicle._id,
      imei: vehicle.imei,
      updatedStatus: vehicle.currentStatus
    };
    
  } catch (error) {
    console.error(`Error processing vehicle ${vehicle.imei}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Update vehicle status based on incoming data
 */
async function updateVehicleStatus(vehicle, vehicleData) {
  // Update vehicle status
  if (vehicleData.movement === 1) {
    vehicle.currentStatus = 'moving';
  } else if (vehicle.currentStatus !== 'immobilized') {
    vehicle.currentStatus = 'stopped';
  }
  
  // Update last location if we have valid coordinates
  if (vehicleData.lat !== 0 && vehicleData.lon !== 0) {
    vehicle.lastLocation = {
      type: 'Point',
      coordinates: [vehicleData.lon, vehicleData.lat], // MongoDB uses [longitude, latitude]
      timestamp: new Date(vehicleData.gpsTimestamp || Date.now()),
      speed: Math.max(vehicleData.speed || 0, vehicleData.speedGps || 0)
    };
  }
  
  // Save updated vehicle
  await vehicle.save();
}

/**
 * Set up scheduled task to poll vehicle data
 */
exports.setupPolling = (interval = 30000) => {
  console.log(`Setting up vehicle data polling every ${interval/1000} seconds`);
  
  // Initial fetch
  setTimeout(() => {
    fetchAndProcessVehicleData().catch(error => {
      console.error('Error in initial vehicle data fetch:', error);
    });
  }, 5000); // Short delay before first run
  
  // Set up interval
  setInterval(() => {
    fetchAndProcessVehicleData().catch(error => {
      console.error('Error in scheduled vehicle data fetch:', error);
    });
  }, interval);
};
