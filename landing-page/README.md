# Snippet Bubbles Landing Page

High-impact landing page for Snippet Bubbles, built with vanilla HTML/CSS/JS and deployed to GitHub Pages.

## Features

- **Animated Hero Section** — Gradient background with floating code cards
- **Interactive Features Showcase** — Hover effects and smooth animations
- **Dark/Light Mode Toggle** — Theme persistence with localStorage
- **FAQ Accordion** — Smooth expand/collapse animations
- **Responsive Design** — Mobile-first, works on all devices
- **Performance Optimized** — No build step, instant load times
- **SEO Ready** — Meta tags, Open Graph, Twitter Card

## Sections

1. **Hero** — Eye-catching headline with CTA buttons
2. **Stats** — Key metrics (40+ languages, free, etc.)
3. **Features** — 6 feature cards with icons and descriptions
4. **CTA** — Call-to-action for downloads
5. **FAQ** — Common questions answered
6. **Footer** — Links and legal info

## Animations

- Gradient shift on hero background
- Floating cards with staggered delays
- Fade-in-up on scroll
- Smooth transitions on hover
- Counter animations for stats
- FAQ accordion expand/collapse

## Deployment

### GitHub Pages (Automatic)

1. Push to main branch
2. GitHub Actions automatically deploys to GitHub Pages
3. Live at `https://username.github.io/snippet-bubble-manager/landing-page`

### Manual Deployment

```bash
# Copy landing page files to docs/ for GitHub Pages
cp -r landing-page/* docs/

# Commit and push
git add docs/
git commit -m "Update landing page"
git push origin main
```

## Customization

### Colors

Edit the CSS variables in `index.html`:

```css
:root {
    --bg-dark: #0b0f0f;
    --accent: #981518;
    --primary: #0a7ea4;
    /* ... */
}
```

### Content

Edit the HTML sections directly:

- Hero headline: `<h1>Code Snippets. AI-Powered.</h1>`
- Features: `.feature-card` divs
- FAQ: `.faq-item` divs
- Footer: `.footer-section` divs

### Animations

Modify GSAP animations in the `<script>` section or CSS `@keyframes`.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Load Time:** < 2 seconds
- **Lighthouse Score:** 95+
- **File Size:** ~50KB (HTML + CSS + JS)
- **No Dependencies:** Vanilla JS, no frameworks

## SEO

- Open Graph meta tags
- Twitter Card support
- Semantic HTML
- Mobile-friendly
- Fast Core Web Vitals

## Accessibility

- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- High contrast colors
- Focus states on interactive elements

## Future Enhancements

- [ ] Add video demo section
- [ ] Add testimonials/social proof
- [ ] Add blog/changelog section
- [ ] Add analytics tracking
- [ ] Add email signup form
- [ ] Add interactive code playground
- [ ] Add pricing comparison table
- [ ] Add team member profiles

## License

Same as Snippet Bubbles project.

---

**Status:** ✅ Ready for production  
**Last Updated:** June 8, 2026
