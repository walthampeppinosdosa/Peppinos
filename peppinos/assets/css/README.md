# Peppino's Dosa - Modular CSS Architecture

## Overview

The CSS for Peppino's Dosa website has been refactored into a modular architecture to support modern development practices and ES6 module compatibility. This structure promotes maintainability, reusability, and scalability.

## File Structure

```
assets/css/
├── main.css              # Main CSS file with all imports
├── index.js              # ES6 module exports for CSS files
├── README.md             # This documentation file
│
├── Core Styles/
│   ├── variables.css     # CSS custom properties (colors, typography, spacing)
│   ├── reset.css         # CSS reset and base styles
│   ├── typography.css    # Typography classes and font styles
│   └── components.css    # Reusable UI components and utilities
│
├── Layout Components/
│   ├── preloader.css     # Loading screen styles
│   ├── header.css        # Header, navigation, and topbar styles
│   └── hero.css          # Hero section and slider styles
│
├── Page Sections/
│   ├── service.css       # Service cards and offerings section
│   ├── about.css         # About section styles
│   ├── special-dish.css  # Featured dish section
│   ├── menu.css          # Menu cards and food items
│   ├── testimonials.css  # Customer reviews section
│   ├── reservation.css   # Booking form and contact info
│   ├── features.css      # Features and benefits section
│   ├── event.css         # Events and news section
│   └── footer.css        # Footer and back-to-top button
│
├── Responsive Design/
│   └── media-queries.css # All responsive breakpoints
│
└── Theme Overrides/
    └── custom.css        # White theme with gold accents
```

## Usage

### Standard HTML Import

```html
<!-- Single import for all styles -->
<link rel="stylesheet" href="./assets/css/main.css">
```

### ES6 Module Usage

```javascript
// Import CSS module utilities
import cssModules from './assets/css/index.js';

// Load all CSS
cssModules.loadCSSModules(cssModules.main);

// Load specific component CSS
cssModules.loadComponentCSS('header');

// Load theme
cssModules.loadTheme('white');
```

### Individual Module Imports

```javascript
// Import specific modules
import { 
  variables, 
  components, 
  header, 
  loadComponentCSS 
} from './assets/css/index.js';

// Load only required modules
loadComponentCSS('header');
```

## CSS Modules Description

### Core Styles

- **variables.css**: Contains all CSS custom properties including colors, typography scales, spacing, shadows, and transitions
- **reset.css**: CSS reset, base element styles, and scrollbar customization
- **typography.css**: Typography classes (.headline-1, .body-1, etc.) and font definitions
- **components.css**: Reusable components like buttons, separators, form fields, and utility classes

### Layout Components

- **preloader.css**: Loading screen with animated spinner and text
- **header.css**: Fixed header, navigation menu, topbar, and mobile menu overlay
- **hero.css**: Hero slider with background images, animations, and call-to-action buttons

### Page Sections

- **service.css**: Service cards with hover effects and image patterns
- **about.css**: About section with image positioning and decorative elements
- **special-dish.css**: Featured dish showcase with pricing and description
- **menu.css**: Menu items layout, cards, and food item styling
- **testimonials.css**: Customer review section with profile images and quotes
- **reservation.css**: Booking form, contact information, and form validation styles
- **features.css**: Features grid with icons and alternating backgrounds
- **event.css**: Events cards with date overlays and hover effects
- **footer.css**: Footer layout, newsletter signup, and back-to-top button

### Responsive Design

- **media-queries.css**: Comprehensive responsive breakpoints for all screen sizes
  - Mobile: < 575px
  - Tablet: 575px - 768px
  - Desktop: 768px - 992px
  - Large Desktop: 992px - 1200px
  - Extra Large: > 1200px

### Theme Overrides

- **custom.css**: White theme implementation with gold accents, overriding the default dark theme

## Theme System

The current implementation uses a white background with gold accents theme:

- **Background**: Pure white (#ffffff)
- **Text**: Dark colors for readability
- **Accents**: Gold (#hsl(38, 61%, 73%))
- **Borders**: Light gray and gold
- **Hover Effects**: Gold highlights

## Development Guidelines

### Adding New Components

1. Create a new CSS file in the appropriate directory
2. Add the import to `main.css`
3. Export the module in `index.js`
4. Add component mapping in `loadComponentCSS` function

### Creating New Themes

1. Create a new theme CSS file
2. Add theme mapping in `loadTheme` function
3. Override CSS custom properties for consistent theming

### Best Practices

- Use CSS custom properties for consistent values
- Follow BEM naming convention where applicable
- Keep specificity low for easier overrides
- Use semantic class names
- Document complex animations and interactions

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- CSS Custom Properties support required
- ES6 modules support for JavaScript integration

## Future Enhancements

- Dark theme implementation
- CSS-in-JS integration
- Component-based CSS loading
- Build system integration
- CSS optimization and minification
