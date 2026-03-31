
document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const mobilePanel = document.getElementById("mobilePanel");
  if (menuToggle && mobilePanel) {
    menuToggle.addEventListener("click", () => mobilePanel.classList.toggle("open"));
    document.querySelectorAll(".mobile-links a").forEach(link => {
      link.addEventListener("click", () => mobilePanel.classList.remove("open"));
    });
  }
});
