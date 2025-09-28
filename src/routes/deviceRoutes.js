const express = require("express");
const MoulditDevice = require("../models/Device");

console.log("DEBUG: moulditDeviceRoutes.js loaded");

const router = express.Router();

// ✅ POST /api/mouldit-devices → save new PLC packet
router.post("/", async (req, res) => {
  console.log("DEBUG: POST /api/mouldit-devices called");
  console.log("DEBUG: req.body:", JSON.stringify(req.body, null, 2));

  try {
    let data = req.body;

    // Accept nested 'data' key (formats 2, 3, 4)
    if (data && typeof data === "object" && data.data && typeof data.data === "object") {
      data = data.data;
      console.log("DEBUG: using nested 'data' object:", data);
    }

    // Handle case where device sends JSON as key
    if (Object.keys(data).length === 1 && typeof Object.keys(data)[0] === "string") {
      console.log("DEBUG: payload looks malformed, trying to parse");
      try {
        data = JSON.parse(Object.keys(data)[0]);
        console.log("DEBUG: parsed payload:", data);
      } catch (e) {
        console.log("DEBUG: JSON parse failed:", e.message);
        return res.status(400).json({ message: "Invalid payload" });
      }
    }

    // Normalize keys with spaces
    if (data["T run"] !== undefined) {
      data.T_run = data["T run"];
      delete data["T run"];
    }
    if (data["M down"] !== undefined) {
      data.M_down = data["M down"];
      delete data["M down"];
    }

    // Validate IMEI
    if (!data.imei) {
      console.log("DEBUG: imei missing");
      return res.status(400).json({ message: "imei is required" });
    }

    data.imei = String(data.imei).trim();
    console.log("DEBUG: final imei:", data.imei, "length:", data.imei.length);

    if (data.imei.length < 8 || data.imei.length > 20) {
      console.log("DEBUG: imei length invalid");
      return res.status(400).json({ message: "imei looks invalid" });
    }

    // Optional: parse dtm into Date
    if (data.dtm && typeof data.dtm === "string" && data.dtm.length === 14) {
      try {
        const year = parseInt(data.dtm.substring(0, 4));
        const month = parseInt(data.dtm.substring(4, 6)) - 1;
        const day = parseInt(data.dtm.substring(6, 8));
        const hour = parseInt(data.dtm.substring(8, 10));
        const min = parseInt(data.dtm.substring(10, 12));
        const sec = parseInt(data.dtm.substring(12, 14));
        data.dtm_parsed = new Date(year, month, day, hour, min, sec);
        console.log("DEBUG: parsed dtm into Date:", data.dtm_parsed);
      } catch (e) {
        console.log("DEBUG: failed to parse dtm:", e.message);
      }
    }

    console.log("DEBUG: inserting PLC packet to DB");
    const packet = await MoulditDevice.create(data);

    console.log("DEBUG: packet saved successfully:", packet._id);
    res.status(201).json({
      message: "Packet saved successfully",
      packetId: packet._id,
      status: "OK",
    });
  } catch (err) {
    console.error("DEBUG: PLC packet save error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /api/mouldit-devices → fetch all PLC packets
router.get("/", async (req, res) => {
  try {
    const packets = await MoulditDevice.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: packets.length, data: packets });
  } catch (err) {
    console.error("DEBUG: PLC packet fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /api/mouldit-devices/:imei → fetch all packets for specific device
router.get("/:imei", async (req, res) => {
  try {
    const { imei } = req.params;
    console.log("DEBUG: fetching packets for imei:", imei);

    const packets = await MoulditDevice.find({ imei }).sort({ createdAt: -1 }).lean();

    if (!packets.length) {
      console.log("DEBUG: no packets found for imei:", imei);
      return res.status(404).json({ message: "No data found for this IMEI" });
    }

    res.json({ success: true, count: packets.length, data: packets });
  } catch (err) {
    console.error("DEBUG: PLC packet fetch by imei error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
