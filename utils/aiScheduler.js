const cron = require('node-cron');
const User = require('../models/User');
const { runAIFeaturesForUser } = require('./aiService');

/**
 * Schedule AI features to run automatically for all companies
 * Runs every day at 9:00 AM (Saudi Arabia time - GMT+3)
 */
function startAIScheduler() {
  // Run every day at 9:00 AM
  // Cron format: seconds minutes hours day month weekday
  // 0 0 9 * * * = Every day at 9:00 AM
  cron.schedule('0 0 9 * * *', async () => {
    console.log('🤖 [AI Scheduler] Starting daily AI features execution at', new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }));
    
    try {
      // Find all company users with at least one AI feature enabled
      const companies = await User.find({
        userType: 'company',
        $or: [
          { 'aiFeatures.autoPosting': true },
          { 'aiFeatures.autoMessaging': true },
          { 'aiFeatures.fleetPromotion': true },
          { 'aiFeatures.weeklyReports': true }
        ]
      });

      console.log(`🏢 Found ${companies.length} companies with AI features enabled`);

      let successCount = 0;
      let errorCount = 0;

      // Run AI features for each company
      for (const company of companies) {
        try {
          console.log(`▶️  Running AI features for: ${company.companyName || company.name} (${company._id})`);
          
          const results = await runAIFeaturesForUser(company._id);
          
          // Log results
          if (results.autoPosting?.success) {
            console.log(`   ✅ Auto Posting: ${results.autoPosting.message}`);
          }
          if (results.autoMessaging?.success) {
            console.log(`   ✅ Auto Messaging: ${results.autoMessaging.message}`);
          }
          if (results.fleetPromotion?.success) {
            console.log(`   ✅ Fleet Promotion: ${results.fleetPromotion.message}`);
          }
          if (results.weeklyReports?.success) {
            console.log(`   ✅ Weekly Reports: ${results.weeklyReports.message}`);
          }
          
          successCount++;
        } catch (error) {
          console.error(`   ❌ Error running AI for ${company.companyName || company.name}:`, error.message);
          errorCount++;
        }
      }

      console.log(`✅ [AI Scheduler] Completed: ${successCount} successful, ${errorCount} errors`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
      console.error('❌ [AI Scheduler] Fatal error:', error);
    }
  }, {
    timezone: "Asia/Riyadh" // Saudi Arabia timezone (GMT+3)
  });

  console.log('⏰ AI Scheduler initialized - Will run daily at 9:00 AM (Saudi Arabia time)');
}

/**
 * Optional: Run AI features immediately for testing
 */
async function runAIFeaturesNow() {
  console.log('🚀 Running AI features immediately for all companies...');
  
  try {
    const companies = await User.find({
      userType: 'company',
      $or: [
        { 'aiFeatures.autoPosting': true },
        { 'aiFeatures.autoMessaging': true },
        { 'aiFeatures.fleetPromotion': true },
        { 'aiFeatures.weeklyReports': true }
      ]
    });

    for (const company of companies) {
      const results = await runAIFeaturesForUser(company._id);
      console.log(`Completed for ${company.companyName || company.name}:`, results);
    }
  } catch (error) {
    console.error('Error running AI features:', error);
  }
}

module.exports = {
  startAIScheduler,
  runAIFeaturesNow
};

