# Logo Animation Setup Instructions

## Required Logo Files

Please add the following logo files to the `assets/images/` directory:

1. **logo-1.png** - First logo (displays initially)
2. **logo-2.png** - Second logo (shows after first rotation)
3. **logo-3.png** - Third logo (shows after second rotation)

## Logo Specifications

- **Format:** PNG with transparent background
- **Dimensions:** 120x38 pixels (for header), 90x24 pixels (for mobile navbar)
- **Quality:** High resolution for crisp display

## Animation Behavior

The logo animation creates a smooth coin-spinning effect:

1. **Initial Display:** Shows logo-1.png
2. **First Rotation:** 180° spin reveals logo-2.png
3. **Second Rotation:** 180° spin reveals logo-3.png
4. **Loop:** Returns to logo-1.png and repeats infinitely

## Animation Timing

- **Total Cycle:** 6 seconds
- **Display Time:** Each logo shows for 2 seconds
- **Rotation Time:** Smooth 180° rotation between logos
- **Pause on Hover:** Animation pauses when user hovers over logo

## Accessibility

- Animation respects `prefers-reduced-motion` setting
- Users with motion sensitivity will see only the first logo
- Smooth easing for comfortable viewing experience

## Implementation

The animation is already implemented across all HTML pages:
- index.html
- about.html
- menu.html
- contact.html
- chefs.html
- blog.html
- blog-detail-1.html
- blog-detail-2.html
- blog-detail-3.html

Simply add the three logo PNG files to complete the setup!
