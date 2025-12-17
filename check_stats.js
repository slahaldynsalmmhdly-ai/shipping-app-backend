const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const allUsers = await User.find({}).select('notifications');
  const allTypes = {};
  
  allUsers.forEach(u => {
    u.notifications.forEach(n => {
      allTypes[n.type] = (allTypes[n.type] || 0) + 1;
    });
  });
  
  console.log('All notification types:', JSON.stringify(allTypes, null, 2));
  await mongoose.disconnect();
}
check();
