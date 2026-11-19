/*
  ====== هنا تعدّل محتوى الهايلايتات ======

  كل هايلايت إله:
    title  : الاسم اللي يطلع تحت الدائرة
    cover  : صورة الغلاف (اختياري) مثل "assets/highlights/work/cover.jpg"
    emoji  : إذا ما عندك غلاف، يطلع هذا الإيموجي بالدائرة
    stories: قائمة الستوريات

  كل ستوري:
    { type: "image", src: "assets/highlights/work/1.jpg" }
    { type: "video", src: "assets/highlights/work/1.mp4" }
    { type: "text",  title: "...", text: "...", bg: "لون أو تدرّج" }   ← هذا مؤقت لحد ما تحط صورك

  duration بالثواني (اختياري، الافتراضي 5 للصور، والفيديو ياخذ طوله).
*/

const G = {
  sunset: "linear-gradient(160deg,#f58529,#dd2a7b 55%,#8134af)",
  ocean: "linear-gradient(160deg,#0ea5e9,#6366f1)",
  night: "linear-gradient(160deg,#1e1b4b,#7c3aed)",
  mint: "linear-gradient(160deg,#10b981,#0ea5e9)",
  gold: "linear-gradient(160deg,#f59e0b,#ef4444)",
  ink: "linear-gradient(160deg,#111827,#374151)",
};

window.SITE = {
  links: {
    whatsapp: "https://wa.me/9647700000000",       // ← بدّل الرقم
    instagram: "https://instagram.com/prostudio",  // ← بدّل اليوزر
  },

  highlights: [
    {
      title: "أعمالنا",
      emoji: "🎬",
      stories: [
        { type: "text", bg: G.sunset, title: "أعمالنا", text: "هنا تنحط صور وفيديوهات من شغلكم" },
        { type: "text", bg: G.night, title: "تصوير منتجات", text: "إضاءة احترافية وخلفيات نظيفة" },
        { type: "text", bg: G.ocean, title: "ريلز ومونتاج", text: "فيديوهات قصيرة جاهزة للنشر" },
      ],
    },
    {
      title: "الأسعار",
      emoji: "💰",
      stories: [
        { type: "text", bg: G.gold, title: "باقة البداية", text: "١٠ صور معدّلة + ريل واحد" },
        { type: "text", bg: G.sunset, title: "الباقة الشهرية", text: "محتوى كامل لصفحتك طول الشهر" },
      ],
    },
    {
      title: "آراء الزبائن",
      emoji: "⭐",
      stories: [
        { type: "text", bg: G.mint, title: "⭐⭐⭐⭐⭐", text: "«شغل نظيف وتسليم بالوقت»" },
        { type: "text", bg: G.ocean, title: "⭐⭐⭐⭐⭐", text: "«الفيديو جاب تفاعل ما متوقعينه»" },
      ],
    },
    {
      title: "الاستوديو",
      emoji: "📸",
      stories: [
        { type: "text", bg: G.ink, title: "الاستوديو", text: "صور المكان والمعدات" },
        { type: "text", bg: G.night, title: "خلف الكواليس", text: "شلون نشتغل خطوة بخطوة" },
      ],
    },
    {
      title: "عروض",
      emoji: "🔥",
      stories: [
        { type: "text", bg: G.gold, title: "عرض هالشهر", text: "خصم ٢٠٪ على أول حجز" },
      ],
    },
    {
      title: "تواصل",
      emoji: "📞",
      stories: [
        { type: "text", bg: G.mint, title: "تواصل ويانه", text: "واتساب أو رسالة بالانستا" },
      ],
    },
  ],

  // المنشورات بشبكة الأعمال (مؤقتة، بدّلها بصور: { src: "assets/posts/1.jpg" })
  posts: [
    { bg: G.sunset, label: "تصوير منتجات" },
    { bg: G.night, label: "ريل إعلاني" },
    { bg: G.ocean, label: "هوية بصرية" },
    { bg: G.mint, label: "تصوير مطاعم" },
    { bg: G.gold, label: "بوستر" },
    { bg: G.ink, label: "خلف الكواليس" },
    { bg: G.ocean, label: "مونتاج" },
    { bg: G.sunset, label: "تصوير فعاليات" },
    { bg: G.night, label: "موشن" },
  ],
};
