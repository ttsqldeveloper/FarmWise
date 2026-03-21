const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Knowledge base for advice
const adviceDatabase = {
  crops: {
    tropical: [
      { title: "🌱 Optimal Planting Times", content: "Plant after the first rains. Use raised beds for better drainage. The wet season is ideal for most crops." },
      { title: "💧 Water Management", content: "Water early morning or late evening. Drip irrigation is recommended to reduce evaporation and fungal diseases." },
      { title: "🌿 Fertilizer Schedule", content: "Apply NPK 15-15-15 at planting. Side-dress with nitrogen-rich fertilizer after 4 weeks for leafy growth." },
      { title: "🐛 Pest Control", content: "Use neem oil for aphids and caterpillars. Marigolds planted around crops deter nematodes naturally." },
      { title: "🌾 Drought Protection", content: "Mulch heavily with straw or dried leaves. Use shade cloth during heat waves to protect young plants." },
      { title: "🦠 Disease Prevention", content: "High humidity promotes fungal diseases. Ensure proper spacing for air circulation and avoid overhead watering." }
    ],
    arid: [
      { title: "💧 Water Conservation", content: "Use drip irrigation and mulch to reduce evaporation by up to 50%. Water deeply but less frequently." },
      { title: "🌱 Drought-Resistant Crops", content: "Consider millet, sorghum, cowpeas, and drought-tolerant maize varieties which thrive in dry conditions." },
      { title: "🌿 Soil Management", content: "Add organic matter and compost to improve water retention. Use cover crops during off-season." },
      { title: "🏜️ Wind Protection", content: "Plant windbreaks or use shade cloth to protect crops from hot, dry winds." }
    ],
    temperate: [
      { title: "❄️ Frost Protection", content: "Plant after last frost date. Use row covers, cloches, or cold frames for early season crops." },
      { title: "🍂 Crop Rotation", content: "Rotate crops annually to prevent soil-borne diseases and maintain soil fertility. Follow a 3-4 year rotation plan." },
      { title: "🌱 Season Extension", content: "Use greenhouses, hoop houses, or cold frames to extend growing season in spring and fall." }
    ],
    mediterranean: [
      { title: "☀️ Summer Management", content: "Irrigate deeply but infrequently. Mulch heavily to retain soil moisture during hot, dry summers." },
      { title: "🌧️ Winter Crops", content: "Plant cool-season crops like leafy greens, root vegetables during mild, wet winters." },
      { title: "🌿 Soil Conservation", content: "Use cover crops in summer fallow periods to prevent erosion and maintain soil health." }
    ]
  },
  livestock: {
    tropical: [
      { title: "🐄 Heat Stress Management", content: "Provide shade and plenty of fresh water. Feed during cooler morning/evening hours. Install fans in barns." },
      { title: "💉 Vaccination Schedule", content: "Vaccinate against foot-and-mouth, anthrax, and blackleg before rainy season. Consult local vet for specific timing." },
      { title: "🦟 Parasite Control", content: "Regular deworming every 3 months. Use acaricides for tick control. Rotate pastures to break parasite cycles." },
      { title: "🌧️ Wet Season Care", content: "Keep animals on dry ground to prevent foot rot. Provide elevated, dry resting areas." }
    ],
    arid: [
      { title: "💧 Water Requirements", content: "Provide 50-80L per cattle daily. Clean water troughs weekly. Consider installing water harvesting systems." },
      { title: "🌾 Feed Management", content: "Stock hay and protein supplements before dry season. Grow drought-tolerant fodder like leucaena, sorghum." },
      { title: "🚨 Emergency Signs", content: "Call vet if animal stops eating, has sunken eyes, shows lethargy, or has bloated stomach." },
      { title: "🏜️ Grazing Management", content: "Practice rotational grazing. Allow pastures to recover during dry periods. Provide supplemental feed." }
    ],
    temperate: [
      { title: "❄️ Winter Preparation", content: "Increase feed energy by 20%. Provide windbreaks, dry bedding, and shelter from cold winds." },
      { title: "🌾 Winter Feeding", content: "Stock enough hay for winter months. Provide access to unfrozen water using heated waterers." },
      { title: "💉 Winter Vaccines", content: "Schedule vaccines before winter. Cold stress can weaken immune systems." }
    ],
    mediterranean: [
      { title: "🌾 Summer Grazing", content: "Rotate pastures to prevent overgrazing during dry summers. Provide shade and water." },
      { title: "🌧️ Winter Pasture", content: "Take advantage of winter rains for pasture growth. Plan grazing rotations accordingly." }
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

    // Add seasonal advice
    const seasonalAdvice = getSeasonalAdvice(region, farmType);
    advice = [...advice, ...seasonalAdvice];

    res.json({ advice: advice.slice(0, 8) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

function getCropSpecificAdvice(cropType) {
  const advice = {
    maize: [
      { title: "🌽 Maize Nutrition", content: "Apply nitrogen fertilizer at knee-high stage for optimal yield. Side-dress with urea when plants are 12-18 inches tall." },
      { title: "🌽 Maize Spacing", content: "Plant 20-30 cm apart in rows 75-90 cm apart for optimal growth and yield." }
    ],
    tomato: [
      { title: "🍅 Tomato Blight Prevention", content: "Remove lower leaves, ensure good airflow, apply copper spray weekly. Stake plants to keep fruit off ground." },
      { title: "🍅 Tomato Support", content: "Use cages or stakes to support plants. Prune suckers for better fruit production." }
    ],
    leafy: [
      { title: "🥬 Leafy Greens Care", content: "Harvest outer leaves regularly to encourage continuous growth. Provide consistent moisture." }
    ],
    fruits: [
      { title: "🍎 Orchard Management", content: "Prune during dormancy. Apply balanced fertilizer in spring. Monitor for pests regularly." }
    ]
  };
  return advice[cropType] || [];
}

function getLivestockSpecificAdvice(livestockType) {
  const advice = {
    poultry: [
      { title: "🐔 Poultry Health", content: "Keep coop dry and well-ventilated. Provide grit and oyster shell. Vaccinate against Newcastle and Gumboro diseases." },
      { title: "🥚 Egg Production", content: "Provide 14-16 hours of light for optimal egg production. Collect eggs daily." }
    ],
    goats: [
      { title: "🐐 Goat Management", content: "Provide copper supplements. Watch for signs of bloating. Trim hooves every 6-8 weeks." },
      { title: "🐐 Kid Care", content: "Ensure kids receive colostrum within first 24 hours. Vaccinate at 2-3 months." }
    ],
    cattle: [
      { title: "🐄 Cattle Nutrition", content: "Provide mineral blocks with salt, phosphorus, and calcium. Monitor body condition score." }
    ],
    sheep: [
      { title: "🐑 Sheep Management", content: "Shear before summer. Provide copper supplements (but not for sheep - they're sensitive!)." }
    ]
  };
  return advice[livestockType] || [];
}

function getSeasonalAdvice(region, farmType) {
  const currentMonth = new Date().getMonth();
  const isDrySeason = [11, 0, 1, 2].includes(currentMonth); // Nov-Feb dry in southern hemisphere
  
  if (isDrySeason && region === 'arid') {
    return [{
      title: "🔥 Dry Season Alert",
      content: farmType === 'crops' 
        ? "Focus on water conservation. Mulch heavily and consider drip irrigation. Plant short-cycle crops."
        : "Stock up on feed and water. Reduce herd size if necessary. Provide protein supplements."
    }];
  }
  
  if (!isDrySeason && region === 'tropical') {
    return [{
      title: "🌧️ Rainy Season Prep",
      content: farmType === 'crops'
        ? "Prepare drainage systems. Plant fast-growing varieties. Watch for fungal diseases."
        : "Vaccinate before wet season. Provide dry shelter. Monitor for foot rot."
    }];
  }
  
  return [];
}

module.exports = router;