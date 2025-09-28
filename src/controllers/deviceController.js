const MoulditDevice = require("../models/Device");

// Insert PLC packet
exports.upsertDeviceData = async (req, res) => {
  try {
    let data = req.body;

    // Accept nested 'data' key (formats 2, 3, 4)
    if (data && typeof data === "object" && data.data && typeof data.data === "object") {
      data = data.data;
    }

    // Fix weird payload like {"{json...":''}
    if (Object.keys(data).length === 1 && typeof Object.keys(data)[0] === "string") {
      try {
        data = JSON.parse(Object.keys(data)[0]);
      } catch {
        return res.status(400).json({ message: "Invalid payload" });
      }
    }

    // Normalize field names
    if (data["T run"] !== undefined) {
      data.T_run = data["T run"];
      delete data["T run"];
    }
    if (data["M down"] !== undefined) {
      data.M_down = data["M down"];
      delete data["M down"];
    }

    // Validate IMEI (required)
    if (!data.imei) {
      return res.status(400).json({ message: "imei is required" });
    }
    data.imei = String(data.imei).trim();
    if (data.imei.length < 8 || data.imei.length > 20) {
      return res.status(400).json({ message: "imei looks invalid" });
    }

    // Parse dtm into real Date (optional)
    if (data.dtm && typeof data.dtm === "string" && data.dtm.length === 14) {
      const dtmStr = data.dtm;
      try {
        const year = parseInt(dtmStr.substring(0, 4));
        const month = parseInt(dtmStr.substring(4, 6)) - 1;
        const day = parseInt(dtmStr.substring(6, 8));
        const hour = parseInt(dtmStr.substring(8, 10));
        const min = parseInt(dtmStr.substring(10, 12));
        const sec = parseInt(dtmStr.substring(12, 14));
        data.dtm_parsed = new Date(year, month, day, hour, min, sec);
      } catch {}
    }

    // Save as new record (history)
    const deviceData = await MoulditDevice.create(data);

    return res.status(201).json({ message: "Device data saved", deviceData });
  } catch (err) {
    console.error("Mouldit Device error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Fetch all records
exports.getAllDeviceData = async (req, res) => {
  try {
    const records = await MoulditDevice.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    console.error("Mouldit Device fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
