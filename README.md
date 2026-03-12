# Web Draw Mind Map

A powerful browser-based diagramming and mind mapping tool similar to Lucidspark. Create flowcharts, mind maps, org charts, and more with an intuitive interface.

## Features

### Shape Tools
- Rectangle, Rounded Rectangle, Ellipse
- Diamond, Triangle, Hexagon, Star
- Arrow shapes, Sticky Notes, Parallelogram
- Text tool
- Freehand Pen drawing

### Connection Tools
- **Curved Connections** (default) - Smooth bezier curves like Lucidspark
- **Elbow Connections** - Orthogonal routing
- **Straight Connections** - Simple lines
- Multiple arrow styles (filled, open, diamond, circle)
- Connection labels
- Smart anchor detection (auto-selects best connection points)

### Editing Features
- Drag to move nodes
- Resize handles on corners
- Quick color palette (10 preset colors)
- Gradient fills
- Opacity control
- Rotation (0-360°)
- Corner radius adjustment
- Node locking

### Organization
- Alignment tools (left, center, right, top, middle, bottom)
- Group/Ungroup nodes
- Layer controls (bring to front, send to back)
- Auto-layout function

### Canvas
- Infinite canvas with pan (Space+drag or middle mouse)
- Zoom (scroll wheel, 25%-400%)
- Zoom to selection
- Fit to screen
- Snap to grid
- Rulers (Shift+R)
- Minimap for navigation
- Smart guides when dragging

### Export
- Export to PNG
- Export to SVG

### Collaboration
- Auto-save to localStorage every 30 seconds
- Manual save (Ctrl+S)
- Undo/Redo (Ctrl+Z/Y)
- Copy/Paste (Ctrl+C/V)
- Duplicate (Ctrl+D)
- Alt+Drag to clone

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| V | Select tool |
| R | Rectangle |
| E | Ellipse |
| O | Diamond |
| C | Connection |
| T | Text |
| P | Pen |
| Del | Delete selected |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Ctrl+D | Duplicate |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+G | Group |
| Ctrl+A | Select all |
| Alt+Drag | Clone node |
| Shift+R | Toggle rulers |
| Space+Drag | Pan canvas |
| Scroll | Zoom |
| ? | Show shortcuts |

## Getting Started

### Option 1: Simple HTTP Server (Recommended)
```bash
# Install Node.js if not already installed
node server.js
# Open http://localhost:8080
```

### Option 2: Direct File Opening
Simply open `index.html` in any modern web browser.

### Option 3: Python HTTP Server
```bash
python -m http.server 8080
# Open http://localhost:8080
```

### Option 4: VS Code Live Server
Install the "Live Server" extension and click "Go Live"

## Hosting

This application can be hosted on any static file hosting service:

### Netlify
1. Drag and drop the project folder to Netlify
2. Or connect to GitHub and deploy

### Vercel
```bash
npm i -g vercel
vercel
```

### GitHub Pages
1. Create a GitHub repository
2. Push your code
3. Go to Settings > Pages
4. Select main branch

### Apache/Nginx
Simply upload all files to your web server's document root.

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Data Storage

All data is stored in the browser's localStorage. No server-side storage is required. The application automatically saves every 30 seconds.

## License

MIT License - Feel free to use and modify!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
