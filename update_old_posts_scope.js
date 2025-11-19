/**
 * سكريبت لتحديث المنشورات القديمة بدون حقل scope
 * 
 * هذا السكريبت يضيف حقل scope للمنشورات القديمة:
 * - المنشورات بدون country أو country: null → scope: 'global'
 * - المنشورات مع country محدد → scope: 'local'
 * 
 * تشغيل السكريبت:
 * node update_old_posts_scope.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Post = require('./models/Post');

async function updateOldPosts() {
  try {
    console.log('🔄 جاري الاتصال بقاعدة البيانات...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ تم الاتصال بقاعدة البيانات\n');
    
    // 1. عد المنشورات بدون scope
    const noScopeCount = await Post.countDocuments({ scope: { $exists: false } });
    console.log(`📊 عدد المنشورات بدون scope: ${noScopeCount}\n`);
    
    if (noScopeCount === 0) {
      console.log('✅ جميع المنشورات لديها scope بالفعل!');
      await mongoose.connection.close();
      return;
    }
    
    // 2. تحديث المنشورات القديمة مع country محدد → scope: 'local'
    console.log('🔄 تحديث المنشورات المحلية القديمة...');
    const localResult = await Post.updateMany(
      { 
        scope: { $exists: false },
        country: { $exists: true, $ne: null }
      },
      { 
        $set: { scope: 'local' }
      }
    );
    console.log(`✅ تم تحديث ${localResult.modifiedCount} منشور محلي\n`);
    
    // 3. تحديث المنشورات القديمة بدون country → scope: 'global'
    console.log('🔄 تحديث المنشورات العالمية القديمة...');
    const globalResult = await Post.updateMany(
      { 
        scope: { $exists: false },
        $or: [
          { country: null },
          { country: { $exists: false } }
        ]
      },
      { 
        $set: { scope: 'global' }
      }
    );
    console.log(`✅ تم تحديث ${globalResult.modifiedCount} منشور عالمي\n`);
    
    // 4. التحقق من النتائج
    console.log('📊 التحقق من النتائج النهائية...');
    const globalCount = await Post.countDocuments({ scope: 'global' });
    const localCount = await Post.countDocuments({ scope: 'local' });
    const remainingNoScope = await Post.countDocuments({ scope: { $exists: false } });
    const totalCount = await Post.countDocuments({});
    
    console.log('\n📈 الإحصائيات النهائية:');
    console.log(`- إجمالي المنشورات: ${totalCount}`);
    console.log(`- منشورات عالمية (scope: 'global'): ${globalCount}`);
    console.log(`- منشورات محلية (scope: 'local'): ${localCount}`);
    console.log(`- منشورات بدون scope: ${remainingNoScope}`);
    
    if (remainingNoScope > 0) {
      console.log('\n⚠️  تحذير: لا تزال هناك منشورات بدون scope!');
      console.log('يرجى التحقق من البيانات يدوياً.');
    } else {
      console.log('\n✅ تم تحديث جميع المنشورات بنجاح!');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ تم إغلاق الاتصال بقاعدة البيانات');
    
  } catch (error) {
    console.error('\n❌ حدث خطأ:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// تشغيل السكريبت
updateOldPosts();
