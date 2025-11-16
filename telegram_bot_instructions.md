# كيفية إنشاء بوت تيليجرام والحصول على رمز الوصول (Token)

لإنشاء بوت جديد على منصة تيليجرام والبدء في التفاعل معه برمجيًا، يجب عليك اتباع الخطوات التالية باستخدام "BotFather"، وهو البوت الرسمي من تيليجرام لإدارة جميع البوتات الأخرى.

### الخطوات:

1.  **البحث عن BotFather:**
    *   افتح تطبيق تيليجرام على أي جهاز (هاتف محمول أو حاسوب).
    *   في شريط البحث، اكتب `@BotFather`.
    *   انقر على البوت الذي يظهر في نتائج البحث لبدء محادثة معه. ستجد علامة توثيق زرقاء بجانب اسمه.

2.  **بدء إنشاء بوت جديد:**
    *   ابدأ المحادثة مع `BotFather` بإرسال الأمر التالي:
        ```
        /newbot
        ```

3.  **اختيار اسم للبوت:**
    *   سيطلب منك `BotFather` اختيار اسم للبوت الخاص بك. هذا هو الاسم الذي سيظهر للمستخدمين في المحادثات.
    *   أدخل الاسم الذي تريده (مثلاً: `تطبيق الشحن الخاص بي`).

4.  **اختيار اسم مستخدم فريد:**
    *   بعد ذلك، سيطلب منك `BotFather` اختيار اسم مستخدم (Username) للبوت. يجب أن يكون هذا الاسم فريدًا وينتهي بكلمة `bot`.
    *   أدخل اسم المستخدم الذي تريده (مثلاً: `MyShippingAppBot` أو `MyShippingApp_bot`).

5.  **الحصول على رمز الوصول (Token):**
    *   إذا كان اسم المستخدم الذي اخترته متاحًا، سيقوم `BotFather` بإنشاء البوت الخاص بك وسيرسل لك رسالة تحتوي على **رمز الوصول (Token)**.
    *   هذا الرمز هو مفتاح API الخاص بك، وهو ضروري للتحكم في البوت برمجيًا. احتفظ به في مكان آمن ولا تشاركه مع أي شخص.

### مثال على المحادثة مع BotFather:

```
أنت: /newbot

BotFather: Alright, a new bot. How are we going to call it? Please choose a name for your bot.

أنت: تطبيق الشحن الخاص بي

BotFather: Good. Now let's choose a username for your bot. It must end in 'bot'. Like this, for example: TetrisBot or tetris_bot.

أنت: MyShippingAppBot

BotFather: Done! Congratulations on your new bot. You will find it at t.me/MyShippingAppBot. You can now add a description, about section and profile picture for your bot, see /help for a list of commands. By the way, when you've finished creating your cool bot, ping our Bot Support if you want a better username for it. Just make sure the bot is fully operational before you do this.

Use this token to access the HTTP API:
1234567890:ABCdEfGhIjKlMnOpQrStUvWxYz

Keep your token secure and store it safely, it can be used by anyone to control your bot.

For a description of the Bot API, see this page: https://core.telegram.org/bots/api
```

### الخطوة التالية:

بعد الحصول على رمز الوصول (Token)، يمكنك استخدامه في الكود الخاص بك لربط البوت بالخادم وإرسال واستقبال الرسائل. ستحتاج إلى تخزين هذا الرمز في متغيرات البيئة (Environment Variables) الخاصة بمشروعك لضمان أمانه.
