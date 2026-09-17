<div align="center">

<img src="https://raw.githubusercontent.com/user7210unix/start/refs/heads/main/assets/macro-bg-fade.png" width="100%" alt="" />

<br />

# start

### a wine-red file manager for bookmarks

<br />

![HTML5](https://img.shields.io/badge/HTML5-08050a?style=flat-square&logo=html5&logoColor=e9d0c6)
![CSS3](https://img.shields.io/badge/CSS3-08050a?style=flat-square&logo=css3&logoColor=e9d0c6)
![JavaScript](https://img.shields.io/badge/JavaScript-08050a?style=flat-square&logo=javascript&logoColor=e9d0c6)
![No build step](https://img.shields.io/badge/build%20step-none-400101?style=flat-square)
![No dependencies](https://img.shields.io/badge/dependencies-zero-400101?style=flat-square)
![Storage](https://img.shields.io/badge/storage-localStorage-400101?style=flat-square)

[Live demo](https://user7210unix.github.io/start/) · [Report a bug](../../issues)

</div>

<br />

`start` replaces a flat list of links with a small isometric desktop: folders you open, sites you file inside them, and a window that behaves like it's 1999 — it unfolds on load, blinks before it opens something, and rolls up into its title bar if you double-click the bar. Everything is one `index.html`, one stylesheet, and one script. No framework, no build step, nothing to `npm install`.

<br />

<div align="center">
<img src="https://raw.githubusercontent.com/user7210unix/start/refs/heads/main/docs/preview.png" width="720" alt="start — preview" />
<br />
<sub>root view · folder contents · new-site dialog</sub>
</div>

<br />

## Contents

- [Features](#-features)
- [Palette](#-palette)
- [Controls](#-controls)
- [Structure](#-structure)
- [Philosophy](#-philosophy)
- [License](#-license)

<br />

## ✦ Features

- **Folders, not a link soup** — sites are filed inside folders you create, navigate, rename and delete, exactly like a real file manager
- **One light source, one filter** — every icon ships in purple and is remapped to wine red at paint time by a single SVG `feComponentTransfer` ramp, so a new icon you drop in matches for free
- **Actually old animations** — `steps()` easing throughout: the window powers on in six frames, icons blink before they open, zoom-rectangles fly from icon to pane on open, folders poof into five ember particles on delete
- **Keeps what you file** — folders and sites persist to `localStorage`; nothing leaves the browser
- **Built for a keyboard** — arrow keys move the selection, <kbd>Enter</kbd> opens, <kbd>Backspace</kbd> steps up, <kbd>Delete</kbd> removes
- **A real window** — the title bar drags, the left box rolls the window up, the right box widens it
- **Holds together at 375px** — the whole shell collapses to a single-column mobile layout, no separate mobile build

<br />

## ✦ Palette

Five wine tones, one light source. Every bevel, shadow and highlight in the stylesheet is derived from these five.

| | Hex | RGB | Used for |
|:---:|:---|:---|:---|
| <img src="https://placehold.co/18x18/2f0000/2f0000.png" width="18" /> | `#2f0000` | `47, 0, 0` | deepest shadow, pane floor |
| <img src="https://placehold.co/18x18/400101/400101.png" width="18" /> | `#400101` | `64, 1, 1` | window chrome |
| <img src="https://placehold.co/18x18/310101/310101.png" width="18" /> | `#310101` | `49, 1, 1` | title bar base |
| <img src="https://placehold.co/18x18/380000/380000.png" width="18" /> | `#380000` | `56, 0, 0` | banner melt, shelf |
| <img src="https://placehold.co/18x18/330101/330101.png" width="18" /> | `#330101` | `51, 1, 1` | status bar |

All five live in `style.css` as `--wine-deep`, `--wine`, `--wine-dark`, `--wine-warm`, `--wine-mid`. Everything lighter — bevels, text, the ember accent — is a highlight computed *from* that base, not a separate palette, so the window always reads as lit from one direction.

<br />

## ✦ Controls

<table>
<tr><th align="left" colspan="2">Mouse</th></tr>
<tr><td><code>click</code></td><td>select an item</td></tr>
<tr><td><code>double-click</code></td><td>open a folder or site</td></tr>
<tr><td><code>ctrl</code> / <code>⌘</code> / <code>shift</code> + click, or middle-click</td><td>open a site in a new tab</td></tr>
<tr><td>drag title bar</td><td>move the window</td></tr>
<tr><td>double-click title bar, or left box</td><td>roll the window up / down</td></tr>
<tr><td>right box</td><td>widen the window</td></tr>
<tr><th align="left" colspan="2">Keyboard</th></tr>
<tr><td><code>← ↑ → ↓</code></td><td>move the selection</td></tr>
<tr><td><code>Enter</code></td><td>open the selected item</td></tr>
<tr><td><code>Backspace</code> / <code>Esc</code></td><td>step up to the parent folder, or close a dialog</td></tr>
<tr><td><code>Delete</code></td><td>delete the selected item</td></tr>
</table>

<br />


**Retime the animations.** Every keyframe duration in `style.css` is a multiple of one variable:

```css
--tick: 60ms;   /* raise it for something more deliberate, lower it to snap */
```

**Seed your own links.** Edit the `SEED` array at the top of `script.js` — it's only used the first time the page loads with nothing in storage.

<br />

## ✦ Structure

```
start/
├── index.html          window markup + the wine-tint SVG filter
├── style.css           palette, window chrome, keyframes
├── script.js           folder state, dialogs, animation sequencing
├── assets/
│   ├── macro-bg.jpg     the banner photo
│   └── icons/
│       ├── folder.png   purple isometric folder, tinted at paint time
│       └── page.svg     matching isometric page icon, same light
└── docs/
    └── preview.png      screenshot used above
```

<br />

## ✦ Philosophy

Every generic bookmarks page looks the same: a grid of favicons on a flat background. This one is built out of a specific memory instead — the file manager on a desktop you'd screenshot for a thread, wine-dark and slightly overlit, with a window that feels like software rather than a webpage. The isometric folder sets the light; the wine palette sets the mood; the frame-stepped animations set the era. Nothing here fades — it cuts, the way things did before easing curves got smooth.

<br />

## ✦ License

No license file yet — treat the code as reference until one is added. The folder and page icons are original artwork for this project.

<br />

<div align="center">

[back to top](#start)

</div>
