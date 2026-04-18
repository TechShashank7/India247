# Design System Specification: India247 Civic Platform

## 1. Overview & Creative North Star
This design system is built upon the Creative North Star of **"The Digital Architect."** 

The mission is to move civic engagement away from the cold, bureaucratic aesthetics of traditional government portals and toward an editorial, high-end experience that feels both authoritative and accessible. We achieve this by blending the structural reliability of a government entity with the fluid, modern interface of a premium consumer app.

The "template" look is intentionally broken through:
*   **Intentional Asymmetry:** Using staggered card layouts and varied column widths to guide the eye naturally rather than rigidly.
*   **Breathing Room as a Feature:** Excessive whitespace is treated as a premium "material" that reduces cognitive load and communicates transparency.
*   **Tonal Depth:** Replacing harsh lines with sophisticated, layered surfaces that suggest a physical, tactile environment.

---

## 2. Color & Surface Philosophy
The palette is a dialogue between the energetic **Saffron (`primary`)**—representing action and progress—and a deep, institutional **Navy (`secondary`)** that grounds the experience in trust.

### The "No-Line" Rule
To maintain a high-end editorial feel, **1px solid borders are prohibited** for sectioning. Contrast and containment must be achieved through:
*   **Background Shifts:** Distinguish sections by moving from `surface` to `surface-container-low`.
*   **Tonal Transitions:** Use soft, value-based changes to define where one piece of content ends and another begins.

### Surface Hierarchy & Nesting
The UI is a series of stacked, physical layers. Use the `surface-container` tiers to create depth:
1.  **Canvas:** `surface` (#f7f9fb) – The base layer.
2.  **Sectioning:** `surface-container-low` (#f2f4f6) – For large background blocks.
3.  **Content Cards:** `surface-container-lowest` (#ffffff) – The highest "elevation" for primary interaction points, providing maximum contrast.

### Glass & Gradient Rule
*   **Glassmorphism:** For floating navigation bars or action sheets, use a semi-transparent `surface` color with a `backdrop-blur (20px)`. This integrates the UI with the content beneath it.
*   **Signature Textures:** Main CTAs (Primary Buttons) should utilize a subtle linear gradient from `primary` (#a73300) to `primary_container` (#d14405) to add a 3D "soul" to the button that flat color cannot provide.

---

## 3. Typography
The system uses a dual-type approach to balance personality with readability.

*   **Display & Headlines (Plus Jakarta Sans):** Chosen for its modern, geometric structure. Large scales (e.g., `display-lg` at 3.5rem) should be used with tight letter-spacing to create an authoritative, editorial impact.
*   **Body & Titles (Manrope):** A high-performance sans-serif that ensures legibility in dense civic reports or data-heavy lists. 

**Identity through Scale:** We utilize high-contrast typography scales. A massive headline (`headline-lg`) paired with a much smaller, high-tracking label (`label-md`) creates a sophisticated hierarchy that feels designed, not just "inputted."

---

## 4. Elevation & Depth
Depth is a functional tool for hierarchy, not a decorative flourish.

*   **The Layering Principle:** Avoid drop shadows for static cards. Instead, place a `surface-container-lowest` card on a `surface-container` background. The subtle shift in hex value creates a "natural lift."
*   **Ambient Shadows:** For interactive or floating elements (e.g., Modals), use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(25, 28, 30, 0.06);`. The shadow color must be a tint of `on-surface`, never pure black.
*   **The Ghost Border:** If a boundary is strictly required for accessibility (e.g., Input fields), use the `outline-variant` at **15% opacity**. This provides a "hint" of a container without breaking the soft aesthetic.

---

## 5. Components

### Buttons
*   **Primary:** Uses the Saffron gradient. `borderRadius: 1.5rem (md)`. Padding: `16px 32px`.
*   **Secondary:** `secondary_container` background with `on_secondary_container` text. No border.
*   **Tertiary:** Transparent background; Navy typography; `on_surface` icon.

### Cards & Civic Reports
*   **Style:** Forbid divider lines between header and body. Use `2rem (lg)` padding to separate content.
*   **Roundedness:** Always use `DEFAULT (1rem)` or `md (1.5rem)` for card containers.
*   **Nesting:** Place a "Status Chip" (e.g., Pending, Resolved) inside a card using `surface-container-high` to create a nested "well" effect.

### Input Fields
*   **Style:** `surface-container-lowest` background with a 1px "Ghost Border."
*   **Focus State:** Border transitions to `primary` (#a73300) at 100% opacity with a soft 4px `primary_fixed` outer glow.

### Interactive Chips
*   **Selection:** Use `secondary_fixed` for unselected and `primary` for selected.
*   **Shape:** Always `full (9999px)` pill shape for high-speed visual scanning.

### Custom Component: The "Progress Stepper"
For civic tracking, use a vertical line-less stepper. Utilize `primary` dots connected by a simple background color shift in the gutter to represent "pathway" without visual clutter.

---

## 6. Do's and Don'ts

### Do
*   **DO** use `xl (3rem)` corner radius for large hero sections or featured containers to emphasize the "friendly" nature of the platform.
*   **DO** leave at least `32px` of margin between major UI sections. Space is the primary tool for organization.
*   **DO** use semi-transparent Navy (`on_surface_variant`) for secondary metadata to keep the focus on Primary Headlines.

### Don'ts
*   **DON'T** use 1px solid Navy borders. It creates a "boxed-in" feeling that contradicts the modern, open brand.
*   **DON'T** use harsh 0px or 4px corners. The minimum radius is `sm (0.5rem)` for small chips, and `DEFAULT (1rem)` for everything else.
*   **DON'T** stack more than three levels of surface containers. Too much nesting creates "visual vibration" and confuses the hierarchy.
*   **DON'T** use standard grey shadows. Always tint shadows with the platform's Navy (`on_surface`) to maintain color harmony.

## 7. Color Tokens

* `customColor`: `#E8541A`
* `overridePrimaryColor`: `#E8541A`
* `overrideSecondaryColor`: `#002147`
* `background`: `#f7f9fb`
* `surface`: `#f7f9fb`
* `surface_container`: `#eceef0`
* `surface_container_low`: `#f2f4f6`
* `surface_container_lowest`: `#ffffff`
* `primary`: `#a73300`
* `primary_container`: `#d14405`
* `secondary`: `#465f88`
* `secondary_container`: `#b6d0ff`
* `error`: `#ba1a1a`
* `on_surface`: `#191c1e`
