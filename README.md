# Forkful — Recipe Finder

A responsive recipe search app built with **Bootstrap 5** and **vanilla JavaScript**, using a live public REST API. Built as a frontend-developer portfolio project.

**Live demo:** https://eeeshika.github.io/Forkful-Recipe-Finder/
**Design source:** built directly to a custom design plan (see `style.css` header comment for the token system)

## Features

- **Search** recipes by name via a REST API (`fetch` + `async/await`)
- **Browse by category** using dynamically-loaded filter chips
- **Recipe detail modal** with full ingredients list, instructions, and a YouTube link when available
- **Save favorites** — persisted in `localStorage`, no backend required
- Loading, empty, error, and no-results states handled explicitly
- Fully responsive: 1 column on mobile → 4 columns on desktop

## Tech stack

- HTML5 / CSS3 (custom design system, no framework overrides beyond Bootstrap utilities)
- Bootstrap 5 (grid, modal, navbar, responsive utilities)
- Vanilla JavaScript (DOM manipulation, `fetch`, `localStorage`, event delegation)
- [TheMealDB](https://www.themealdb.com/api.php) — free public API, no key required

## Why this project

Built to demonstrate:

- Converting a design plan into a responsive, cross-browser interface
- Real REST API integration (not mocked) — search, filter, and detail-lookup endpoints
- Clean, commented, reusable vanilla JS with no framework dependency
- Client-side state persistence (`localStorage`) without a backend


## Project structure

```
index.html   — markup & structure
style.css    — design system (colors, type, components)
script.js    — API calls, rendering, favorites logic
```
