const PHONE = "9647738223911";

// Year
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile menu
const burger = document.getElementById("burger");
const menu = document.getElementById("menu");
burger.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  burger.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", open);
});
menu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    menu.classList.remove("open");
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  })
);

// Reveal on scroll
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// Portfolio filters
const buttons = document.querySelectorAll(".filters button");
const works = document.querySelectorAll(".work");
buttons.forEach((btn) =>
  btn.addEventListener("click", () => {
    buttons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    works.forEach((w) => w.classList.toggle("hide", f !== "all" && w.dataset.cat !== f));
  })
);

// Plan buttons preselect the service
const service = document.getElementById("service");
document.querySelectorAll("[data-plan]").forEach((a) =>
  a.addEventListener("click", () => {
    const opt = [...service.options].find((o) => o.text === a.dataset.plan);
    if (opt) service.value = opt.value;
  })
);

// Contact form -> WhatsApp
document.getElementById("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const lines = [
    "مرحباً مصطفى، أريد طلب خدمة من ProStudio:",
    `الاسم: ${d.name}`,
    d.clinic && `العيادة/المستشفى: ${d.clinic}`,
    `الخدمة: ${d.service}`,
    d.city && `الموقع: ${d.city}`,
    d.details && `التفاصيل: ${d.details}`,
  ].filter(Boolean);
  const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(lines.join("\n"))}`;
  const w = window.open(url, "_blank");
  if (!w) {
    // popup blocked: fall back to a real link click
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
});
