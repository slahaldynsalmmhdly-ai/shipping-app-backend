const User = require("../models/User");
const { autoMessageCargoAds, generateWeeklyReport } = require("./aiService");

/**
 * Run only manual AI features (excluding auto posting and fleet promotion)
 * This is for the "Run Now" button in the UI
 * Auto posting and fleet promotion should ONLY run via schedule
 */
async function runManualAIFeaturesForUser(userId) {
  const results = {
    autoMessaging: null,
    weeklyReports: null,
  };

  try {
    const user = await User.findById(userId);
    if (!user || !user.aiFeatures) {
      return results;
    }

    // Only run messaging and reports manually
    // Auto posting and fleet promotion are schedule-only
    if (user.aiFeatures.autoMessaging) {
      results.autoMessaging = await autoMessageCargoAds(userId);
    }

    if (user.aiFeatures.weeklyReports) {
      results.weeklyReports = await generateWeeklyReport(userId);
    }

    return results;
  } catch (error) {
    console.error("Error in runManualAIFeaturesForUser:", error);
    return results;
  }
}

module.exports = {
  runManualAIFeaturesForUser,
};

