// ReAttempt landing page interactions
const navigationLinks = [...document.querySelectorAll(".navigation-link")];
const navigationMenu = document.querySelector(".navigation-menu");
const menuToggle = document.querySelector(".menu-toggle");

document.querySelector("#current-year").textContent = new Date().getFullYear();

function closeMenu() {
  navigationMenu.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
  document.body.classList.remove("menu-open");
}

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation menu" : "Close navigation menu");
  navigationMenu.classList.toggle("is-open", !isExpanded);
  document.body.classList.toggle("menu-open", !isExpanded);
});

navigationLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navigationLinks.forEach((item) => item.classList.remove("is-active"));
    link.classList.add("is-active");
    closeMenu();
  });
});

const observedSections = [...document.querySelectorAll("main section[id], main section[aria-labelledby]")];
const sectionObserver = new IntersectionObserver((entries) => {
  const visibleSection = entries
    .filter((entry) => entry.isIntersecting)
    .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

  if (!visibleSection) return;
  const sectionId = visibleSection.target.id || "top";
  navigationLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${sectionId}`);
  });
}, { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.1, 0.25, 0.5] });

observedSections.forEach((section) => sectionObserver.observe(section));

window.addEventListener("resize", () => {
  if (window.innerWidth > 680) closeMenu();
});
