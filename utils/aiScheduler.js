const cron = require('node-cron');
const User = require('../models/User');
const { runAIFeaturesForUser } = require('./aiService');

/**
 * Dynamic AI Scheduler - Runs every minute and checks which users should run AI features
 * Each user can set their own schedule time and timezone
 */
function startAIScheduler() {
  // Run every minute to check for scheduled tasks
  // Cron format: * * * * * = Every minute
  cron.schedule('* * * * *', async () => {
    const currentTime = new Date();
    console.log('🔍 [AI Scheduler] Checking for scheduled AI tasks at', currentTime.toISOString());
    
    try {
      // Find all companies with AI schedule enabled
      const companies = await User.find({
        userType: 'company',
        'aiScheduleSettings.enabled': true,
        $or: [
          { 'aiFeatures.autoPosting': true },
          { 'aiFeatures.autoMessaging': true },
          { 'aiFeatures.fleetPromotion': true },
          { 'aiFeatures.weeklyReports': true }
        ]
      });

      if (companies.length === 0) {
        console.log('   ℹ️  No companies with scheduled AI features found');
        return;
      }

      console.log(`   📋 Found ${companies.length} companies with AI schedule enabled`);

      let executedCount = 0;

      for (const company of companies) {
        try {
          const shouldRun = checkIfShouldRun(company, currentTime);
          
          if (shouldRun) {
            console.log(`   ▶️  Running scheduled AI for: ${company.companyName || company.name}`);
            
            const results = await runAIFeaturesForUser(company._id);
            
            // Update last run time
            company.aiScheduleSettings.lastRun = currentTime;
            await company.save();
            
            // Log results
            if (results.autoPosting?.success) {
              console.log(`      ✅ Auto Posting: ${results.autoPosting.message}`);
            }
            if (results.autoMessaging?.success) {
              console.log(`      ✅ Auto Messaging: ${results.autoMessaging.message}`);
            }
            if (results.fleetPromotion?.success) {
              console.log(`      ✅ Fleet Promotion: ${results.fleetPromotion.message}`);
            }
            if (results.weeklyReports?.success) {
              console.log(`      ✅ Weekly Reports: ${results.weeklyReports.message}`);
            }
            
            executedCount++;
          }
        } catch (error) {
          console.error(`   ❌ Error running AI for ${company.companyName || company.name}:`, error.message);
        }
      }

      if (executedCount > 0) {
        console.log(`   ✅ Executed AI features for ${executedCount} companies`);
      }
    } catch (error) {
      console.error('❌ [AI Scheduler] Fatal error:', error);
    }
  });

  console.log('⏰ Dynamic AI Scheduler initialized - Checking every minute for scheduled tasks');
}

/**
 * Check if AI features should run for a company based on their schedule
 */
function checkIfShouldRun(company, currentTime) {
  const scheduleSettings = company.aiScheduleSettings;
  
  if (!scheduleSettings || !scheduleSettings.enabled) {
    return false;
  }

  // Get user's scheduled time (format: "HH:mm")
  const [scheduleHour, scheduleMinute] = scheduleSettings.scheduleTime.split(':').map(Number);
  
  // Get current time in user's timezone
  const userTimezone = scheduleSettings.timezone || 'Asia/Riyadh';
  const currentTimeInUserTZ = new Date(currentTime.toLocaleString('en-US', { timeZone: userTimezone }));
  
  const currentHour = currentTimeInUserTZ.getHours();
  const currentMinute = currentTimeInUserTZ.getMinutes();
  
  // Check if current time matches scheduled time (hour and minute)
  const isScheduledTime = currentHour === scheduleHour && currentMinute === scheduleMinute;
  
  // TEMPORARY: 24-hour check disabled for testing
  // Check if already ran today to avoid duplicates
  // const lastRun = scheduleSettings.lastRun;
  // if (lastRun) {
  //   const lastRunDate = new Date(lastRun);
  //   const lastRunInUserTZ = new Date(lastRunDate.toLocaleString('en-US', { timeZone: userTimezone }));
  //   const currentDateInUserTZ = new Date(currentTimeInUserTZ.toDateString());
  //   const lastRunDateInUserTZ = new Date(lastRunInUserTZ.toDateString());
  //   
  //   // If already ran today, don't run again
  //   if (currentDateInUserTZ.getTime() === lastRunDateInUserTZ.getTime()) {
  //     return false;
  //   }
  // }
  
  // Run only if it's the exact scheduled time (24-hour check disabled for testing)
  return isScheduledTime;
}

/**
 * Run AI features immediately for a specific user (manual trigger)
 */
async function runAIFeaturesNow(userId) {
  console.log(`🚀 Running AI features immediately for user ${userId}...`);
  
  try {
    const results = await runAIFeaturesForUser(userId);
    
    // Update last run time
    await User.findByIdAndUpdate(userId, {
      'aiScheduleSettings.lastRun': new Date()
    });
    
    return results;
  } catch (error) {
    console.error('Error running AI features:', error);
    throw error;
  }
}

/**
 * Run AI features for all companies immediately (for testing)
 */
async function runAIFeaturesForAll() {
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

    const results = [];
    for (const company of companies) {
      const result = await runAIFeaturesNow(company._id);
      results.push({
        companyId: company._id,
        companyName: company.companyName || company.name,
        results: result
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error running AI features for all:', error);
    throw error;
  }
}

module.exports = {
  startAIScheduler,
  runAIFeaturesNow,
  runAIFeaturesForAll
};

