/**
 * CSS Modules Export for ES6 Compatibility
 * Peppino's Dosa Restaurant Website
 * 
 * This file provides ES6 module exports for CSS files
 * to enable modular JavaScript development
 */

// Core CSS Modules
export const variables = './variables.css';
export const reset = './reset.css';
export const typography = './typography.css';
export const components = './components.css';

// Layout Components
export const preloader = './preloader.css';
export const header = './header.css';
export const hero = './hero.css';

// Page Sections
export const service = './service.css';
export const about = './about.css';
export const specialDish = './special-dish.css';
export const menu = './menu.css';
export const testimonials = './testimonials.css';
export const reservation = './reservation.css';
export const features = './features.css';
export const event = './event.css';
export const footer = './footer.css';

// Responsive Design
export const mediaQueries = './media-queries.css';

// Theme Overrides
export const custom = './custom.css';

// Main CSS Bundle
export const main = './main.css';

/**
 * CSS Module Loader Function
 * Dynamically loads CSS modules for component-based development
 * 
 * @param {string|string[]} modules - CSS module name(s) to load
 * @returns {Promise} Promise that resolves when CSS is loaded
 */
export function loadCSSModules(modules) {
  const moduleArray = Array.isArray(modules) ? modules : [modules];
  
  return Promise.all(
    moduleArray.map(module => {
      return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = module;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
      });
    })
  );
}

/**
 * Component CSS Loader
 * Loads specific CSS modules for individual components
 * 
 * @param {string} componentName - Name of the component
 * @returns {Promise} Promise that resolves when component CSS is loaded
 */
export function loadComponentCSS(componentName) {
  const cssModules = {
    'preloader': [variables, reset, typography, preloader],
    'header': [variables, reset, typography, components, header],
    'hero': [variables, reset, typography, components, hero],
    'service': [variables, reset, typography, components, service],
    'about': [variables, reset, typography, components, about],
    'special-dish': [variables, reset, typography, components, specialDish],
    'menu': [variables, reset, typography, components, menu],
    'testimonials': [variables, reset, typography, components, testimonials],
    'reservation': [variables, reset, typography, components, reservation],
    'features': [variables, reset, typography, components, features],
    'event': [variables, reset, typography, components, event],
    'footer': [variables, reset, typography, components, footer]
  };
  
  const modules = cssModules[componentName];
  if (!modules) {
    throw new Error(`Component "${componentName}" not found`);
  }
  
  return loadCSSModules(modules);
}

/**
 * Theme Loader
 * Loads theme-specific CSS overrides
 * 
 * @param {string} theme - Theme name ('default', 'dark', 'light', etc.)
 * @returns {Promise} Promise that resolves when theme CSS is loaded
 */
export function loadTheme(theme = 'default') {
  const themeModules = {
    'default': [custom],
    'white': [custom], // Current white theme with gold accents
    // Future themes can be added here
  };
  
  const modules = themeModules[theme];
  if (!modules) {
    throw new Error(`Theme "${theme}" not found`);
  }
  
  return loadCSSModules(modules);
}

// Default export for convenience
export default {
  variables,
  reset,
  typography,
  components,
  preloader,
  header,
  hero,
  service,
  about,
  specialDish,
  menu,
  testimonials,
  reservation,
  features,
  event,
  footer,
  mediaQueries,
  custom,
  main,
  loadCSSModules,
  loadComponentCSS,
  loadTheme
};
