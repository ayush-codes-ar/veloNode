# VeloNode Frontend File Structure

This document outlines the file organization for the VeloNode frontend application (React + Vite).

```text
frontend/
├── dist/                   # Build output directory
├── node_modules/           # Dependencies
├── public/                 # Static assets served from root
│   └── vite.svg           # Favicon/Logo
├── src/                    # Source code
│   ├── assets/             # Images, fonts, and other static assets
│   ├── components/         # Reusable UI components
│   │   ├── ui/             # Generic UI elements (buttons, inputs)
│   │   ├── Footer.css      # Styles for Footer
│   │   ├── Footer.jsx      # Footer component
│   │   ├── Hero.css        # Styles for Hero section
│   │   ├── Hero.jsx        # Landing page Hero component
│   │   ├── HowItWorks.css  # Styles for Process section
│   │   ├── HowItWorks.jsx  # Process explanation component
│   │   ├── Navbar.css      # Styles for Navigation
│   │   ├── Navbar.jsx      # Top Navigation component
│   │   ├── Security.css    # Styles for Security section
│   │   ├── Security.jsx    # Security features component
│   │   ├── TechStack.css   # Styles for Tech Stack section
│   │   └── TechStack.jsx   # Technologies list component
│   ├── styles/             # Global styles
│   │   ├── App.css         # Main app styles
│   │   └── index.css       # Global reset and variables
│   ├── App.jsx             # Main Application Component (Router/Layout)
│   └── main.jsx            # Entry point (ReactDOM render)
├── .gitignore              # Git ignore rules
├── eslint.config.js        # Linting configuration
├── index.html              # HTML Entry point
├── package.json            # Project dependencies and scripts
└── vite.config.js          # Vite build configuration
```

## Description of Key Directories

*   **src/components/**: Contains functional React components features. Each component typically has its own `.jsx` file and a corresponding `.css` module (or file) for styling.
*   **src/styles/**: Global stylesheets, CSS variables, and resets that apply across the entire application.
*   **public/**: Assets that should be served untouched by the bundler (e.g., `robots.txt`, `favicon.ico`).
*   **dist/**: The production-ready outcome of `npm run build`.

## Component Architecture

The application follows a component-based architecture where pages are assembled from smaller, reusable sections (Hero, Navbar, Footer, etc.).
