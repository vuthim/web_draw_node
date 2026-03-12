# Web Draw Mind Map - Specification Document

## 1. Project Overview

**Project Name:** Web Draw Mind Map  
**Type:** Web Application (Single Page Application)  
**Core Functionality:** A browser-based diagramming and mind mapping tool similar to Lucidchart, allowing users to create, connect, and organize visual diagrams with shapes, text, and connections.  
**Target Users:** Professionals, students, and anyone needing to create visual diagrams, flowcharts, mind maps, and organizational charts.

---

## 2. UI/UX Specification

### Layout Structure

**Main Layout:**
- **Header Bar** (height: 48px) - App title, file operations, zoom controls
- **Toolbar** (width: 56px, left side) - Shape tools, selection, connection tools
- **Canvas Area** (remaining space) - Infinite canvas with pan/zoom
- **Properties Panel** (width: 280px, right side, collapsible) - Node properties, colors, text options
- **Status Bar** (height: 28px, bottom) - Coordinates, zoom level, selection info

### Visual Design

**Color Palette:**
- Background (Dark): `#1a1a2e`
- Canvas Background: `#16213e`
- Panel Background: `#0f0f23`
- Primary Accent: `#e94560`
- Secondary Accent: `#0f3460`
- Text Primary: `#eaeaea`
- Text Secondary: `#a0a0a0`
- Border Color: `#2a2a4a`
- Selection Highlight: `#e94560`
- Node Default Fill: `#1f4068`
- Node Default Stroke: `#e94560`
- Connection Line: `#e94560`

**Typography:**
- Font Family: `'Segoe UI', 'Inter', sans-serif`
- Header: 14px, weight 600
- Body: 13px, weight 400
- Node Text: 14px, weight 500
- Status Bar: 11px, weight 400

**Spacing System:**
- Base unit: 8px
- Panel padding: 16px
- Toolbar item spacing: 8px
- Button padding: 8px 12px

**Visual Effects:**
- Panel shadows: `0 4px 20px rgba(0, 0, 0, 0.4)`
- Button hover: brightness increase + subtle scale
- Selection glow: `0 0 0 2px rgba(233, 69, 96, 0.5)`
- Smooth transitions: 150ms ease-out

### Components

**Toolbar:**
- Select Tool (cursor icon)
- Rectangle Shape
- Rounded Rectangle
- Ellipse/Circle
- Diamond (decision node)
- Line/Connection Tool
- Text Tool
- Delete Tool
- Each tool: 40x40px button with icon, tooltip on hover

**Canvas:**
- Infinite scrollable area
- Grid pattern background (subtle, 20px spacing)
- Pan: Middle mouse button or Space + drag
- Zoom: Mouse wheel (centered on cursor)
- Selection: Click or drag rectangle

**Nodes/Shapes:**
- Draggable
- Resizable (corner handles)
- Editable text (double-click)
- Connection points (4 sides)
- Selection state with handles

**Connection Lines:**
- Straight lines
- Elbow/orthogonal lines
- Arrow heads (optional)
- Auto-routing around nodes

**Properties Panel:**
- Fill color picker
- Stroke color picker
- Stroke width slider
- Font size (for text nodes)
- Delete button
- Layer controls (bring forward/send back)

---

## 3. Functionality Specification

### Core Features

**Shape Creation:**
- Click tool, then click canvas to place
- Or drag to create sized shape
- Default size: 150x80px

**Shape Manipulation:**
- Click to select (shows handles)
- Drag to move
- Drag handles to resize
- Double-click to edit text
- Delete key or tool to remove

**Connections:**
- Select connection tool
- Click source node (highlights connection points)
- Click target node
- Line auto-routes
- Click connection to select
- Delete to remove

**Canvas Navigation:**
- Pan: Middle mouse drag, or Space + left mouse drag
- Zoom: Ctrl + mouse wheel, or toolbar buttons
- Fit to screen button
- Zoom to 100% button

**Selection:**
- Single click to select
- Ctrl+click to add to selection
- Drag selection rectangle
- Escape to deselect

**Keyboard Shortcuts:**
- Delete/Backspace: Remove selected
- Ctrl+A: Select all
- Ctrl+D: Duplicate selection
- Ctrl+S: Save to localStorage
- Ctrl+Z: Undo
- Ctrl+Y: Redo
- Escape: Cancel current operation

**Persistence:**
- Auto-save to localStorage every 30 seconds
- Manual save button
- Load on page refresh

### User Interactions

1. **Create Node:** Select shape tool → Click/drag on canvas
2. **Edit Text:** Double-click node → Type → Click outside to confirm
3. **Connect Nodes:** Select connection tool → Click first node → Click second node
4. **Move Node:** Click to select → Drag to new position
5. **Resize Node:** Click to select → Drag corner handle
6. **Change Properties:** Select node → Modify in properties panel
7. **Delete:** Select → Press Delete or click delete tool
8. **Pan Canvas:** Hold Space + drag, or middle mouse drag
9. **Zoom:** Ctrl + scroll, or toolbar zoom buttons

### Edge Cases

- Prevent nodes from being dragged off visible area
- Handle overlapping nodes (z-index management)
- Connection lines follow node movement
- Prevent self-connections
- Handle empty text nodes gracefully
- Maximum zoom limits (25% - 400%)

---

## 4. Acceptance Criteria

### Visual Checkpoints
- [ ] Dark theme applied consistently
- [ ] Toolbar visible on left with all tools
- [ ] Properties panel visible on right
- [ ] Canvas shows grid pattern
- [ ] Nodes display with correct colors
- [ ] Selection shows handles and glow
- [ ] Connection lines render correctly between nodes

### Functional Checkpoints
- [ ] Can create rectangles, ellipses, diamonds
- [ ] Can move nodes by dragging
- [ ] Can resize nodes using handles
- [ ] Can edit text in nodes
- [ ] Can create connections between nodes
- [ ] Can delete nodes and connections
- [ ] Can pan the canvas
- [ ] Can zoom in/out
- [ ] Can change node colors via properties panel
- [ ] Data persists after page refresh

### Performance
- [ ] Smooth dragging at 60fps
- [ ] No lag with 50+ nodes
- [ ] Responsive UI interactions
