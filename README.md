# Start Up – Web Prototype

A lightweight, static prototype of the dashboard shown in your screenshot. Built with vanilla HTML/CSS/JS. No build step required.

## Run

- **Integrated Server (Recommended):**
  ```bash
  cd prototype/backend
  npm install
  npm start
  ```
  - Then open `http://localhost:3000` in your browser.

- **Or use Python server (frontend only):**
  ```bash
  cd prototype
  python -m http.server 5500
  ```
  - Then open `http://localhost:5500` in your browser.

## Structure

- `index.html` – Markup for the device frame and dashboard
- `styles.css` – Visual styling to match the design
- `app.js` – Small interactions (tab active state, search filter, ripple)

## Notes

- This is a static prototype: navigation buttons are non-routed.
- Replace emojis with SVGs or icons as needed.
- Edit colors in `:root` of `styles.css` to theme quickly.

## Prototype flow

- Start at `login.html` to see the sign-in screen styled like the app.
- Submitting the form (any non-empty values) redirects to `index.html` (dashboard).
- Use the "Log out" link on the dashboard header to go back to `login.html`.
