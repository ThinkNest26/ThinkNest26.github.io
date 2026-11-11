const HELP_AR = {
  students: { ic: '🎒', name: 'الطلاب', qs: [
    ['كيف أنضم إلى دورة؟', 'افتح <b>الدورات عبر الإنترنت ← ابحث عن دورة</b>، وتظهر دورات منهجك وصفّك أولًا. اضغط <b>عرض تفاصيل الدورة</b> ثم <b>سجّل في هذه الدورة</b>: اختر موعدًا واملأ النموذج القصير. إذا كان عمرك أقل من 16 سنة، يُطلب من وليّ أمرك الموافقة أولًا، ثم يؤكّد المعلّم مكانك ويصلك إشعار 🔔. بعدها تظهر الدورة في <b>دوراتي</b>.'],
    ['ماذا لو كانت الدورة أو الموعد ممتلئًا؟', 'اضغط <b>📋 انضم إلى قائمة الانتظار</b> في صفحة الدورة. عندما يتوفّر مكان، يُرسل طلبك إلى المعلّم تلقائيًا ويتم إبلاغك.'],
    ['أين أجد أوراق العمل والاختبارات والأنشطة؟', 'افتح <b>دوراتي</b>، واختر الدورة ثم الدرس. ستجد كل ما أضافه معلّمك تحت كل درس. تُصحَّح الاختبارات فورًا، أما بقية الأعمال فيصحّحها معلّمك.'],
    ['كيف أسلّم عملي؟', 'افتح النشاط داخل الدرس، واكتب إجابتك أو ارفع صورة أو ملفًا، ثم اضغط <b>تسليم</b>. بعض المهام لها عدد محدّد من مرات التسليم، وتخبرك الصفحة كم مرة بقيت. يصلك إشعار 🔔 عندما يصحّح معلّمك عملك.'],
    ['ما هي قائمة المهام؟', 'تعرض صفحتك <b>الرئيسية</b> قسم <b>📝 المهام</b>: الأعمال المطلوبة قريبًا أو المتأخرة في جميع دوراتك. اضغط على أي منها لفتحها.'],
    ['ما هي مجموعتي؟', 'كل موعد في الدورة هو <b>مجموعة</b>، مثل «الأحد والأربعاء، 5–7 مساءً». تنضم إليها عند تأكيد مكانك. افتح الدورة لتجد <b>👥 مجموعتك</b> مع مجتمعها ومصادرها وأعضائها.'],
    ['كيف أنضم إلى حصة مباشرة؟', 'تجد حصص مجموعتك في <b>تقويمي</b> وفي صفحة الدورة. اضغط <b>📅 أضف إلى تقويمي</b> لإضافتها إلى تقويم هاتفك أو حاسوبك. يصلك تذكير قبل كل حصة.'],
    ['كيف أحجز جلسة إرشاد؟', 'افتح <b>الدورات عبر الإنترنت ← المرشدون</b> واضغط <b>احجز جلسة</b>. إذا كان عمرك أقل من 16 سنة، يُطلب من وليّ أمرك الموافقة أولًا. عندما يقبل المرشد تظهر الجلسة في تقويمك، مع زر <b>▶ انضم الآن</b> قبل بدئها. لكل جلسة <b>💬 محادثة الجلسة</b> مشتركة مع المرشد ووليّ أمرك، ويكتب فيها المرشد ملخّصًا بعد الجلسة.'],
    ['ما هي نقاط نست والأوسمة؟', 'تحصل على نقاط نست عند تسليم الأعمال، والحصول على الدرجة الكاملة، وإنهاء الدروس، وحضور الحصص، ومساعدة الآخرين. اجمع الأوسمة وانتقل من 🥚 فرخ صغير إلى 🏆 نسر! تجد كل ذلك في <b>تقدّمي ← مكافآتي</b>.'],
    ['كيف أضيف صديقًا؟', 'افتح <b>الأصدقاء والمجتمع ← أصدقائي</b> وابحث عن زميل في إحدى مجموعات دوراتك أو مجموعات الدراسة. يمكنكما الدردشة على انفراد بعد أن يوافق كلاكما. يراك الطلاب الآخرون باسمك الأول والحرف الأول من اسم عائلتك، مثل «جنى ع.».'],
    ['كيف أنزّل شهادتي؟', 'افتح <b>تقدّمي ← شهاداتي</b>، واضغط <b>فتح وتنزيل</b>، ثم <b>تنزيل PDF / طباعة</b> واختر <b>حفظ بصيغة PDF</b>.'],
    ['كيف أغادر دورة؟', 'افتح الدورة واضغط <b>مغادرة هذه الدورة</b> (أسفل تفاصيل الدورة). يُعرض مكانك على الطالب التالي ويُبلَّغ معلّمك.'],
    ['عمري أقل من 13 سنة. هل يمكنني التسجيل بنفسي؟', 'لا. يجب أن يسجّل وليّ أمرك أولًا ويضيفك، ثم يرسل لك رابط دعوة خاصًا لإكمال انضمامك.']
  ] },
  parents: { ic: '👪', name: 'أولياء الأمور', qs: [
    ['كيف أضيف ابني أو ابنتي؟', 'يمكنك إضافة أبنائك عند التسجيل، أو لاحقًا من <b>أبنائي ← تسجيل ابن/ابنة آخر</b>. إذا لم يكن لدى طفلك حساب بعد، انسخ <b>رابط الدعوة</b> الخاص به وأرسله له: ستكون بياناته معبّأة مسبقًا وسيُربط بك تلقائيًا.'],
    ['ما هو الحساب العائلي المرتبط؟', 'مع الحساب العائلي المرتبط، يُربط أبناؤك بك مباشرة دون أن يحتاجوا إلى قبول طلب. يمكنك رؤية دوراتهم وتقدّمهم وشهاداتهم ومكافآتهم وحضورهم ومحادثاتهم.'],
    ['كيف أتابع تقدّم طفلي؟', 'افتح <b>أبنائي</b> واضغط على اسم طفلك لترى دوراته وأنشطته وشهاداته ومكافآته وحضوره وجلسات الإرشاد وأصدقاءه ومجموعاته. يعرض مربع <b>👀 يحتاج إلى انتباهك</b> كل ما ينتظر ردّك، ويصلك كل يوم أحد بريد قصير عن الأسبوع.'],
    ['كيف أطلب مكانًا لطفلي؟', 'افتح صفحة الدورة (من <b>مسارات التفكير</b> في الصفحة الرئيسية أو من رابط أُرسل إليك) واضغط <b>اطلب مكانًا</b> ثم اختر طفلك. ولأنك أنت من طلب، يذهب الطلب مباشرة إلى المعلّم ليؤكّد المكان. يمكنك الاطلاع على الدورات وملفات المعلمين حتى قبل إنشاء حساب.'],
    ['لماذا يُطلب مني الموافقة؟', 'للأطفال <b>دون 16 سنة</b> توافق قبل انضمامهم إلى دورة أو جلسة إرشاد فردية. وللأطفال <b>دون 18 سنة</b> الذين يسجّلون بأنفسهم، تؤكّد حسابهم بالبريد. يصلك إشعار أو بريد فيه <b>موافقة</b> و<b>رفض</b>.'],
    ['كيف تعمل جلسات الإرشاد؟', 'يطلب طفلك جلسة فتوافق أو ترفض، ثم يؤكّدها المرشد. يمكنك رؤية <b>💬 محادثة الجلسة</b> في صفحة طفلك والانضمام إلى المكالمة عبر <b>🎥 انضم إلى المكالمة</b>، ويصلك ملخّص المرشد بالبريد بعد الجلسة. لا يتحدّث المرشدون مع الأطفال على انفراد أبدًا.'],
    ['هل سيتم إبلاغي إذا تغيّب طفلي؟', 'نعم. إذا سجّل المعلّم طفلك غائبًا أو متأخرًا، يصلك إشعار 🔔.'],
    ['كيف أُخرج طفلي من دورة؟', 'افتح <b>أبنائي</b> واضغط على اسم طفلك، ثم اضغط <b>مغادرة هذه الدورة</b> تحت الدورة. يُبلَّغ المعلّم ويُعرض المكان على الطالب التالي.'],
    ['ما هو «ما بعد مشوار المدرسة»؟', 'هو مجتمع أولياء الأمور لدينا: ورش ومحاضرات ودورات لأولياء الأمور أنفسهم (الرفاهية والطبخ والمال والمسيرة المهنية وغيرها)، إضافة إلى <b>مقهى أولياء الأمور</b> الخاص. يمكن لأولياء الأمور المعتمَدين الانضمام فورًا.'],
    ['أنا معلّم أيضًا. هل أحتاج إلى حسابين؟', 'لا. افتح <b>إعدادات الحساب</b> واضغط <b>تقدّم للتدريس</b>. بعد الموافقة، ستحصل على منطقتي المعلّم ووليّ الأمر في حساب واحد.']
  ] },
  teachers: { ic: '👩‍🏫', name: 'المعلمون', qs: [
    ['كيف أنشئ دورة؟', 'أكمل أولًا <b>👤 ملفي كمعلّم</b>. ثم افتح <b>الدورات عبر الإنترنت ← دوراتي ← دورة جديدة</b>. تُحفظ الدورات الجديدة <b>مسوّدات</b> لا يراها غيرك. في <b>تعديل التفاصيل ← تفاصيل لأولياء الأمور</b> أضف تاريخ البدء والمواعيد (موعد في كل سطر، مثل «الأحد والأربعاء، 5–7 مساءً») والحد الأقصى لكل موعد والفئة العمرية والأهداف وفيديو الدرس التجريبي. اضغط <b>🚀 نشر</b> عندما تكون جاهزة، وسيخبرك ثينك نست إن كان ينقص شيء يحتاجه الأهل.'],
    ['كيف يعمل التسجيل؟', 'يطلب الطلاب مكانًا، ويوافق الأهل أولًا لمن هم دون 16 سنة. افتح دورتك ← <b>📝 طلبات التسجيل</b> لتضغط <b>موافقة</b>، أو <b>رفض</b> مع سبب يراه الطالب. حدّد عدة طلاب واضغط <b>✅ الموافقة على المحدد</b> للموافقة دفعة واحدة. عند امتلاء موعد ينضم الطلاب إلى قائمة الانتظار، ويُرسل لك التالي عندما يتوفّر مكان.'],
    ['ما هي المجموعات؟', 'كل موعد هو <b>مجموعة</b> تُنشأ تلقائيًا، وينضم إليها الطلاب المقبولون. افتح دورتك ← <b>👥 المجموعات</b> لتجد لكل مجموعة مجتمعها وحضورها ومصادرها ونجومها وتقاريرها. لنقل طالب إلى موعد آخر استخدم القائمة في تبويب <b>الطلاب</b>، ولإنهاء مكانه اضغط <b>إزالة</b> واذكر السبب.'],
    ['كيف أضيف الدروس وأنشرها؟', 'في دورتك أضف درسًا واختر <b>انشر الآن</b> أو <b>احفظ كمسوّدة</b> أو <b>انشر في تاريخ</b>. استخدم <b>تعديل</b> لتغيير الدرس، أو إضافة عدة أهداف، أو منح كل مجموعة <b>تاريخًا مختلفًا</b>. يُبلَّغ الطلاب عندما يُنشر الدرس.'],
    ['كيف أضيف الأنشطة؟', 'افتح الدرس واضغط <b>+ أضف إلى هذا الدرس</b>، واختر من 10 أدوات: رفع ملفات ونماذج واختبارات وأوراق عمل وفيديوهات ومهام كتابية وبطاقات وغيرها، وكثير منها بمساعدة Gemini. استخدم <b>تعديل</b> لتغيير أي نشاط لاحقًا، واختر كم مرة يمكن للطلاب التسليم.'],
    ['كيف أصحّح الأعمال؟', 'تُصحَّح الاختبارات تلقائيًا. أما بقية الأعمال، فافتح النشاط في دورتك لترى ما سلّمه الطلاب، وأضف درجة وتعليقًا. سيصل للطلاب إشعار.'],
    ['كيف أسجّل الحضور؟', 'افتح دورتك ← <b>👥 المجموعات</b> ← <b>📋 الحضور</b> للمجموعة، أو استخدم <b>📋 الحضور</b> في القائمة الجانبية لسجلات اليوم. يُبلَّغ الأهل تلقائيًا عند غياب الطفل أو تأخّره.'],
    ['كيف أجهّز الحصص المباشرة؟', 'افتح دورتك ← <b>👥 المجموعات</b> ← <b>📅 جدولة الحصص المباشرة</b>. اختر الأيام والوقت والمدة والتواريخ ورابط الاجتماع، فتُنشأ كل الحصص لتلك المجموعة. يصل الطلاب تذكير قبل كل حصة.'],
    ['كيف أضيف الفيديوهات؟', '<b>تبويب التسجيلات:</b> الصق رابط يوتيوب أو Vimeo أو Google Drive، أو ارفع ملف MP4 (حتى 50 ميغابايت، خاص بالدورة). <b>الدرس التجريبي:</b> أضفه في تعديل التفاصيل. <b>فيديو التعريف:</b> أضفه في 👤 ملفي كمعلّم ليظهر في كل دوراتك.'],
    ['كيف أنسخ دورة للعام القادم؟', 'في <b>دوراتي</b> اضغط <b>📄 نسخ</b>. ستحصل على نسخة مسوّدة بكل الدروس والأنشطة والملفات ومفاتيح الإجابات، دون طلاب.'],
    ['كيف تعمل جلسات الإرشاد؟', 'فعّل <b>جلسات الإرشاد</b> في إعدادات الحساب، وأضف رابط الاجتماع ووافق على <b>اتفاقية حماية المرشدين</b>. للطلاب دون 16 سنة يوافق وليّ الأمر أولًا، ثم يمكنك <b>القبول</b> أو <b>الرفض</b> أو <b>🕒 اقتراح وقت آخر</b>. استخدم <b>💬 محادثة الجلسة</b> للملاحظات، واكتب <b>📋 ملخّصًا</b> بعد الجلسة يصل إلى الأهل بالبريد.'],
    ['كيف أحصل على شارة ✅ موثّق؟', 'في إعدادات الحساب ← <b>✅ احصل على التوثيق</b>، ارفع هويتك ومؤهّلك التعليمي وشهادة حسن السيرة والسلوك، ووافق على مدوّنة حماية الطفل. يراجعها فريق ثينك نست ويضيف الشارة إلى ملفك ودوراتك.'],
    ['كيف أمنح شهادة؟', 'اضغط <b>🏅 الشهادات</b> في القائمة الجانبية. اختر نوعًا، ودورة أو فصلًا، وحدّد الطلاب، وأضف السبب، وراجع المعاينة ثم اضغط <b>منح</b>. يُبلَّغ الطلاب وأولياء أمورهم.'],
    ['ما هو «ما بعد الجرس»؟', 'هو مجتمع المعلمين لدينا: ورش ولقاءات لنموّ المعلمين ورفاهيتهم، و<b>مقهى المعلمين</b>، و<b>قهوة وتواصل</b>. ينضم المعلمون المعتمَدون فورًا. تجد الورش التي انضممت إليها في <b>لي ← ورشي</b>، مع الورش المكتملة والشهادات.'],
    ['أنا وليّ أمر أيضًا. هل أحتاج إلى حسابين؟', 'لا. في <b>إعدادات الحساب</b>، فعّل خيار <b>أنا وليّ أمر أيضًا</b>. سيظهر قسم 👪 وليّ الأمر في القائمة الجانبية، مع زر للتبديل بين واجهتي المعلّم ووليّ الأمر.']
  ] },
  account: { ic: '🔐', name: 'الحساب والأمان', qs: [
    ['لماذا ينتظر حسابي الموافقة؟', 'يراجع فريق ثينك نست كل حساب جديد للحفاظ على أمان مجتمعنا. يستغرق ذلك عادةً أقل من يوم عمل واحد، وسيصلك بريد إلكتروني عند الموافقة.'],
    ['نسيت كلمة المرور.', 'اضغط <b>نسيت كلمة المرور؟</b> في صفحة تسجيل الدخول واكتب بريدك الإلكتروني. سنرسل لك رابطًا لاختيار كلمة مرور جديدة (تحقق من مجلد الرسائل غير المرغوب فيها أيضًا).'],
    ['كيف أفعّل تسجيل الدخول بخطوتين؟', 'افتح <b>إعدادات الحساب ← 🔐 تسجيل الدخول بخطوتين</b> واضغط <b>تفعيل</b>. امسح الرمز بتطبيق مصادقة (Google Authenticator أو Microsoft Authenticator أو Authy) واكتب الرمز المكوّن من 6 أرقام. بعدها تكتب رمزًا جديدًا في كل مرة تسجّل فيها الدخول. ننصح به لكل معلّم.'],
    ['ما هو مربع «تحقّق أنك إنسان»؟', 'يمنع البرامج الآلية من إنشاء حسابات وهمية. انتظر حتى تظهر علامة ✅ قبل الضغط على الزر. إذا لم يظهر، أعد تحميل الصفحة.'],
    ['كيف أبلّغ عن شيء ما؟', 'اضغط <b>إبلاغ</b> على أي منشور أو رسالة وسيراجعها فريق ثينك نست، ويمكنك حظر شخص من <b>أصدقائي</b>. <b>للطلاب:</b> إذا أقلقك شيء على الإنترنت، اضغط <b>🛟 أخبر شخصًا بالغًا تثق به</b> (في زاوية كل صفحة)، ولا يراه إلا فريق السلامة. إذا شعرت بعدم الأمان الآن، أخبر شخصًا بالغًا تثق به أو اتصل بـ 116111 (حماية الطفل في الإمارات) أو 999 في الطوارئ.'],
    ['لماذا يرى الطلاب الأسماء الأولى فقط؟', 'لحماية الأطفال، يرى الطلاب زملاءهم بالاسم الأول والحرف الأول من اسم العائلة، مثل «جنى ع.». يرى المعلمون وأولياء الأمور الأسماء الكاملة.'],
    ['كيف أرسل ملاحظاتي؟', 'اضغط على الأحرف الأولى من اسمك (أعلى الصفحة) واختر <b>💬 أرسل ملاحظاتك</b>. أخبرنا بما لا يعمل أو ما يربكك أو بأفكارك، فنحن نقرأ كل رسالة.'],
    ['كيف أوقف رسائل البريد الإلكتروني؟', 'افتح <b>إعدادات الحساب</b> وأوقف <b>أرسل لي تحديثات بالبريد الإلكتروني</b>. ستظل ترى الإشعارات على الجرس 🔔.'],
    ['كيف أحصل على نسخة من بياناتي؟', 'للطلاب وأولياء الأمور: افتح <b>إعدادات الحساب ← 📦 بياناتي</b> واضغط <b>تنزيل بياناتي</b>.'],
    ['كيف أحذف حسابي؟', 'افتح <b>إعدادات الحساب</b>، وانتقل إلى <b>حذف حساب</b> واضغط <b>طلب حذف الحساب</b>. يمكن لأولياء الأمور أيضًا طلب حذف حساب أبنائهم. راجع <a href="privacy.html">إشعار الخصوصية</a>.'],
    ['يبدو الموقع قديمًا أو لا يتحدّث.', 'قد يعرض متصفحك نسخة محفوظة. اضغط مع الاستمرار على <b>⌥ Option + ⌘ Command</b> ثم <b>R</b> (على ماك)، أو <b>Ctrl + F5</b> (على ويندوز).']
  ] }
};

// ===== Think Nest Help Centre =====
const HELP_EN = {
  students: { ic: '🎒', name: 'Students', qs: [
    ['How do I join a course?', 'Open <b>Online Courses → Find a course</b>. Courses for your curriculum and grade show first. Click <b>View course details</b>, then <b>Register for this course</b>: choose a class time and fill in the short form. If you’re under 16, your parent or guardian is asked to agree first. Then the teacher confirms your place, and you’re told by a 🔔 notification. The course then appears in <b>My Courses</b>.'],
    ['What if the course or class time is full?', 'Click <b>📋 Join the waiting list</b> on the course page. When a place opens, your request goes to the teacher automatically, and you’re told.'],
    ['Where are my worksheets, quizzes and activities?', 'Open <b>My Courses</b>, choose the course, then a lesson. Everything your teacher added is listed under each lesson. Quizzes are marked straight away; other work is marked by your teacher.'],
    ['How do I hand in my work?', 'Open the activity in the lesson. Type your answer, or upload a photo or file, then click <b>Hand in</b>. Some tasks can only be handed in a set number of times: the page tells you how many are left. You get a 🔔 notification when your teacher marks it.'],
    ['What is my To do list?', 'Your <b>Home</b> page shows <b>📝 To do</b>: work that is due soon or late, across all your courses. Click one to open it.'],
    ['What is my group?', 'Each class time in a course is a <b>group</b>, for example “Sun and Wed, 5–7 pm”. You join it when your place is confirmed. Open the course to find <b>👥 Your group</b>, with its community, resources and members.'],
    ['How do I join a live class?', 'Live classes for your group are in <b>My Calendar</b> and on the course page. Click <b>📅 Add to my calendar</b> to put them on your phone or computer calendar. You get a reminder before each class.'],
    ['How do I book a mentor session?', 'Open <b>Online Courses → Mentors</b> and click <b>Book a session</b>. If you’re under 16, your parent is asked to agree first. When the mentor accepts, the session is in your calendar, with <b>▶ Join now</b> just before it starts. Each session has a <b>💬 Session thread</b> shared with your mentor and your parents, where the mentor also writes a summary afterwards.'],
    ['What are Nest Points and badges?', 'You earn Nest Points for handing in work, perfect scores, finishing lessons, coming to class, and helping others. Collect badges and grow from 🥚 Hatchling to 🏆 Eagle! See <b>My Progress → My rewards</b>.'],
    ['How do I add a friend?', 'Open <b>Friends & Community → My friends</b> and search for a classmate: someone in one of your course groups or study groups. You can chat privately once you’ve both agreed. Other students see you as your first name and initial, for example “Jana E.”.'],
    ['How do I download my certificate?', 'Open <b>My Progress → My certificates</b>, click <b>Open &amp; download</b>, then <b>Download PDF / Print</b> and choose <b>Save as PDF</b>.'],
    ['How do I leave a course?', 'Open the course and click <b>Leave this course</b> (under the course details). Your place is offered to the next student, and your teacher is told.'],
    ['I’m under 13. Can I sign up myself?', 'No. A parent or guardian needs to sign up first and add you. They’ll send you a special invite link to finish joining.']
  ] },
  parents: { ic: '👪', name: 'Parents', qs: [
    ['How do I add my child?', 'You can add children when you sign up, or later from <b>My children → Enrol another child</b>. If your child doesn’t have an account yet, copy their <b>invite link</b> and send it to them: their details are filled in and they’re linked to you automatically.'],
    ['What is a joined family account?', 'With a joined family account, your children are linked to you straight away, without them needing to accept a request. You can see their courses, progress, certificates, rewards, attendance and chats.'],
    ['How do I see my child’s progress?', 'Open <b>My children</b> and click your child. You’ll see their courses, activities, certificates, rewards, attendance, mentor sessions, friends and study groups. The <b>👀 Needs your attention</b> box shows anything you need to answer, and every Sunday you get a short email about the week.'],
    ['How do I ask for a place for my child?', 'Open the course page (from <b>Think Paths</b> on the home page, or a link you were sent) and click <b>Ask for a place</b>, then choose your child. Because you asked, it goes straight to the teacher, who confirms the place. You can look at courses and teacher profiles even before you have an account.'],
    ['Why am I asked to agree?', 'For children <b>under 16</b>, you agree before they join a course or have a one-to-one mentor session. For children <b>under 18</b> who sign up themselves, you confirm their account by email. You get a notification or email with <b>Agree</b> and <b>Say no</b>.'],
    ['How do mentor sessions work?', 'Your child asks for a session, and you agree or say no. The mentor then confirms it. You can see the <b>💬 Session thread</b> on your child’s page, join the call with <b>🎥 Join the call</b>, and the mentor’s summary is emailed to you afterwards. Mentors never chat privately with children.'],
    ['Will I be told if my child is absent?', 'Yes. If a teacher marks your child absent or late, you get a 🔔 notification.'],
    ['How do I take my child off a course?', 'Open <b>My children</b>, click your child, and click <b>Leave this course</b> under the course. The teacher is told, and the place is offered to the next student.'],
    ['What is Beyond the School Run?', 'It’s our Parent Hub: workshops, talks and classes for parents themselves (wellbeing, cooking, money, careers and more), plus the private <b>Parent Café</b>. Approved parents can join straight away.'],
    ['I’m also a teacher. Do I need two accounts?', 'No. Open <b>Account settings</b> (tap your initials, top right) and click <b>Apply to teach</b>. Once approved, you’ll have both the teacher and parent areas in one account.']
  ] },
  teachers: { ic: '👩‍🏫', name: 'Teachers', qs: [
    ['How do I create a course?', 'First complete <b>👤 My teacher profile</b>. Then open <b>Online Courses → My courses → New course</b>. New courses are saved as <b>drafts</b> that only you see. In <b>Edit details → Details for parents</b>, add the start date, class times (one per line, for example “Sun and Wed, 5–7 pm”), the maximum students for each time, age range, goals and your demo lesson video. Press <b>🚀 Publish</b> when it’s ready: Think Nest tells you if anything parents need is missing.'],
    ['How do registrations work?', 'Students ask for a place, and parents agree first for under-16s. Open your course → <b>📝 Registrations</b> to <b>Approve</b>, or <b>Decline</b> with a reason the student will see. Tick several and click <b>✅ Approve selected</b> to approve many at once. When a time is full, students join a waiting list, and the next one is sent to you when a place opens.'],
    ['What are groups?', 'Each class time is a <b>group</b>, made automatically. Approved students join their group. Open your course → <b>👥 Groups</b> for each group’s community, attendance, resources, stars and report cards. To move a student to another time, use the drop-down in the <b>Students</b> tab. To end a student’s place, click <b>Remove</b> and give a reason.'],
    ['How do I add and publish lessons?', 'In your course, add a lesson and choose <b>Publish now</b>, <b>Save as a draft</b> or <b>Publish on a date</b>. Use <b>Edit</b> on a lesson to change it, add several objectives, or give each group <b>a different date</b>. Students are told when a lesson goes live.'],
    ['How do I add activities?', 'Open a lesson and click <b>+ Add to this lesson</b>. Choose from 10 tools: uploads, forms, quizzes, worksheets, videos, writing tasks, flashcards and more, many with Gemini help. Use <b>Edit</b> to change one later, and choose how many times students can hand it in.'],
    ['How do I mark work?', 'Quizzes are marked automatically. For other work, open the activity in your course to see what students handed in, add a score and a comment. Students are notified.'],
    ['How do I take attendance?', 'Open your course → <b>👥 Groups</b> → <b>📋 Attendance</b> for that group, or use <b>📋 Attendance</b> in the sidebar to see today’s registers. Parents are told automatically when a child is absent or late.'],
    ['How do I set up live classes?', 'Open your course → <b>👥 Groups</b> → <b>📅 Schedule live classes</b>. Choose the days, time, length, dates and your meeting link, and every class is created for that group. Students get reminders.'],
    ['How do I add videos?', '<b>Recordings tab:</b> paste a YouTube, Vimeo or Google Drive link, or upload an MP4 (up to 50 MB, private to the course). <b>Demo lesson:</b> add it in Edit details. <b>Introduction video:</b> add it in 👤 My teacher profile, and it shows on all your courses.'],
    ['How do I copy a course for next year?', 'On <b>My courses</b>, click <b>📄 Duplicate</b>. You get a draft copy with all the lessons, activities, files and answer keys, but no students.'],
    ['How do mentor sessions work?', 'Switch on <b>Mentor sessions</b> in Account settings, add your meeting link and tick the <b>mentor safeguarding agreement</b>. For students under 16, the parent agrees first, then you can <b>Accept</b>, <b>Reject</b> or <b>🕒 Suggest a different time</b>. Use the <b>💬 Session thread</b> for notes, and write a <b>📋 summary</b> afterwards: parents get it by email.'],
    ['How do I get the ✅ Verified badge?', 'In Account settings → <b>✅ Get verified</b>, upload your photo ID, teaching qualification and a police or good conduct certificate, and agree to the safeguarding code. The Think Nest team checks them and adds the badge to your profile and courses.'],
    ['How do I award a certificate?', 'Click <b>🏅 Certificates</b> in the sidebar. Choose a type, a course or class, tick the students, add a reason, check the preview and click <b>Award</b>. Students and parents are notified.'],
    ['What is Beyond the Bell?', 'Our Teacher Hub: workshops and meetups for teachers’ own growth and wellbeing, the <b>Teacher Café</b>, and <b>Coffee &amp; Connections</b>. Approved teachers join straight away. Workshops you join are under <b>For me → My workshops</b>, with completed ones and certificates.'],
    ['I’m also a parent. Do I need two accounts?', 'No. In <b>Account settings</b> (tap your initials, top right), tick <b>I’m also a parent</b>. A 👪 Parent section appears in your sidebar, and a switch lets you move between teacher and parent views.']
  ] },
  account: { ic: '🔐', name: 'Account & safety', qs: [
    ['Why is my account waiting for approval?', 'Every new account is checked by the Think Nest team to keep our community safe. This usually takes less than one working day, and you’ll get an email when you’re approved.'],
    ['I forgot my password.', 'Click <b>Forgot password?</b> on the log in page and type your email. We’ll email you a link to choose a new password (check your spam folder too).'],
    ['How do I turn on two-step log-in?', 'Open <b>Account settings → 🔐 Two-step log-in</b> and click <b>Turn on</b>. Scan the code with an authenticator app (Google Authenticator, Microsoft Authenticator or Authy) and type the 6-digit code. After that, you type a new code each time you log in. We recommend it for every teacher.'],
    ['What is the “Verify you are human” box?', 'It stops robots creating fake accounts. Wait for it to show a ✅ tick before clicking the button. If it doesn’t appear, refresh the page.'],
    ['How do I report something?', 'Click <b>Report</b> on any post or message, and the Think Nest team will look at it. You can also block someone from <b>My friends</b>. <b>Students:</b> if something online worries you, click <b>🛟 Tell a trusted adult</b> (bottom corner of every page). Only the safety team sees it. If you feel unsafe right now, tell an adult you trust or call 116111 (UAE Child Protection), or 999 in an emergency.'],
    ['Why do students see only first names?', 'To protect children, students see other students as a first name and initial, for example “Jana E.”. Teachers and parents see full names.'],
    ['How do I send feedback?', 'Tap your initials (top right) and choose <b>💬 Send feedback</b>. Tell us what isn’t working, what’s confusing, or your ideas. We read every message.'],
    ['How do I stop the emails?', 'Open <b>Account settings</b> (tap your initials, top right) and switch off <b>Send me email updates</b>. You’ll still see notifications on the 🔔 bell.'],
    ['How do I get a copy of my data?', 'Students and parents: open <b>Account settings → 📦 My data</b> and click <b>Download my data</b>.'],
    ['How do I delete my account?', 'Open <b>Account settings</b> (tap your initials, top right), scroll to <b>Delete an account</b> and click <b>Request account deletion</b>. Parents can also ask us to delete their child’s account. See our <a href="privacy.html">Privacy notice</a>.'],
    ['The website looks old or isn’t updating.', 'Your browser may be showing a saved copy. Hold <b>⌥ Option + ⌘ Command</b> and press <b>R</b> (Mac), or <b>Ctrl + F5</b> (Windows).']
  ] }
};
function startHelp() {
  const HELP = (typeof tnLang === 'function' && tnLang() === 'ar') ? HELP_AR : HELP_EN;
  const qs = new URLSearchParams(location.search);
  let tab = HELP[qs.get('for')] ? qs.get('for') : 'students';
  const $ = id => document.getElementById(id);
  $('help-tabs').innerHTML = Object.entries(HELP).map(([k, v]) => `<button role="tab" data-ht="${k}" aria-selected="${k === tab}"><span>${v.ic}</span>${v.name}</button>`).join('');
  const all = () => Object.entries(HELP).flatMap(([k, v]) => v.qs.map(q => ({ k, q })));
  function draw() {
    const term = $('help-search').value.trim().toLowerCase();
    document.querySelectorAll('[data-ht]').forEach(b => b.setAttribute('aria-selected', String(!term && b.dataset.ht === tab)));
    const list = term ? all().filter(x => (x.q[0] + ' ' + x.q[1]).toLowerCase().includes(term)) : HELP[tab].qs.map(q => ({ k: tab, q }));
    $('help-list').innerHTML = list.length ? list.map(({ k, q }) => `<details class="help-q"><summary>${term ? `<span class="help-tag">${HELP[k].ic} ${HELP[k].name}</span>` : ''}${q[0]}</summary><div>${q[1]}</div></details>`).join('')
      : `<p class="empty">No answers found for “${term.replace(/[<>&]/g, '')}”. Try different words, or contact us below.</p>`;
  }
  $('help-tabs').addEventListener('click', e => { const b = e.target.closest('[data-ht]'); if (!b) return; tab = b.dataset.ht; $('help-search').value = ''; draw(); });
  $('help-search').addEventListener('input', draw);
  $('tour-again').addEventListener('click', async () => {
    try { Object.keys(localStorage).filter(k => k.startsWith('tn_tour_')).forEach(k => localStorage.removeItem(k)); } catch (_) {}
    const { data: { session } } = await db.auth.getSession();
    if (!session) { location.href = 'start.html'; return; }
    location.href = (await homeFor(session.user.id)) + '?tour=1';
  });
  draw();
}
