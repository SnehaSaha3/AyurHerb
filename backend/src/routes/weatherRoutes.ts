import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const apiKey = process.env.REACT_APP_WEATHER_API_KEY

    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon are required" });
    }

    const url = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${lat},${lon}`;

    const { data } = await axios.get(url);

    // Simplify response
    const weatherData = {
      temp: data.current.temp_c,
      description: data.current.condition.text,
      humidity: data.current.humidity,
      windSpeed: data.current.wind_kph,
      rainChance: data.current.precip_mm > 0 ? 100 : 0,
    };

    res.json(weatherData);
  } catch (error: any) {
    console.error("Weather error:", error.response?.data || error.message);
    res
      .status(500)
      .json({ error: error.response?.data?.error?.message || error.message });
  }
});

export default router;
