---
description: Repository Information Overview
alwaysApply: true
---

# Peppino's Dosa Website Information

## Summary
Peppino's Dosa is a responsive restaurant website built using HTML, CSS, and JavaScript. It showcases a South Indian dosa restaurant with features including a hero slider, menu sections, about section, and contact information. The website is designed to be fully responsive across all devices.

## Structure
- **assets/**: Contains all website resources
  - **css/**: Stylesheets including modular CSS files for each component
  - **js/**: JavaScript files for website functionality
  - **images/**: Image resources for the website
- **HTML Pages**: Multiple HTML pages (index.html, menu.html, about.html, etc.)

## Language & Runtime
**Language**: HTML5, CSS3, JavaScript (ES6+)
**Build System**: None (Static HTML website)
**Package Manager**: None (No dependencies)

## Dependencies
The website uses no external JavaScript libraries or frameworks, relying on:
- **Google Fonts**: 'DM Sans' and 'Forum' fonts
- **Ionicons**: For icon elements (loaded via CDN)

## Key Features
- **Responsive Design**: Adapts to all screen sizes
- **Hero Slider**: Animated image carousel with text overlays
- **Sticky Header**: Transparent header that becomes white on scroll
- **Preloader Animation**: Loading animation before site content appears
- **Smooth Animations**: CSS transitions and JavaScript animations

## Main Files
- **index.html**: Main entry point and homepage
- **assets/css/style.css**: Main stylesheet that imports component CSS
- **assets/css/custom.css**: Custom overrides for the default theme
- **assets/js/script.js**: Main JavaScript functionality

## CSS Architecture
The CSS is organized in a modular structure:
- **variables.css**: CSS custom properties for colors, typography, etc.
- **reset.css**: CSS reset and base styles
- **components.css**: Reusable UI components
- **[section].css**: Individual files for each website section (hero.css, header.css, etc.)

## JavaScript Functionality
- **Preloader Animation**: Loading screen before site content appears
- **Hero Slider**: Automatic and manual image carousel
- **Sticky Header**: Header state changes on scroll
- **Mobile Navigation**: Toggle menu for smaller screens
- **Parallax Effects**: Mouse-based parallax animations

## Issues to Fix
1. **Hero Section Overlay**: Text not properly appearing as overlay on hero images
   - Images need to be set as background with text positioned on top
   - Z-index issues between slider background and text content

2. **Header Transition**: No smooth transition between transparent and white background
   - Need to improve transition between header states when scrolling

3. **Hero Image Sizing**: Images not taking full width/height with proper object-fit
   - Need to ensure images cover the entire hero section while maintaining aspect ratio