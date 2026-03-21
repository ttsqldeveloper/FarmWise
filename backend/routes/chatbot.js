const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Advanced AI response system
function generateResponse(question, userContext) {
  const q = question.toLowerCase();
  
  // Disease detection
  if (q.includes('blight') || (q.includes('tomato') && q.includes('disease'))) {
    return {
      answer: "🍅 **Tomato Blight Treatment**\n\n**Symptoms:** Brown spots on leaves, white fungal growth, fruit rot\n\n**Treatment:**\n1. Remove infected leaves immediately\n2. Apply copper-based fungicide every 7-10 days\n3. Improve air circulation by pruning\n4. Avoid overhead watering\n5. Use mulch to prevent soil splash\n\n**Prevention:** Plant resistant varieties and rotate crops yearly.",
      severity: "high",
      actionItems: ["Remove infected leaves", "Apply fungicide", "Improve airflow"]
    };
  }
  
  if (q.includes('foot rot') || (q.includes('goat') && q.includes('foot'))) {
    return {
      answer: "🐐 **Foot Rot in Goats/Cattle**\n\n**Signs:** Lameness, swelling between toes, foul smell\n\n**Treatment:**\n1. Isolate affected animals\n2. Clean feet with copper sulfate solution\n3. Trim hooves carefully\n4. Apply topical antibiotics\n5. Keep animals on dry ground\n\n**Prevention:** Regular hoof trimming and foot baths with zinc sulfate.",
      severity: "medium",
      actionItems: ["Isolate animal", "Clean hooves", "Apply treatment"]
    };
  }
  
  // Water management
  if (q.includes('water') || q.includes('irrigation')) {
    return {
      answer: `💧 **Water Management for ${userContext.region || 'Your'} Region**\n\n**Best Practices:**\n• Water early morning (5-7 AM) to reduce evaporation\n• Use drip irrigation for 30-50% water savings\n• Apply 2-3 inches of organic mulch\n• Check soil moisture 2 inches deep before watering\n• Install rain water harvesting systems\n\n**For ${userContext.farm_type === 'crops' ? 'crops' : 'livestock'}:**\n${userContext.farm_type === 'crops' ? '• Young plants need daily water for first 2 weeks\n• Mature plants: 1-2 inches per week' : '• Clean water troughs daily\n• Provide shade to reduce water consumption'}`,
      severity: "low",
      actionItems: ["Check irrigation system", "Apply mulch", "Monitor soil moisture"]
    };
  }
  
  // Vaccination schedule
  if (q.includes('vaccination') || q.includes('vaccine')) {
    return {
      answer: "💉 **Recommended Vaccination Schedule**\n\n**Cattle:**\n• Blackleg: Annually before rainy season\n• Anthrax: Annually in endemic areas\n• Brucellosis: Heifers 4-8 months\n\n**Goats/Sheep:**\n• PPR (Peste des Petits Ruminants): Annually\n• Enterotoxemia: Every 6 months\n• Contagious ecthyma: Annually\n\n**Poultry:**\n• Newcastle: 7-10 days, booster at 6 weeks\n• Gumboro: 14-21 days\n• Fowl pox: 8-12 weeks\n\n**Always consult your local veterinarian for region-specific schedules.**",
      severity: "medium",
      actionItems: ["Check vaccination records", "Schedule vet visit", "Update health log"]
    };
  }
  
  // Dry season preparation
  if (q.includes('dry season') || q.includes('drought')) {
    return {
      answer: "🌾 **Dry Season Preparation Guide**\n\n**For Crops:**\n1. Apply thick mulch (4-6 inches)\n2. Install drip irrigation systems\n3. Plant drought-resistant varieties\n4. Harvest rainwater during wet season\n5. Use shade cloth for sensitive crops\n\n**For Livestock:**\n1. Stockpile hay and silage (3-4 months supply)\n2. Plant drought-tolerant fodder (Leucaena, Sorghum)\n3. Dig additional water storage\n4. Reduce herd size if necessary\n5. Provide protein supplements\n\n**Timeline:** Start preparations 2-3 months before dry season begins.",
      severity: "high",
      actionItems: ["Stock feed supplies", "Check water storage", "Plan feed strategy"]
    };
  }
  
  // Default response
  return {
    answer: "🌱 **FarmWise Advisor**\n\nI'm here to help you with your farming questions! Here are some topics I can assist with:\n\n• **Crops:** Planting times, watering, fertilizing, pest control, disease management\n• **Livestock:** Feeding, vaccination schedules, health signs, vet care\n• **Seasonal:** Dry season prep, rainy season management, weather adaptation\n• **Storage:** Produce preservation, feed storage, equipment care\n\nWhat specific farming topic would you like to learn about?",
    severity: "info",
    actionItems: ["Ask a specific question", "Check seasonal tips", "View reminders"]
  };
}

// Chat endpoint
router.post('/ask', auth, async (req, res) => {
  const { question } = req.body;
  const db = req.db;
  const userId = req.user.userId;
  
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }
  
  try {
    // Get user context
    const userResult = await db.query(
      'SELECT farm_type, region, crop_type, livestock_type FROM users WHERE id = $1',
      [userId]
    );
    
    const userContext = userResult.rows[0] || { farm_type: 'crops', region: 'temperate' };
    
    // Generate response
    const response = generateResponse(question, userContext);
    
    // Save chat history
    await db.query(
      `INSERT INTO chat_history (user_id, question, answer, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, question, response.answer]
    );
    
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chat history
router.get('/history', auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;
  
  try {
    const result = await db.query(
      `SELECT id, question, answer, created_at
       FROM chat_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    
    res.json({ history: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;