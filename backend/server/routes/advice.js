const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Knowledge base for advice
const adviceDatabase = {
  crops: {
    tropical: [
      { title: "🌱 Optimal Planting Times", content: "Plant after first rains. Use raised beds for drainage." },
      { title: "💧 Water Management", content: "Water early morning or late evening. Drip irrigation recommended." },
      { title: "🌿 Fertilizer Schedule", content: "Apply NPK 15-15-15 at planting. Side-dress with nitrogen after 4 weeks." },
      { title: "🐛 Pest Control", content: "Use neem oil for aphids. Marigolds deter nematodes." },
      { title: "🌾 Drought Protection", content: "Mulch heavily with straw. Use shade cloth during heat waves." }
    ],
    arid: [
      { title: "💧 Water Conservation", content: "Use drip irrigation and mulch to reduce evaporation by 50%." },
      { title: "🌱 Drought-Resistant Crops", content: "Consider millet, sorghum, and cowpeas which thrive in dry conditions." },
      { title: "🌿 Soil Management", content: "Add organic matter to improve water retention. Use compost generously." }
    ],
    temperate: [
      { title: "❄️ Frost Protection", content: "Plant after last frost. Use row covers for early crops." },
      { title: "🍂 Crop Rotation", content: "Rotate crops annually to prevent soil-borne diseases." }
    ],
    mediterranean: [
      { title: "☀️ Summer Management", content: "Irrigate deeply but infrequently. Mulch to retain moisture." }
    ]
  },
  livestock: {
    tropical: [
      { title: "🐄 Heat Stress Management", content: "Provide shade and plenty of water. Feed during cooler hours." },
      { title: "💉 Vaccination Schedule", content: "Vaccinate against foot-and-mouth and anthrax before rainy season." },
      { title: "🦟 Parasite Control", content: "Regular deworming every 3 months. Use acaricides for ticks." }
    ],
    arid: [
      { title: "💧 Water Requirements", content: "Provide 50-80L per cattle daily. Clean troughs weekly." },
      { title: "🌾 Feed Management", content: "Store hay and protein supplements before dry season." },
      { title: "🚨 Emergency Signs", content: "Call vet if animal stops eating, has sunken eyes, or shows lethargy." }
    ],
    temperate: [
      { title: "❄️ Winter Preparation", content: "Increase feed energy by 20%. Provide windbreaks." }
    ]
  }
};

// Get personalized advice
router.get('/personalized', auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;

  try {
    // Get user's farm profile
    const userResult = await db.query(
      'SELECT farm_type, region, crop_type, livestock_type FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const farmType = user.farm_type;
    const region = user.region;

    // Get advice from database
    let advice = adviceDatabase[farmType]?.[region] || adviceDatabase[farmType]?.temperate || [];

    // Add specific advice based on crop/animal type
    if (farmType === 'crops' && user.crop_type) {
      const cropAdvice = getCropSpecificAdvice(user.crop_type);
      advice = [...advice, ...cropAdvice];
    } else if (farmType === 'livestock' && user.livestock_type) {
      const livestockAdvice = getLivestockSpecificAdvice(user.livestock_type);
      advice = [...advice, ...livestockAdvice];
    }

    res.json({ advice: advice.slice(0, 8) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

function getCropSpecificAdvice(cropType) {
  const advice = {
    maize: [
      { title: "🌽 Maize Nutrition", content: "Apply nitrogen at knee-high stage for optimal yield." }
    ],
    tomato: [
      { title: "🍅 Tomato Blight Prevention", content: "Remove lower leaves, ensure airflow, apply copper spray weekly." }
    ],
    leafy: [
      { title: "🥬 Leafy Greens Care", content: "Harvest outer leaves regularly to encourage growth." }
    ]
  };
  return advice[cropType] || [];
}

function getLivestockSpecificAdvice(livestockType) {
  const advice = {
    poultry: [
      { title: "🐔 Poultry Health", content: "Keep coop dry, provide grit, vaccinate against Newcastle disease." }
    ],
    goats: [
      { title: "🐐 Goat Management", content: "Provide copper supplements. Watch for bloating." }
    ],
    cattle: [
      { title: "🐄 Cattle Nutrition", content: "Provide mineral blocks with salt and phosphorus." }
    ]
  };
  return advice[livestockType] || [];
}

module.exports = router;