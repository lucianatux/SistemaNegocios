/**
 * Módulo para controlar el modo claro/oscuro
 * Guarda la preferencia del usuario en localStorage
 */

var App = App || {};

App.LightdarkModule = {
  init() {
    const savedTheme = localStorage.getItem("theme") || "light";
    this.setTheme(savedTheme);

    const toggleButton = document.getElementById("themeToggle");
    if (toggleButton) {
      toggleButton.addEventListener("click", () => this.toggleTheme());
      this.updateToggleButton();
    }
  },

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
  },

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    this.updateToggleButton();
  },

  updateToggleButton() {
    const toggleButton = document.getElementById("themeToggle");
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (toggleButton) {
      toggleButton.textContent = currentTheme === "dark" ? "☀️" : "🌙";
      toggleButton.title =
        currentTheme === "dark" ? "Modo claro" : "Modo oscuro";
    }
  },
};
