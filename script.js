document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Nav: scrolled state, mobile menu
const nav = document.querySelector(".nav");
const toggle = document.querySelector(".nav__toggle");

function onScroll() {
  nav.classList.toggle("is-scrolled", window.scrollY > 8);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll(".nav__mobile a").forEach((a) =>
  a.addEventListener("click", () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

// Highlight the nav link for the section in view
const links = document.querySelectorAll(".nav__links a");
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${entry.target.id}`));
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));

// Notebook card: run the cells one by one, once, when it scrolls into view
const notebook = document.querySelector("[data-notebook]");
if (notebook) {
  const cells = [...notebook.querySelectorAll(".cell")];
  const gutters = cells.map((c) => c.querySelector(".cell__gutter"));
  const labels = gutters.map((g) => g.textContent);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  if (reduceMotion) {
    cells.forEach((c) => c.classList.add("is-done"));
  } else {
    notebook.classList.add("nb-ready");
    gutters.forEach((g) => (g.textContent = "[ ]"));
    const run = async () => {
      await wait(600); // let the page settle first: the notebook is usually visible on load
      for (let i = 0; i < cells.length; i++) {
        cells[i].classList.add("is-running");
        gutters[i].textContent = "[*]";
        await wait(550);
        cells[i].classList.replace("is-running", "is-done");
        gutters[i].textContent = labels[i];
        await wait(120);
      }
    };
    const nbObserver = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        nbObserver.disconnect();
        run();
      },
      { threshold: 0.5 }
    );
    nbObserver.observe(notebook);
  }
}

// Case study pop-up: the card opens it on the page (cmd/ctrl-click still goes to GitHub)
document.querySelectorAll("[data-case-open]").forEach((card) => {
  const dialog = document.getElementById(card.dataset.caseOpen);
  if (!dialog) return;
  const scroller = dialog.querySelector(".cs__scroll");
  const navLinks = [...dialog.querySelectorAll(".cs__nav a")];
  const sections = navLinks.map((a) => dialog.querySelector(a.getAttribute("href")));

  card.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    scroller.scrollTop = 0;
    dialog.showModal();
  });
  dialog.querySelector("[data-case-close]").addEventListener("click", () => dialog.close());
  // Click on the dark backdrop closes it
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  // Side nav: jump within the pop-up and highlight the section being read
  let jumping = false;
  navLinks.forEach((a, i) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const s = sections[i];
      const top = s.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - parseFloat(getComputedStyle(s).scrollMarginTop);
      jumping = !reduceMotion;
      scroller.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    })
  );
  scroller.addEventListener("scrollend", () => {
    jumping = false;
    setActive();
  });
  const setActive = () => {
    const top = scroller.getBoundingClientRect().top + 120;
    let current = 0;
    sections.forEach((s, i) => {
      if (s.getBoundingClientRect().top <= top) current = i;
    });
    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) current = sections.length - 1;
    navLinks.forEach((a, i) => a.classList.toggle("is-active", i === current));
    const nav = navLinks[current].parentElement;
    if (!jumping && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = navLinks[current].offsetLeft - 16;
  };
  scroller.addEventListener("scroll", setActive, { passive: true });
  dialog.addEventListener("toggle", setActive);

  // A link ending in #case-cloud-cost opens the case study directly
  if (location.hash === `#${dialog.id}`) dialog.showModal();
});
