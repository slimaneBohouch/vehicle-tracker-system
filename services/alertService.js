const Alert = require("../models/Alert");
const geocodingService = require("../services/geocodingService");
const socket = require("../Utils/socket");
const User = require("../models/User");

exports.createAlert = async function (vehicle, type, message, data = {}) {
  try {
    const lat = data.lat || data?.location?.lat;
    const lon = data.lon || data?.location?.lon;

    let location = null;
    if (lat && lon) {
      try {
        location = await geocodingService.reverseGeocode(lat, lon);
      } catch (err) {
        console.warn("[Alert] Reverse geocoding failed:", err.message);
      }
    }

    // ✅ Auto-resolve opposite alert when entering or exiting
    if (data.geofenceId) {
      if (type === "GEOFENCE_EXIT") {
        await Alert.updateMany(
          {
            vehicleId: vehicle._id,
            type: "GEOFENCE_ENTRY",
            "data.geofenceId": data.geofenceId,
            resolved: false,
          },
          { resolved: true, resolvedAt: new Date() }
        );
      }

      if (type === "GEOFENCE_ENTRY") {
        await Alert.updateMany(
          {
            vehicleId: vehicle._id,
            type: "GEOFENCE_EXIT",
            "data.geofenceId": data.geofenceId,
            resolved: false,
          },
          { resolved: true, resolvedAt: new Date() }
        );
      }
    }

    // Check for duplicate alerts
    const query = {
      vehicleId: vehicle._id,
      type,
      resolved: false,
    };

    if (data.geofenceId) {
      query["data.geofenceId"] = data.geofenceId;
    }

    const existing = await Alert.findOne(query);
    if (existing) {
      console.log(
        `[ALERT] Skipped duplicate alert ${type} for geofence ${data.geofenceId}`
      );
      return;
    }

    const alertDoc = await Alert.create({
      vehicleId: vehicle._id,
      type,
      message,
      data,
      timestamp: new Date(),
      location,
    });

try {
  // Incrémenter pour le user lié au véhicule (si existe)
  if (vehicle.user && vehicle.user._id) {
    await User.findByIdAndUpdate(vehicle.user._id, {
      $inc: { alertCounter: 1 },
    });
  } else {
    console.warn("[ALERT] No user attached to vehicle. Skipping user alert counter increment.");
  }

  // Incrémenter pour tous les admins et superadmins
  await User.updateMany(
    { role: { $in: ["admin", "superadmin"] } },
    { $inc: { alertCounter: 1 } }
  );
} catch (err) {
  console.error("[ALERT] Failed to increment alert counters:", err.message);
}


    console.log(`[ALERT] ${type} created for vehicle ${vehicle.name}`);

    const io = socket.getIO();
    const alertPayload = {
      vehicleId: vehicle._id,
      vehicleName: vehicle.name,
      vehiclePlate: vehicle.licensePlate,
      type,
      message,
      timestamp: alertDoc.timestamp,
      location: location || "Unknown location",
      data,
    };

    io.to(vehicle.user._id.toString()).emit("alert", alertPayload);
    io.to("admins").emit("alert", { ...alertPayload, user: vehicle.user });
  } catch (err) {
    console.error("[ALERT] Error creating alert:", err.message);
  }
};
