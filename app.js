// Constants and Configuration
const CONSTANTS = {
    HANDLE_SIZE: 8,
    GRID_SIZE: 20,
    MIN_ZOOM: 0.25,
    MAX_ZOOM: 4,
    DEFAULT_NODE_WIDTH: 150,
    DEFAULT_NODE_HEIGHT: 80,
    MIN_NODE_SIZE: 40
};

// Canvas elements
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const minimapCtx = minimap?.getContext('2d');
const canvasContainer = document.getElementById('canvas-container');

const SHAPE_TYPES = [
    'rectangle', 'rounded-rect', 'ellipse', 'diamond', 'triangle',
    'hexagon', 'arrow', 'star', 'sticky', 'text', 'parallelogram'
];

const DEFAULT_COLORS = [
    '#1f4068', '#e94560', '#0f3460', '#533483', '#ff6b6b',
    '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'
];

const SHAPE_DEFAULTS = {
    rectangle: { fillColor: '#1f4068', strokeColor: '#e94560', strokeWidth: 2, text: 'Rectangle' },
    'rounded-rect': { fillColor: '#1f4068', strokeColor: '#e94560', strokeWidth: 2, text: 'Rounded' },
    ellipse: { fillColor: '#1f4068', strokeColor: '#e94560', strokeWidth: 2, text: 'Ellipse' },
    diamond: { fillColor: '#1f4068', strokeColor: '#e94560', strokeWidth: 2, text: 'Diamond' },
    triangle: { fillColor: '#1f4068', strokeColor: '#e94560', strokeWidth: 2, text: 'Triangle' },
    hexagon: { fillColor: '#1f4068', strokeColor: '#e94560', strokeWidth: 2, text: 'Hexagon' },
    arrow: { fillColor: '#e94560', strokeColor: '#e94560', strokeWidth: 2, text: '' },
    star: { fillColor: '#ffeaa7', strokeColor: '#e94560', strokeWidth: 2, text: 'Star' },
    sticky: { fillColor: '#ffeaa7', strokeColor: '#d4a574', strokeWidth: 1, text: 'Note', fontSize: 14 },
    'parallelogram': { fillColor: '#1f4068', strokeColor: '#e94560', strokeWidth: 2, text: 'Parallelogram' },
    text: { fillColor: 'transparent', strokeColor: '#e94560', strokeWidth: 0, text: 'Text', fontSize: 16 }
};

const KEYBOARD_SHORTCUTS = {
    'v': 'select',
    'r': 'rectangle',
    'e': 'ellipse',
    'o': 'diamond',
    'c': 'connection',
    't': 'text',
    'p': 'pen'
};
// State Management
const createState = () => ({
    tool: 'select',
    nodes: [],
    connections: [],
    drawings: [],
    groups: [],
    selectedNodes: [],
    selectedConnection: null,
    selectedGroup: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    isPanning: false,
    isCreating: false,
    isConnecting: false,
    isResizing: false,
    isDrawing: false,
    isSelecting: false,
    selectionRect: null,
    dragStartX: 0,
    dragStartY: 0,
    nodeStartX: 0,
    nodeStartY: 0,
    createStartX: 0,
    createStartY: 0,
    connectionStartNode: null,
    tempConnectionEnd: null,
    resizeHandle: null,
    undoStack: [],
    redoStack: [],
    lastSaveTime: 0,
    snapToGrid: true,
    showRulers: false,
    hoveredNode: null,
    connectionAnchor: null
});

let state = createState();

function resetState() {
    state = createState();
}

function getState() {
    return state;
}
// Utility Functions
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

function screenToCanvas(x, y) {
    return { x: (x - state.panX) / state.zoom, y: (y - state.panY) / state.zoom };
}

function canvasToScreen(x, y) {
    return { x: x * state.zoom + state.panX, y: y * state.zoom + state.panY };
}

function snapToGridValue(value) {
    if (!state.snapToGrid) return value;
    return Math.round(value / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE;
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
}

function getContentBounds() {
    if (state.nodes.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
    });
    return { minX, minY, maxX, maxY };
}

function getSelectionBounds() {
    if (state.selectedNodes.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.selectedNodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
    });
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
// UI Functions
function setTool(tool) {
    state.tool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    state.isConnecting = false;
    state.connectionStartNode = null;
    updateCursor();
}

function updateCursor() {
    const cursors = {
        select: 'default',
        rectangle: 'crosshair',
        'rounded-rect': 'crosshair',
        ellipse: 'crosshair',
        diamond: 'crosshair',
        triangle: 'crosshair',
        hexagon: 'crosshair',
        arrow: 'crosshair',
        star: 'crosshair',
        sticky: 'crosshair',
        'parallelogram': 'crosshair',
        connection: 'crosshair',
        text: 'text',
        delete: 'pointer',
        pen: 'crosshair'
    };
    canvas.style.cursor = cursors[state.tool] || 'default';
}

function updateHoverCursor(canvasPos) {
    if (state.tool === 'select') {
        const hoveredNode = findNodeAt(canvasPos.x, canvasPos.y);
        if (hoveredNode) {
            const handle = findResizeHandle(hoveredNode, canvasPos.x, canvasPos.y);
            canvas.style.cursor = handle ? getResizeCursor(handle) : 'move';
        } else {
            canvas.style.cursor = 'default';
        }
    }
}

function updatePropertiesPanel() {
    const noSelection = document.getElementById('no-selection');
    const selectionProps = document.getElementById('selection-properties');
    const textProperty = document.getElementById('text-property');
    const connectionProperty = document.getElementById('connection-property');
    const labelProperty = document.getElementById('label-property');
    const gradientGroup = document.getElementById('gradient-group');

    if (state.selectedNodes.length === 0 && !state.selectedConnection) {
        noSelection.style.display = 'block';
        selectionProps.style.display = 'none';
        return;
    }

    noSelection.style.display = 'none';
    selectionProps.style.display = 'block';
    connectionProperty.style.display = 'none';
    labelProperty.style.display = 'none';

    if (state.selectedNodes.length >= 1) {
        const node = state.selectedNodes[0];
        document.getElementById('fill-color').value = node.fillColor;
        document.getElementById('fill-color-value').textContent = node.fillColor;
        document.getElementById('stroke-color').value = node.strokeColor;
        document.getElementById('stroke-color-value').textContent = node.strokeColor;
        document.getElementById('stroke-width').value = node.strokeWidth;
        document.getElementById('stroke-width-value').textContent = node.strokeWidth;
        
        const opacity = node.opacity !== undefined ? Math.round(node.opacity * 100) : 100;
        document.getElementById('opacity').value = opacity;
        document.getElementById('opacity-value').textContent = opacity + '%';

        const rotation = node.rotation || 0;
        document.getElementById('rotation').value = rotation;
        document.getElementById('rotation-value').textContent = rotation + '°';

        const cornerRadius = node.cornerRadius || 0;
        document.getElementById('corner-radius').value = cornerRadius;
        document.getElementById('corner-radius-value').textContent = cornerRadius;

        const lockCheckbox = document.getElementById('lock-node');
        if (lockCheckbox) {
            lockCheckbox.checked = node.locked || false;
        }

        if (gradientGroup) {
            gradientGroup.style.display = node.type !== 'text' ? 'block' : 'none';
            document.getElementById('gradient-color').value = node.gradientColor || '#0f3460';
            document.getElementById('gradient-color-value').textContent = node.gradientColor || '#0f3460';
            document.getElementById('use-gradient').checked = node.useGradient || false;
        }

        if (node.type === 'text' || node.type === 'sticky') {
            textProperty.style.display = 'block';
            document.getElementById('font-size').value = node.fontSize || 14;
            document.getElementById('font-size-value').textContent = node.fontSize || 14;
        } else {
            textProperty.style.display = 'none';
        }

        const alignBtns = document.querySelector('.align-buttons');
        if (alignBtns) {
            alignBtns.style.display = state.selectedNodes.length >= 2 ? 'grid' : 'none';
        }

        const groupBtns = document.querySelector('.group-buttons');
        if (groupBtns) {
            groupBtns.style.display = state.selectedNodes.length >= 2 ? 'block' : 'none';
        }
    }

    if (state.selectedConnection) {
        connectionProperty.style.display = 'block';
        labelProperty.style.display = 'block';
        document.getElementById('connection-type').value = state.selectedConnection.type || 'curved';
        document.getElementById('show-arrow').checked = state.selectedConnection.endArrow !== false;
        document.getElementById('arrow-style').value = state.selectedConnection.arrowStyle || 'arrow';
        document.getElementById('connection-label').value = state.selectedConnection.label || '';
        
        document.getElementById('conn-stroke-width').value = state.selectedConnection.strokeWidth || 2;
        document.getElementById('conn-stroke-width-value').textContent = state.selectedConnection.strokeWidth || 2;
        
        document.getElementById('arrow-size').value = state.selectedConnection.arrowSize || 14;
        document.getElementById('arrow-size-value').textContent = state.selectedConnection.arrowSize || 14;
    }
}

function updateStatusBar(pos) {
    document.getElementById('status-position').textContent = `X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}`;
    
    if (state.selectedNodes.length > 0) {
        document.getElementById('status-selection').textContent = `${state.selectedNodes.length} node(s) selected`;
    } else if (state.selectedConnection) {
        document.getElementById('status-selection').textContent = 'Connection selected';
    } else {
        document.getElementById('status-selection').textContent = 'No selection';
    }
}

function updateSelectedProperties(prop, value) {
    state.selectedNodes.forEach(node => { node[prop] = value; });
    if (state.selectedConnection && prop === 'strokeColor') {
        state.selectedConnection.strokeColor = value;
    }
    render();
}

function togglePanel() {
    document.getElementById('properties-panel').classList.toggle('collapsed');
}

function openTextModal(node) {
    const modal = document.getElementById('text-modal');
    const input = document.getElementById('text-input');
    input.value = node.text || '';
    modal.style.display = 'flex';
    input.focus();
    modal.dataset.nodeId = node.id;
}

function closeTextModal() {
    document.getElementById('text-modal').style.display = 'none';
}

function confirmTextEdit() {
    const modal = document.getElementById('text-modal');
    const nodeId = modal.dataset.nodeId;
    const newText = document.getElementById('text-input').value;
    const node = state.nodes.find(n => n.id === nodeId);
    if (node) {
        saveUndoState();
        node.text = newText;
        render();
    }
    closeTextModal();
}
// Shape Drawing Functions
function drawNodes() {
    const sortedNodes = [...state.nodes].sort((a, b) => a.zIndex - b.zIndex);
    sortedNodes.forEach(node => drawNode(ctx, node));
}

function drawNode(ctx, node) {
    ctx.save();
    ctx.globalAlpha = node.opacity ?? 1;
    
    if (node.shadowColor && node.shadowBlur > 0) {
        ctx.shadowColor = node.shadowColor;
        ctx.shadowBlur = node.shadowBlur;
        ctx.shadowOffsetX = node.shadowOffsetX || 0;
        ctx.shadowOffsetY = node.shadowOffsetY || 0;
    }

    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);

    if (node.rotation) {
        const cx = node.x + node.width / 2;
        const cy = node.y + node.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(node.rotation * Math.PI / 180);
        ctx.translate(-cx, -cy);
    }

    if (node.useGradient && node.gradientColor) {
        const gradient = ctx.createLinearGradient(node.x, node.y, node.x + node.width, node.y + node.height);
        gradient.addColorStop(0, node.fillColor);
        gradient.addColorStop(1, node.gradientColor);
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = node.fillColor;
    }
    ctx.strokeStyle = node.strokeColor;
    ctx.lineWidth = node.strokeWidth;

    switch (node.type) {
        case 'rectangle':
            ctx.fillRect(node.x, node.y, node.width, node.height);
            if (node.strokeWidth > 0) ctx.strokeRect(node.x, node.y, node.width, node.height);
            break;
        case 'rounded-rect':
            const r = node.cornerRadius || 10;
            ctx.beginPath();
            ctx.roundRect(node.x, node.y, node.width, node.height, r);
            ctx.fill();
            if (node.strokeWidth > 0) ctx.stroke();
            break;
        case 'ellipse':
            ctx.beginPath();
            ctx.ellipse(node.x + node.width/2, node.y + node.height/2, node.width/2, node.height/2, 0, 0, Math.PI*2);
            ctx.fill();
            if (node.strokeWidth > 0) ctx.stroke();
            break;
        case 'diamond':
            ctx.beginPath();
            ctx.moveTo(node.x + node.width/2, node.y);
            ctx.lineTo(node.x + node.width, node.y + node.height/2);
            ctx.lineTo(node.x + node.width/2, node.y + node.height);
            ctx.lineTo(node.x, node.y + node.height/2);
            ctx.closePath();
            ctx.fill();
            if (node.strokeWidth > 0) ctx.stroke();
            break;
        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(node.x + node.width/2, node.y);
            ctx.lineTo(node.x + node.width, node.y + node.height);
            ctx.lineTo(node.x, node.y + node.height);
            ctx.closePath();
            ctx.fill();
            if (node.strokeWidth > 0) ctx.stroke();
            break;
        case 'hexagon':
            drawPolygon(ctx, node.x + node.width/2, node.y + node.height/2, node.width/2, 6, 0);
            ctx.fill();
            if (node.strokeWidth > 0) ctx.stroke();
            break;
        case 'star':
            drawStar(ctx, node.x + node.width/2, node.y + node.height/2, 5, node.width/2, node.width/4);
            ctx.fill();
            if (node.strokeWidth > 0) ctx.stroke();
            break;
        case 'arrow':
            drawArrowShape(ctx, node);
            break;
        case 'sticky':
            ctx.fillStyle = node.fillColor;
            ctx.fillRect(node.x, node.y, node.width, node.height);
            ctx.strokeStyle = node.strokeColor;
            ctx.strokeRect(node.x, node.y, node.width, node.height);
            break;
        case 'parallelogram':
            const skew = node.width * 0.2;
            ctx.beginPath();
            ctx.moveTo(node.x + skew, node.y);
            ctx.lineTo(node.x + node.width, node.y);
            ctx.lineTo(node.x + node.width - skew, node.y + node.height);
            ctx.lineTo(node.x, node.y + node.height);
            ctx.closePath();
            ctx.fill();
            if (node.strokeWidth > 0) ctx.stroke();
            break;
        case 'text':
            ctx.font = `${node.fontSize || 16}px 'Segoe UI', sans-serif`;
            ctx.fillStyle = node.strokeColor;
            ctx.textAlign = node.textAlign || 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(node.text || '', node.x, node.y);
            break;
    }

    if (node.text && node.type !== 'text') {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.font = `${node.fontSize || 14}px 'Segoe UI', ${node.fontWeight || 'normal'}`;
        ctx.fillStyle = node.textColor || '#eaeaea';
        ctx.textAlign = node.textAlign || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.text, node.x + node.width/2, node.y + node.height/2);
    }

    ctx.restore();
}

function drawPolygon(ctx, cx, cy, r, sides, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI / sides) - Math.PI/2 + rotation;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI / spikes) - Math.PI/2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

function drawArrowShape(ctx, node) {
    const w = node.width, h = node.height;
    ctx.beginPath();
    ctx.moveTo(node.x, node.y + h/2);
    ctx.lineTo(node.x + w - h/2, node.y + h/2);
    ctx.lineTo(node.x + w - h/2, node.y);
    ctx.lineTo(node.x + w, node.y + h/2);
    ctx.lineTo(node.x + w - h/2, node.y + h);
    ctx.lineTo(node.x + w - h/2, node.y + h);
    ctx.lineTo(node.x, node.y + h);
    ctx.closePath();
    ctx.fill();
    if (node.strokeWidth > 0) ctx.stroke();
}

function createNode(x, y, width, height, type) {
    const config = SHAPE_DEFAULTS[type] || SHAPE_DEFAULTS.rectangle;

    const node = {
        id: generateId(),
        type,
        x,
        y,
        width: type === 'text' ? 120 : Math.max(CONSTANTS.MIN_NODE_SIZE, width),
        height: type === 'text' ? 30 : Math.max(CONSTANTS.MIN_NODE_SIZE, height),
        fillColor: config.fillColor,
        gradientColor: '#0f3460',
        useGradient: false,
        strokeColor: config.strokeColor,
        strokeWidth: config.strokeWidth,
        text: config.text,
        fontSize: config.fontSize || 14,
        fontWeight: 'normal',
        textAlign: 'center',
        textColor: '#eaeaea',
        shadowColor: 'transparent',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        cornerRadius: type === 'rounded-rect' ? 10 : 0,
        rotation: 0,
        opacity: 1,
        zIndex: state.nodes.length,
        connectionType: 'straight',
        locked: false
    };

    state.nodes.push(node);
    state.selectedNodes = [node];
    updatePropertiesPanel();
    saveUndoState();
    render();
}

function findNodeAt(x, y) {
    for (let i = state.nodes.length - 1; i >= 0; i--) {
        const node = state.nodes[i];
        if (x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height) {
            return node;
        }
    }
    return null;
}

function findResizeHandle(node, x, y) {
    const handles = [
        { name: 'se', x: node.x + node.width, y: node.y + node.height },
        { name: 'sw', x: node.x, y: node.y + node.height },
        { name: 'ne', x: node.x + node.width, y: node.y },
        { name: 'nw', x: node.x, y: node.y }
    ];
    for (const handle of handles) {
        if (Math.abs(x - handle.x) < CONSTANTS.HANDLE_SIZE && Math.abs(y - handle.y) < CONSTANTS.HANDLE_SIZE) {
            return handle.name;
        }
    }
    return null;
}

function getResizeCursor(handle) {
    const cursors = { se: 'se-resize', sw: 'sw-resize', ne: 'ne-resize', nw: 'nw-resize' };
    return cursors[handle] || 'se-resize';
}
// Connection Functions - Modern Lucid-style Connections
function drawConnections() {
    state.connections.forEach(conn => {
        if (!conn.startNode || !conn.endNode) return;
        ctx.save();
        ctx.translate(state.panX, state.panY);
        ctx.scale(state.zoom, state.zoom);

        const start = getConnectionPoint(conn.startNode, conn.startAnchor || 'right');
        const end = getConnectionPoint(conn.endNode, conn.endAnchor || 'left');
        
        // Check if connection is selected for editing
        const isSelected = state.selectedConnection === conn;

        ctx.strokeStyle = conn.strokeColor;
        ctx.lineWidth = conn.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (conn.type === 'curved') {
            drawCurvedConnection(ctx, start, end, isSelected);
        } else if (conn.type === 'elbow') {
            drawElbowConnectionSmart(ctx, start, end, isSelected);
        } else {
            drawStraightConnection(ctx, start, end, isSelected);
        }

        if (conn.endArrow) {
            drawArrowHead(ctx, end, start, conn, isSelected);
        }

        if (conn.label) {
            drawConnectionLabel(ctx, start, end, conn.label);
        }

        // Draw connection points if selected
        if (isSelected) {
            drawConnectionEndpoints(ctx, conn);
        }

        ctx.restore();
    });
}

function getConnectionPoint(node, anchor) {
    const anchors = {
        top: { x: node.x + node.width / 2, y: node.y },
        right: { x: node.x + node.width, y: node.y + node.height / 2 },
        bottom: { x: node.x + node.width / 2, y: node.y + node.height },
        left: { x: node.x, y: node.y + node.height / 2 }
    };
    return anchors[anchor] || anchors.right;
}

function getBestAnchor(node, targetNode, isStart = true) {
    const nodeCenter = {
        x: node.x + node.width / 2,
        y: node.y + node.height / 2
    };
    const targetCenter = {
        x: targetNode.x + targetNode.width / 2,
        y: targetNode.y + targetNode.height / 2
    };

    const dx = targetCenter.x - nodeCenter.x;
    const dy = targetCenter.y - nodeCenter.y;

    if (isStart) {
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'bottom' : 'top';
        }
    } else {
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'left' : 'right';
        } else {
            return dy > 0 ? 'top' : 'bottom';
        }
    }
}

function drawStraightConnection(ctx, start, end, isSelected) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    if (isSelected) {
        ctx.strokeStyle = 'rgba(233, 69, 96, 0.3)';
        ctx.lineWidth = 8;
        ctx.stroke();
    }
}

function drawCurvedConnection(ctx, start, end, isSelected) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const curvature = Math.min(dist * 0.3, 100);

    // Determine curve direction based on anchors
    const cp1x = start.x + curvature * Math.sign(dx);
    const cp1y = start.y;
    const cp2x = end.x - curvature * Math.sign(dx);
    const cp2y = end.y;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
    ctx.stroke();

    if (isSelected) {
        ctx.strokeStyle = 'rgba(233, 69, 96, 0.3)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
        ctx.stroke();
    }
}

function drawElbowConnectionSmart(ctx, start, end, isSelected) {
    // Calculate best elbow points
    const startAnchor = getBestAnchorForElbow(start, end, true);
    const endAnchor = getBestAnchorForElbow(end, start, false);

    let points = [start];
    
    // Add intermediate points based on routing
    if (startAnchor === 'right' || startAnchor === 'left') {
        const midX = (start.x + end.x) / 2;
        points.push({ x: midX, y: start.y });
        points.push({ x: midX, y: end.y });
    } else {
        const midY = (start.y + end.y) / 2;
        points.push({ x: start.x, y: midY });
        points.push({ x: end.x, y: midY });
    }
    
    points.push(end);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    if (isSelected) {
        ctx.strokeStyle = 'rgba(233, 69, 96, 0.3)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
    }
}

function getBestAnchorForElbow(start, end, isStart) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    if (Math.abs(dx) > Math.abs(dy)) {
        return isStart ? (dx > 0 ? 'right' : 'left') : (dx > 0 ? 'left' : 'right');
    } else {
        return isStart ? (dy > 0 ? 'bottom' : 'top') : (dy > 0 ? 'top' : 'bottom');
    }
}

function drawArrowHead(ctx, end, start, conn, isSelected) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowSize = conn.arrowSize || 14;
    const style = conn.arrowStyle || 'arrow';
    
    if (style === 'arrow' || style === 'none') {
        // Draw filled arrow
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - arrowSize * Math.cos(angle - Math.PI/6), end.y - arrowSize * Math.sin(angle - Math.PI/6));
        ctx.lineTo(end.x - arrowSize * Math.cos(angle + Math.PI/6), end.y - arrowSize * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fillStyle = conn.strokeColor;
        ctx.fill();
        
        // Add white outline for better visibility
        if (isSelected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    } else if (style === 'diamond') {
        const size = arrowSize * 0.7;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - size, end.y - size/2);
        ctx.lineTo(end.x - size * 1.5, end.y);
        ctx.lineTo(end.x - size, end.y + size/2);
        ctx.closePath();
        ctx.fillStyle = conn.strokeColor;
        ctx.fill();
    } else if (style === 'circle') {
        ctx.beginPath();
        ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = conn.strokeColor;
        ctx.fill();
        if (isSelected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    } else if (style === 'open') {
        // Open arrow style
        const innerSize = arrowSize * 0.7;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - arrowSize * Math.cos(angle - Math.PI/6), end.y - arrowSize * Math.sin(angle - Math.PI/6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - arrowSize * Math.cos(angle + Math.PI/6), end.y - arrowSize * Math.sin(angle + Math.PI/6));
        ctx.lineWidth = conn.strokeWidth + 1;
        ctx.stroke();
    }
}

function drawConnectionEndpoints(ctx, conn) {
    const start = getConnectionPoint(conn.startNode, conn.startAnchor || 'right');
    const end = getConnectionPoint(conn.endNode, conn.endAnchor || 'left');

    // Draw endpoint circles
    const endpoints = [
        { x: start.x, y: start.y, anchor: conn.startAnchor || 'right', isStart: true },
        { x: end.x, y: end.y, anchor: conn.endAnchor || 'left', isStart: false }
    ];

    endpoints.forEach(ep => {
        // Outer ring
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#e94560';
        ctx.fill();
        
        // Inner circle
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Label
        ctx.font = '10px Segoe UI';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
    });
}

function drawConnectionLabel(ctx, start, end, label) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    ctx.font = '13px Segoe UI, sans-serif';
    const textWidth = ctx.measureText(label).width;
    const padding = 8;
    const boxHeight = 22;

    // Draw label background
    ctx.fillStyle = 'rgba(15, 15, 35, 0.95)';
    ctx.beginPath();
    ctx.roundRect(midX - textWidth/2 - padding, midY - boxHeight/2, textWidth + padding * 2, boxHeight, 4);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw text
    ctx.fillStyle = '#eaeaea';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, midX, midY);
}

function drawElbowConnection(ctx, start, end) {
    const midX = (start.x + end.x) / 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(midX, start.y);
    ctx.lineTo(midX, end.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
}

function getConnectionStart(conn) {
    return getConnectionPoint(conn.startNode, conn.startAnchor || 'right');
}

function getConnectionEnd(conn) {
    return getConnectionPoint(conn.endNode, conn.endAnchor || 'left');
}

function findConnectionAt(x, y) {
    for (const conn of state.connections) {
        if (!conn.startNode || !conn.endNode) continue;
        const start = getConnectionStart(conn);
        const end = getConnectionEnd(conn);
        
        // Check proximity to line
        const dist = pointToLineDistance(x, y, start.x, start.y, end.x, end.y);
        if (dist < 12) return conn;
    }
    return null;
}

function createConnection(startNode, endNode) {
    // Auto-detect best anchors
    const startAnchor = getBestAnchor(startNode, endNode, true);
    const endAnchor = getBestAnchor(endNode, startNode, false);

    const connection = {
        id: generateId(),
        startNode,
        endNode,
        startAnchor,
        endAnchor,
        strokeColor: '#e94560',
        strokeWidth: 2,
        type: 'curved', // Default to curved like Lucid
        startArrow: false,
        endArrow: true,
        arrowStyle: 'arrow',
        arrowSize: 14,
        label: ''
    };

    state.connections.push(connection);
    state.selectedConnection = connection;
    state.selectedNodes = [];
    state.isConnecting = false;
    state.connectionStartNode = null;
    updatePropertiesPanel();
    saveUndoState();
    render();
}

function deleteConnection(connection) {
    state.connections = state.connections.filter(c => c !== connection);
    state.selectedConnection = null;
    updatePropertiesPanel();
    saveUndoState();
    render();
}

function getConnectionAnchors(node) {
    return [
        { x: node.x + node.width / 2, y: node.y, dir: 'top', label: '↑' },
        { x: node.x + node.width, y: node.y + node.height / 2, dir: 'right', label: '→' },
        { x: node.x + node.width / 2, y: node.y + node.height, dir: 'bottom', label: '↓' },
        { x: node.x, y: node.y + node.height / 2, dir: 'left', label: '←' }
    ];
}

function drawConnectionAnchors() {
    if (state.tool !== 'connection' && !state.isConnecting) return;

    const nodesToShow = state.isConnecting && state.connectionStartNode 
        ? [state.connectionStartNode] 
        : state.nodes;

    nodesToShow.forEach(node => {
        const anchors = getConnectionAnchors(node);
        ctx.save();
        ctx.translate(state.panX, state.panY);
        ctx.scale(state.zoom, state.zoom);

        anchors.forEach((anchor, i) => {
            const isActive = state.isConnecting && state.connectionStartNode === node;
            const isHighlighted = isActive || state.selectedNodes.includes(node);
            
            // Draw anchor circle
            ctx.beginPath();
            ctx.arc(anchor.x, anchor.y, isHighlighted ? 8 : 6, 0, Math.PI * 2);
            
            if (isHighlighted) {
                ctx.fillStyle = '#e94560';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.fillStyle = 'rgba(233, 69, 96, 0.6)';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Draw direction label
            ctx.font = 'bold 8px Segoe UI';
            ctx.fillStyle = isHighlighted ? '#fff' : '#e94560';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(anchor.label, anchor.x, anchor.y);
        });

        ctx.restore();
    });
}

function drawConnectionPreview() {
    if (!state.connectionStartNode || !state.tempConnectionEnd) return;
    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);

    // Find best anchor for preview
    const bestAnchor = getBestAnchor(state.connectionStartNode, { x: state.tempConnectionEnd.x, y: state.tempConnectionEnd.y }, true);
    const start = getConnectionPoint(state.connectionStartNode, bestAnchor);
    
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    
    // Draw curved preview
    const dx = state.tempConnectionEnd.x - start.x;
    const dy = state.tempConnectionEnd.y - start.y;
    const curvature = Math.min(Math.sqrt(dx*dx + dy*dy) * 0.3, 80);
    const cpX = start.x + curvature;
    const cpY = start.y;
    ctx.quadraticCurveTo(cpX, cpY, state.tempConnectionEnd.x, state.tempConnectionEnd.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw endpoint indicator
    ctx.beginPath();
    ctx.arc(state.tempConnectionEnd.x, state.tempConnectionEnd.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(233, 69, 96, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}
// Drawing/Freehand Functions
function drawFreehandLines() {
    state.drawings.forEach(d => drawFreehand(ctx, d));
}

function drawFreehand(ctx, d) {
    if (!d.points || d.points.length < 2) return;
    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);

    ctx.strokeStyle = d.strokeColor;
    ctx.lineWidth = d.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(d.points[0].x, d.points[0].y);
    for (let i = 1; i < d.points.length; i++) {
        ctx.lineTo(d.points[i].x, d.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
}
// Selection Rendering
function drawSelection() {
    state.selectedNodes.forEach(node => drawNodeSelection(node));
    if (state.selectedConnection) drawConnectionSelection(state.selectedConnection);
    if (state.selectedNodes.length === 1) drawResizeHandles(state.selectedNodes[0]);
}

function drawNodeSelection(node) {
    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(node.x - 4, node.y - 4, node.width + 8, node.height + 8);
    ctx.setLineDash([]);
    ctx.restore();
}

function drawConnectionSelection(conn) {
    if (!conn.startNode || !conn.endNode) return;
    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);
    
    const start = getConnectionStart(conn);
    const end = getConnectionEnd(conn);

    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
}

function drawResizeHandles(node) {
    const handles = [
        { name: 'se', x: node.x + node.width, y: node.y + node.height },
        { name: 'sw', x: node.x, y: node.y + node.height },
        { name: 'ne', x: node.x + node.width, y: node.y },
        { name: 'nw', x: node.x, y: node.y }
    ];

    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);

    handles.forEach(handle => {
        ctx.fillStyle = '#e94560';
        ctx.fillRect(handle.x - CONSTANTS.HANDLE_SIZE/2, handle.y - CONSTANTS.HANDLE_SIZE/2, CONSTANTS.HANDLE_SIZE, CONSTANTS.HANDLE_SIZE);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(handle.x - CONSTANTS.HANDLE_SIZE/2, handle.y - CONSTANTS.HANDLE_SIZE/2, CONSTANTS.HANDLE_SIZE, CONSTANTS.HANDLE_SIZE);
    });
    ctx.restore();
}

function drawSelectionRect() {
    if (!state.selectionRect) return;
    const sr = state.selectionRect;
    const x = sr.width < 0 ? sr.x + sr.width : sr.x;
    const y = sr.height < 0 ? sr.y + sr.height : sr.y;
    const w = Math.abs(sr.width);
    const h = Math.abs(sr.height);

    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);
    
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, w, h);
    
    ctx.fillStyle = 'rgba(233, 69, 96, 0.1)';
    ctx.fillRect(x, y, w, h);
    
    ctx.setLineDash([]);
    ctx.restore();
}

function drawCreationPreview(canvasPos) {
    let x = Math.min(state.createStartX, canvasPos.x);
    let y = Math.min(state.createStartY, canvasPos.y);
    let width = Math.abs(canvasPos.x - state.createStartX);
    let height = Math.abs(canvasPos.y - state.createStartY);

    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);

    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);

    ctx.restore();
}

function drawSmartGuides() {
    if (!state.isDragging || state.selectedNodes.length === 0) return;

    const guides = [];
    const selectedBounds = getSelectionBounds();
    if (!selectedBounds) return;

    state.nodes.forEach(node => {
        if (state.selectedNodes.includes(node)) return;

        if (Math.abs(node.x - selectedBounds.x) < 5) guides.push({ type: 'v', x: node.x, color: '#4ecdc4' });
        if (Math.abs(node.x + node.width - selectedBounds.x - selectedBounds.width) < 5) guides.push({ type: 'v', x: node.x + node.width, color: '#4ecdc4' });
        if (Math.abs(node.y - selectedBounds.y) < 5) guides.push({ type: 'h', y: node.y, color: '#4ecdc4' });
        if (Math.abs(node.y + node.height - selectedBounds.y - selectedBounds.height) < 5) guides.push({ type: 'h', y: node.y + node.height, color: '#4ecdc4' });

        if (Math.abs(node.x - (selectedBounds.x + selectedBounds.width)) < 5) guides.push({ type: 'v', x: node.x, color: '#4ecdc4' });
        if (Math.abs(node.x + node.width - selectedBounds.x) < 5) guides.push({ type: 'v', x: node.x + node.width, color: '#4ecdc4' });
        if (Math.abs(node.y - (selectedBounds.y + selectedBounds.height)) < 5) guides.push({ type: 'h', y: node.y, color: '#4ecdc4' });
        if (Math.abs(node.y + node.height - selectedBounds.y) < 5) guides.push({ type: 'h', y: node.y + node.height, color: '#4ecdc4' });
    });

    guides.forEach(guide => {
        ctx.save();
        ctx.translate(state.panX, state.panY);
        ctx.scale(state.zoom, state.zoom);
        ctx.strokeStyle = guide.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        if (guide.type === 'v') {
            ctx.beginPath();
            ctx.moveTo(guide.x, 0);
            ctx.lineTo(guide.x, canvas.height / state.zoom);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(0, guide.y);
            ctx.lineTo(canvas.width / state.zoom, guide.y);
            ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.restore();
    });
}
// Canvas Operations
function resizeCanvas() {
    const rect = canvasContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    if (minimap) {
        minimap.width = 180;
        minimap.height = 120;
    }
    render();
}

function zoom(delta, centerX, centerY) {
    const oldZoom = state.zoom;
    state.zoom = Math.max(CONSTANTS.MIN_ZOOM, Math.min(CONSTANTS.MAX_ZOOM, state.zoom + delta));

    if (centerX !== undefined && centerY !== undefined) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = centerX - rect.left;
        const mouseY = centerY - rect.top;

        const canvasX = (mouseX - state.panX) / oldZoom;
        const canvasY = (mouseY - state.panY) / oldZoom;

        state.panX = mouseX - canvasX * state.zoom;
        state.panY = mouseY - canvasY * state.zoom;
    }

    document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
    render();
}

function fitToScreen() {
    if (state.nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
    });

    const padding = 50;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    const scaleX = canvas.width / contentWidth;
    const scaleY = canvas.height / contentHeight;
    state.zoom = Math.min(scaleX, scaleY, 1);

    state.panX = (canvas.width - contentWidth * state.zoom) / 2 - minX * state.zoom + padding * state.zoom;
    state.panY = (canvas.height - contentHeight * state.zoom) / 2 - minY * state.zoom + padding * state.zoom;

    document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
    render();
}

function zoomToSelection() {
    if (state.selectedNodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.selectedNodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
    });

    const padding = 50;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    const scaleX = canvas.width / contentWidth;
    const scaleY = canvas.height / contentHeight;
    state.zoom = Math.min(scaleX, scaleY, 2);

    state.panX = (canvas.width - contentWidth * state.zoom) / 2 - minX * state.zoom + padding * state.zoom;
    state.panY = (canvas.height - contentHeight * state.zoom) / 2 - minY * state.zoom + padding * state.zoom;

    document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
    render();
}

function toggleRulers() {
    state.showRulers = !state.showRulers;
    document.getElementById('btn-rulers')?.classList.toggle('active', state.showRulers);
    render();
}

function drawGrid() {
    ctx.save();
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1e2a4a';
    ctx.lineWidth = 1;

    const offsetX = state.panX % (CONSTANTS.GRID_SIZE * state.zoom);
    const offsetY = state.panY % (CONSTANTS.GRID_SIZE * state.zoom);
    const gridSize = CONSTANTS.GRID_SIZE * state.zoom;

    for (let x = offsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = offsetY; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();
}

function drawRulers() {
    if (!state.showRulers) return;

    ctx.save();
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, 30);
    ctx.fillRect(0, 0, 30, canvas.height);

    ctx.fillStyle = '#a0a0a0';
    ctx.font = '10px Segoe UI';
    
    const step = CONSTANTS.GRID_SIZE * state.zoom;
    const startX = Math.floor(-state.panX / step) * step;
    const startY = Math.floor(-state.panY / step) * step;

    for (let x = startX; x < canvas.width; x += step) {
        if (x < 30) continue;
        const val = Math.round((x - state.panX) / state.zoom);
        ctx.fillText(val.toString(), x + 2, 20);
        ctx.strokeStyle = '#2a2a4a';
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x, 35);
        ctx.stroke();
    }

    for (let y = startY; y < canvas.height; y += step) {
        if (y < 30) continue;
        const val = Math.round((y - state.panY) / state.zoom);
        ctx.fillText(val.toString(), 2, y + 10);
        ctx.strokeStyle = '#2a2a4a';
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(35, y);
        ctx.stroke();
    }

    ctx.restore();
}

function drawMinimap() {
    if (!minimap || !minimapCtx) return;

    minimapCtx.fillStyle = '#0f0f23';
    minimapCtx.fillRect(0, 0, minimap.width, minimap.height);

    const bounds = getContentBounds();
    if (!bounds) return;

    const contentWidth = bounds.maxX - bounds.minX + 100;
    const contentHeight = bounds.maxY - bounds.minY + 100;
    const scale = Math.min(minimap.width / contentWidth, minimap.height / contentHeight);

    const offsetX = -bounds.minX + 50;
    const offsetY = -bounds.minY + 50;

    minimapCtx.save();
    minimapCtx.scale(scale, scale);
    minimapCtx.translate(offsetX, offsetY);

    state.nodes.forEach(node => {
        minimapCtx.fillStyle = node.fillColor;
        minimapCtx.fillRect(node.x, node.y, node.width, node.height);
    });

    state.connections.forEach(conn => {
        if (!conn.startNode || !conn.endNode) return;
        minimapCtx.strokeStyle = conn.strokeColor;
        minimapCtx.lineWidth = 1;
        minimapCtx.beginPath();
        minimapCtx.moveTo(conn.startNode.x + conn.startNode.width/2, conn.startNode.y + conn.startNode.height/2);
        minimapCtx.lineTo(conn.endNode.x + conn.endNode.width/2, conn.endNode.y + conn.endNode.height/2);
        minimapCtx.stroke();
    });

    minimapCtx.restore();

    const viewX = -state.panX / state.zoom * scale + offsetX * scale;
    const viewY = -state.panY / state.zoom * scale + offsetY * scale;
    const viewW = canvas.width / state.zoom * scale;
    const viewH = canvas.height / state.zoom * scale;

    minimapCtx.strokeStyle = '#e94560';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(viewX, viewY, viewW, viewH);
}
// Node Operations
function deleteNode(node) {
    state.connections = state.connections.filter(c => c.startNode !== node && c.endNode !== node);
    state.nodes = state.nodes.filter(n => n !== node);
    state.selectedNodes = state.selectedNodes.filter(n => n !== node);
    updatePropertiesPanel();
    saveUndoState();
    render();
}

function deleteSelected() {
    if (state.selectedNodes.length > 0) {
        saveUndoState();
        
        const nodesToDelete = new Set(state.selectedNodes);
        
        state.groups.forEach(g => {
            if (g.nodes.every(n => state.selectedNodes.includes(n))) {
                g.nodes.forEach(n => nodesToDelete.add(n));
            }
        });
        
        const nodesArray = Array.from(nodesToDelete);
        
        nodesArray.forEach(node => {
            state.connections = state.connections.filter(c => c.startNode !== node && c.endNode !== node);
        });
        
        state.nodes = state.nodes.filter(n => !nodesToDelete.has(n));
        state.groups = state.groups.filter(g => !g.nodes.every(n => nodesToDelete.has(n)));
        state.selectedNodes = [];
    }
    if (state.selectedConnection) {
        saveUndoState();
        state.connections = state.connections.filter(c => c !== state.selectedConnection);
        state.selectedConnection = null;
    }
    updatePropertiesPanel();
    render();
}

function duplicateSelected() {
    if (state.selectedNodes.length === 0) return;
    saveUndoState();
    const newNodes = [];
    state.selectedNodes.forEach(node => {
        const newNode = {
            ...node,
            id: generateId(),
            x: node.x + 20,
            y: node.y + 20,
            zIndex: state.nodes.length + newNodes.length
        };
        newNodes.push(newNode);
        state.nodes.push(newNode);
    });
    state.selectedNodes = newNodes;
    updatePropertiesPanel();
    render();
}

function copySelected() {
    if (state.selectedNodes.length === 0) return;
    try {
        const data = JSON.stringify(state.selectedNodes.map(n => ({ ...n, groupId: undefined })));
        localStorage.setItem('mindmap_clipboard', data);
    } catch (err) {}
}

function paste() {
    const data = localStorage.getItem('mindmap_clipboard');
    if (!data) return;
    try {
        const nodes = JSON.parse(data);
        saveUndoState();
        const newNodes = nodes.map(node => ({
            ...node,
            id: generateId(),
            x: node.x + 20,
            y: node.y + 20,
            groupId: undefined
        }));
        newNodes.forEach(n => state.nodes.push(n));
        state.selectedNodes = newNodes;
        updatePropertiesPanel();
        render();
    } catch (err) {}
}

// Alignment Functions
function alignLeft() {
    if (state.selectedNodes.length < 2) return;
    saveUndoState();
    const minX = Math.min(...state.selectedNodes.map(n => n.x));
    state.selectedNodes.forEach(n => n.x = minX);
    render();
}

function alignCenter() {
    if (state.selectedNodes.length < 2) return;
    saveUndoState();
    const center = state.selectedNodes.reduce((sum, n) => sum + n.x + n.width / 2, 0) / state.selectedNodes.length;
    state.selectedNodes.forEach(n => n.x = center - n.width / 2);
    render();
}

function alignRight() {
    if (state.selectedNodes.length < 2) return;
    saveUndoState();
    const maxX = Math.max(...state.selectedNodes.map(n => n.x + n.width));
    state.selectedNodes.forEach(n => n.x = maxX - n.width);
    render();
}

function alignTop() {
    if (state.selectedNodes.length < 2) return;
    saveUndoState();
    const minY = Math.min(...state.selectedNodes.map(n => n.y));
    state.selectedNodes.forEach(n => n.y = minY);
    render();
}

function alignMiddle() {
    if (state.selectedNodes.length < 2) return;
    saveUndoState();
    const middle = state.selectedNodes.reduce((sum, n) => sum + n.y + n.height / 2, 0) / state.selectedNodes.length;
    state.selectedNodes.forEach(n => n.y = middle - n.height / 2);
    render();
}

function alignBottom() {
    if (state.selectedNodes.length < 2) return;
    saveUndoState();
    const maxY = Math.max(...state.selectedNodes.map(n => n.y + n.height));
    state.selectedNodes.forEach(n => n.y = maxY - n.height);
    render();
}

// Layer Functions
function bringToFront() {
    if (state.selectedNodes.length === 0) return;
    const maxZ = Math.max(...state.nodes.map(n => n.zIndex));
    state.selectedNodes.forEach((node, i) => { node.zIndex = maxZ + 1 + i; });
    saveUndoState();
    render();
}

function sendToBack() {
    if (state.selectedNodes.length === 0) return;
    const minZ = Math.min(...state.nodes.map(n => n.zIndex));
    state.selectedNodes.forEach((node, i) => { node.zIndex = minZ - state.selectedNodes.length + i; });
    saveUndoState();
    render();
}

// Grouping Functions
function groupSelected() {
    if (state.selectedNodes.length < 2) return;
    saveUndoState();
    const group = {
        id: generateId(),
        nodes: [...state.selectedNodes]
    };
    state.groups.push(group);
    state.selectedNodes.forEach(n => n.groupId = group.id);
    render();
}

function ungroupSelected() {
    if (state.selectedNodes.length === 0) return;
    saveUndoState();
    
    state.groups = state.groups.filter(g => {
        const hasSelected = g.nodes.some(n => state.selectedNodes.includes(n));
        if (hasSelected) {
            g.nodes.forEach(n => {
                if (state.selectedNodes.includes(n)) {
                    n.groupId = null;
                }
            });
            return false;
        }
        return true;
    });
    render();
}

// Drag and Resize Helpers
function moveSelectedNodes(canvasPos) {
    let dx = canvasPos.x - state.nodeStartX;
    let dy = canvasPos.y - state.nodeStartY;

    if (state.snapToGrid) {
        const startX = state.selectedNodes[0].x;
        const startY = state.selectedNodes[0].y;
        const newX = snapToGridValue(startX + dx);
        const newY = snapToGridValue(startY + dy);
        dx = newX - startX;
        dy = newY - startY;
    }

    state.selectedNodes.forEach(node => {
        node.x += dx;
        node.y += dy;
    });

    state.nodeStartX = canvasPos.x;
    state.nodeStartY = canvasPos.y;
    render();
}

function resizeSelectedNode(canvasPos) {
    const node = state.selectedNodes[0];
    const dx = canvasPos.x - state.nodeStartX;
    const dy = canvasPos.y - state.nodeStartY;

    if (state.resizeHandle === 'se') {
        node.width = Math.max(CONSTANTS.MIN_NODE_SIZE, state.nodeStartWidth + dx);
        node.height = Math.max(CONSTANTS.MIN_NODE_SIZE, state.nodeStartHeight + dy);
    } else if (state.resizeHandle === 'sw') {
        node.x = Math.min(state.nodeStartX + state.nodeStartWidth - CONSTANTS.MIN_NODE_SIZE, state.nodeStartX + dx);
        node.width = Math.max(CONSTANTS.MIN_NODE_SIZE, state.nodeStartWidth - dx);
        node.height = Math.max(CONSTANTS.MIN_NODE_SIZE, state.nodeStartHeight + dy);
    } else if (state.resizeHandle === 'ne') {
        node.y = Math.min(state.nodeStartY + state.nodeStartHeight - CONSTANTS.MIN_NODE_SIZE, state.nodeStartY + dy);
        node.height = Math.max(CONSTANTS.MIN_NODE_SIZE, state.nodeStartHeight - dy);
        node.width = Math.max(CONSTANTS.MIN_NODE_SIZE, state.nodeStartWidth + dx);
    } else if (state.resizeHandle === 'nw') {
        node.x = Math.min(state.nodeStartX + state.nodeStartWidth - CONSTANTS.MIN_NODE_SIZE, state.nodeStartX + dx);
        node.y = Math.min(state.nodeStartY + state.nodeStartHeight - CONSTANTS.MIN_NODE_SIZE, state.nodeStartY + dy);
        node.width = Math.max(CONSTANTS.MIN_NODE_SIZE, state.nodeStartWidth - dx);
        node.height = Math.max(CONSTANTS.MIN_NODE_SIZE, state.nodeStartHeight - dy);
    }
    render();
}

// Storage and Persistence
function saveToStorage() {
    const data = { nodes: state.nodes, connections: state.connections, drawings: state.drawings };
    localStorage.setItem('webDrawMindMap', JSON.stringify(data));
    state.lastSaveTime = Date.now();
    document.getElementById('status-info').textContent = 'Saved!';
    setTimeout(() => { document.getElementById('status-info').textContent = 'Double-click to edit text'; }, 2000);
}

function loadFromStorage() {
    const saved = localStorage.getItem('webDrawMindMap');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            state.nodes = data.nodes || [];
            state.connections = data.connections || [];
            state.drawings = data.drawings || [];
            reconnectNodes();
        } catch (e) { console.error('Failed to load:', e); }
    }
}

function reconnectNodes() {
    const nodeMap = {};
    state.nodes.forEach(n => nodeMap[n.id] = n);
    state.connections.forEach(c => {
        c.startNode = nodeMap[c.startNode?.id];
        c.endNode = nodeMap[c.endNode?.id];
    });
}

function clearCanvas() {
    if (confirm('Clear all items from canvas?')) {
        saveUndoState();
        state.nodes = [];
        state.connections = [];
        state.drawings = [];
        state.selectedNodes = [];
        state.selectedConnection = null;
        updatePropertiesPanel();
        render();
        localStorage.removeItem('webDrawMindMap');
    }
}

// Undo/Redo
function saveUndoState() {
    state.undoStack.push(JSON.stringify({ nodes: state.nodes, connections: state.connections, drawings: state.drawings }));
    if (state.undoStack.length > 50) state.undoStack.shift();
    state.redoStack = [];
}

function undo() {
    if (state.undoStack.length === 0) return;
    state.redoStack.push(JSON.stringify({ nodes: state.nodes, connections: state.connections, drawings: state.drawings }));
    const prev = JSON.parse(state.undoStack.pop());
    state.nodes = prev.nodes || [];
    state.connections = prev.connections || [];
    state.drawings = prev.drawings || [];
    state.selectedNodes = [];
    state.selectedConnection = null;
    reconnectNodes();
    updatePropertiesPanel();
    render();
}

function redo() {
    if (state.redoStack.length === 0) return;
    state.undoStack.push(JSON.stringify({ nodes: state.nodes, connections: state.connections, drawings: state.drawings }));
    const next = JSON.parse(state.redoStack.pop());
    state.nodes = next.nodes || [];
    state.connections = next.connections || [];
    state.drawings = next.drawings || [];
    state.selectedNodes = [];
    state.selectedConnection = null;
    reconnectNodes();
    updatePropertiesPanel();
    render();
}

function startAutoSave() {
    setInterval(() => {
        if (state.nodes.length > 0) {
            const now = Date.now();
            if (now - state.lastSaveTime > 30000) saveToStorage();
        }
    }, 5000);
}

// Export Functions
function exportToPNG() {
    const link = document.createElement('a');
    link.download = 'mindmap.png';
    
    const tempCanvas = document.createElement('canvas');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    state.nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
    });

    state.drawings.forEach(d => {
        d.points.forEach(p => {
            minX = Math.min(minX, d.x + p.x);
            minY = Math.min(minY, d.y + p.y);
            maxX = Math.max(maxX, d.x + p.x);
            maxY = Math.max(maxY, d.y + p.y);
        });
    });

    if (!isFinite(minX)) {
        minX = 0; minY = 0; maxX = 800; maxY = 600;
    }

    const padding = 50;
    tempCanvas.width = maxX - minX + padding * 2;
    tempCanvas.height = maxY - minY + padding * 2;

    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#16213e';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.translate(-minX + padding, -minY + padding);

    const sortedNodes = [...state.nodes].sort((a, b) => a.zIndex - b.zIndex);
    sortedNodes.forEach(node => drawNode(tempCtx, node));
    state.drawings.forEach(d => drawFreehand(tempCtx, d));

    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}

function exportToSVG() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    state.nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
    });

    if (!isFinite(minX)) {
        minX = 0; minY = 0; maxX = 800; maxY = 600;
    }

    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${-minX + padding} ${-minY + padding} ${width} ${height}">`;
    svg += `<rect x="${-minX + padding}" y="${-minY + padding}" width="${width}" height="${height}" fill="#16213e"/>`;

    state.connections.forEach(conn => {
        if (!conn.startNode || !conn.endNode) return;
        const x1 = conn.startNode.x + conn.startNode.width / 2;
        const y1 = conn.startNode.y + conn.startNode.height / 2;
        const x2 = conn.endNode.x + conn.endNode.width / 2;
        const y2 = conn.endNode.y + conn.endNode.height / 2;
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${conn.strokeColor}" stroke-width="${conn.strokeWidth}"/>`;
    });

    const sortedNodes = [...state.nodes].sort((a, b) => a.zIndex - b.zIndex);
    sortedNodes.forEach(node => {
        const fill = node.useGradient ? node.fillColor : node.fillColor;
        svg += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="${fill}" stroke="${node.strokeColor}" stroke-width="${node.strokeWidth}" rx="${node.cornerRadius || 0}"/>`;
        if (node.text) {
            svg += `<text x="${node.x + node.width/2}" y="${node.y + node.height/2}" fill="${node.textColor || '#eaeaea'}" font-size="${node.fontSize || 14}" text-anchor="middle" dominant-baseline="middle">${node.text}</text>`;
        }
    });

    svg += '</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = 'mindmap.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
}
// Event Handlers
function setupEventListeners() {
    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('click', hideContextMenu);

    setupToolbar();
    setupPropertiesPanel();
    setupMinimap();
}

function setupToolbar() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setTool(btn.dataset.tool);
        });
    });

    document.getElementById('btn-zoom-in')?.addEventListener('click', () => zoom(0.1));
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => zoom(-0.1));
    document.getElementById('btn-fit')?.addEventListener('click', fitToScreen);
    document.getElementById('btn-zoom-selected')?.addEventListener('click', zoomToSelection);
    document.getElementById('btn-rulers')?.addEventListener('click', toggleRulers);
    document.getElementById('btn-save')?.addEventListener('click', saveToStorage);
    document.getElementById('btn-clear')?.addEventListener('click', clearCanvas);
    document.getElementById('btn-export')?.addEventListener('click', exportToPNG);
    document.getElementById('btn-export-svg')?.addEventListener('click', exportToSVG);
    document.getElementById('btn-layout')?.addEventListener('click', autoLayout);
    document.getElementById('panel-toggle')?.addEventListener('click', togglePanel);

    const snapToggle = document.getElementById('snap-toggle');
    if (snapToggle) {
        snapToggle.addEventListener('change', (e) => {
            state.snapToGrid = e.target.checked;
        });
    }
}

function setupPropertiesPanel() {
    document.getElementById('fill-color').addEventListener('input', (e) => {
        updateSelectedProperties('fillColor', e.target.value);
        document.getElementById('fill-color-value').textContent = e.target.value;
    });
    
    document.getElementById('gradient-color').addEventListener('input', (e) => {
        updateSelectedProperties('gradientColor', e.target.value);
        document.getElementById('gradient-color-value').textContent = e.target.value;
    });

    document.getElementById('use-gradient').addEventListener('change', (e) => {
        updateSelectedProperties('useGradient', e.target.checked);
    });

    document.getElementById('stroke-color').addEventListener('input', (e) => {
        updateSelectedProperties('strokeColor', e.target.value);
        document.getElementById('stroke-color-value').textContent = e.target.value;
    });

    document.getElementById('stroke-width').addEventListener('input', (e) => {
        updateSelectedProperties('strokeWidth', parseInt(e.target.value));
        document.getElementById('stroke-width-value').textContent = e.target.value;
    });

    document.getElementById('opacity').addEventListener('input', (e) => {
        updateSelectedProperties('opacity', parseInt(e.target.value) / 100);
        document.getElementById('opacity-value').textContent = e.target.value + '%';
    });

    document.getElementById('rotation').addEventListener('input', (e) => {
        updateSelectedProperties('rotation', parseInt(e.target.value));
        document.getElementById('rotation-value').textContent = e.target.value + '°';
    });

    document.getElementById('corner-radius').addEventListener('input', (e) => {
        updateSelectedProperties('cornerRadius', parseInt(e.target.value));
        document.getElementById('corner-radius-value').textContent = e.target.value;
    });

    document.getElementById('lock-node').addEventListener('change', (e) => {
        updateSelectedProperties('locked', e.target.checked);
    });

    document.querySelectorAll('.quick-color').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const color = e.target.dataset.color;
            updateSelectedProperties('fillColor', color);
            document.getElementById('fill-color').value = color;
            document.getElementById('fill-color-value').textContent = color;
        });
    });

    document.getElementById('font-size').addEventListener('input', (e) => {
        updateSelectedProperties('fontSize', parseInt(e.target.value));
        document.getElementById('font-size-value').textContent = e.target.value;
    });

    document.getElementById('connection-type').addEventListener('change', (e) => {
        if (state.selectedConnection) {
            state.selectedConnection.type = e.target.value;
            render();
        }
    });

    document.getElementById('show-arrow').addEventListener('change', (e) => {
        if (state.selectedConnection) {
            state.selectedConnection.endArrow = e.target.checked;
            render();
        }
    });

    document.getElementById('arrow-style').addEventListener('change', (e) => {
        if (state.selectedConnection) {
            state.selectedConnection.arrowStyle = e.target.value;
            render();
        }
    });

    document.getElementById('conn-stroke-width').addEventListener('input', (e) => {
        if (state.selectedConnection) {
            state.selectedConnection.strokeWidth = parseInt(e.target.value);
            document.getElementById('conn-stroke-width-value').textContent = e.target.value;
            render();
        }
    });

    document.getElementById('arrow-size').addEventListener('input', (e) => {
        if (state.selectedConnection) {
            state.selectedConnection.arrowSize = parseInt(e.target.value);
            document.getElementById('arrow-size-value').textContent = e.target.value;
            render();
        }
    });

    document.getElementById('connection-label').addEventListener('input', (e) => {
        if (state.selectedConnection) {
            state.selectedConnection.label = e.target.value;
            render();
        }
    });

    document.getElementById('btn-bring-front')?.addEventListener('click', bringToFront);
    document.getElementById('btn-send-back')?.addEventListener('click', sendToBack);
    document.getElementById('btn-delete-selected')?.addEventListener('click', deleteSelected);
    document.getElementById('btn-align-left')?.addEventListener('click', alignLeft);
    document.getElementById('btn-align-center')?.addEventListener('click', alignCenter);
    document.getElementById('btn-align-right')?.addEventListener('click', alignRight);
    document.getElementById('btn-align-top')?.addEventListener('click', alignTop);
    document.getElementById('btn-align-middle')?.addEventListener('click', alignMiddle);
    document.getElementById('btn-align-bottom')?.addEventListener('click', alignBottom);
    document.getElementById('btn-group')?.addEventListener('click', groupSelected);
    document.getElementById('btn-ungroup')?.addEventListener('click', ungroupSelected);

    document.getElementById('text-cancel')?.addEventListener('click', closeTextModal);
    document.getElementById('text-confirm')?.addEventListener('click', confirmTextEdit);

    document.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', handleContextMenuAction);
    });
    document.getElementById('shortcuts-close')?.addEventListener('click', () => {
        document.getElementById('shortcuts-modal').style.display = 'none';
    });
}

function setupMinimap() {
    if (minimap) {
        minimap.addEventListener('click', handleMinimapClick);
    }
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = screenToCanvas(screenX, screenY);

    state.dragStartX = screenX;
    state.dragStartY = screenY;

    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        state.isPanning = true;
        canvas.style.cursor = 'grabbing';
        return;
    }

    if (state.tool === 'select') {
        const clickedNode = findNodeAt(canvasPos.x, canvasPos.y);
        const clickedConnection = findConnectionAt(canvasPos.x, canvasPos.y);

        if (clickedNode) {
            if (clickedNode.locked) return;
            
            if (!e.ctrlKey && !state.selectedNodes.includes(clickedNode)) {
                state.selectedNodes = [clickedNode];
            } else if (e.ctrlKey) {
                const idx = state.selectedNodes.indexOf(clickedNode);
                if (idx >= 0) state.selectedNodes.splice(idx, 1);
                else state.selectedNodes.push(clickedNode);
            }

            const handle = findResizeHandle(clickedNode, canvasPos.x, canvasPos.y);
            if (handle) {
                state.isResizing = true;
                state.resizeHandle = handle;
                state.nodeStartX = clickedNode.x;
                state.nodeStartY = clickedNode.y;
                state.nodeStartWidth = clickedNode.width;
                state.nodeStartHeight = clickedNode.height;
            } else {
                if (e.altKey) {
                    saveUndoState();
                    const newNodes = [];
                    state.selectedNodes.forEach(node => {
                        const newNode = {
                            ...node,
                            id: generateId(),
                            x: node.x + 20,
                            y: node.y + 20,
                            zIndex: state.nodes.length + newNodes.length
                        };
                        newNodes.push(newNode);
                        state.nodes.push(newNode);
                    });
                    state.selectedNodes = newNodes;
                }
                state.isDragging = true;
                state.nodeStartX = canvasPos.x;
                state.nodeStartY = canvasPos.y;
            }
            state.selectedConnection = null;
        } else if (clickedConnection) {
            state.selectedConnection = clickedConnection;
            state.selectedNodes = [];
        } else {
            state.isSelecting = true;
            state.selectionRect = { x: canvasPos.x, y: canvasPos.y, width: 0, height: 0 };
            state.selectedNodes = [];
            state.selectedConnection = null;
        }
        updatePropertiesPanel();
        render();
    } else if (SHAPE_TYPES.includes(state.tool)) {
        state.isCreating = true;
        state.createStartX = snapToGridValue(canvasPos.x);
        state.createStartY = snapToGridValue(canvasPos.y);
        saveUndoState();
    } else if (state.tool === 'connection') {
        const clickedNode = findNodeAt(canvasPos.x, canvasPos.y);
        if (clickedNode) {
            if (!state.isConnecting) {
                state.isConnecting = true;
                state.connectionStartNode = clickedNode;
            } else {
                if (clickedNode !== state.connectionStartNode) {
                    createConnection(state.connectionStartNode, clickedNode);
                }
                state.isConnecting = false;
                state.connectionStartNode = null;
            }
        }
        render();
    } else if (state.tool === 'pen') {
        state.isDrawing = true;
        saveUndoState();
        state.currentDrawing = {
            id: generateId(),
            points: [{ x: canvasPos.x, y: canvasPos.y }],
            strokeColor: '#e94560',
            strokeWidth: 2
        };
        state.drawings.push(state.currentDrawing);
    } else if (state.tool === 'delete') {
        const clickedNode = findNodeAt(canvasPos.x, canvasPos.y);
        const clickedConnection = findConnectionAt(canvasPos.x, canvasPos.y);
        if (clickedNode) deleteNode(clickedNode);
        else if (clickedConnection) deleteConnection(clickedConnection);
        render();
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = screenToCanvas(screenX, screenY);

    updateStatusBar(canvasPos);

    if (state.isPanning) {
        state.panX += screenX - state.dragStartX;
        state.panY += screenY - state.dragStartY;
        state.dragStartX = screenX;
        state.dragStartY = screenY;
        render();
        return;
    }

    if (state.isResizing && state.selectedNodes.length > 0) {
        resizeSelectedNode(canvasPos);
        return;
    }

    if (state.isDragging && state.selectedNodes.length > 0) {
        moveSelectedNodes(canvasPos);
        return;
    }

    if (state.isCreating) {
        render();
        drawCreationPreview(canvasPos);
        return;
    }

    if (state.isConnecting) {
        state.tempConnectionEnd = canvasPos;
        render();
        return;
    }

    if (state.isDrawing && state.currentDrawing) {
        state.currentDrawing.points.push({ x: canvasPos.x, y: canvasPos.y });
        render();
        return;
    }

    if (state.isSelecting && state.selectionRect) {
        state.selectionRect.width = canvasPos.x - state.selectionRect.x;
        state.selectionRect.height = canvasPos.y - state.selectionRect.y;
        render();
        drawSelectionRect();
        return;
    }

    updateHoverCursor(canvasPos);
}

function handleMouseUp(e) {
    if (state.isPanning) {
        state.isPanning = false;
        updateCursor();
    }

    if (state.isResizing) {
        state.isResizing = false;
        state.resizeHandle = null;
        saveUndoState();
    }

    if (state.isDragging) {
        state.isDragging = false;
        saveUndoState();
    }

    if (state.isCreating) {
        finishCreating(e);
    }

    if (state.isSelecting && state.selectionRect) {
        finishSelecting();
    }

    state.tempConnectionEnd = null;
    render();
}

function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoom(delta, e.clientX, e.clientY);
}

function handleDoubleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = screenToCanvas(screenX, screenY);

    const clickedNode = findNodeAt(canvasPos.x, canvasPos.y);
    if (clickedNode) openTextModal(clickedNode);
}

function handleContextMenu(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = screenToCanvas(screenX, screenY);

    const clickedNode = findNodeAt(canvasPos.x, canvasPos.y);
    const clickedConnection = findConnectionAt(canvasPos.x, canvasPos.y);

    if (clickedNode && !state.selectedNodes.includes(clickedNode)) {
        state.selectedNodes = [clickedNode];
        updatePropertiesPanel();
        render();
    }

    const menu = document.getElementById('context-menu');
    menu.style.display = 'block';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
}

function handleContextMenuAction(e) {
    const action = e.target.dataset.action;
    switch (action) {
        case 'cut':
            copySelected();
            deleteSelected();
            break;
        case 'copy':
            copySelected();
            break;
        case 'paste':
            paste();
            break;
        case 'duplicate':
            duplicateSelected();
            break;
        case 'bring-front':
            bringToFront();
            break;
        case 'send-back':
            sendToBack();
            break;
        case 'delete':
            deleteSelected();
            break;
    }
    hideContextMenu();
}

function hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
}

function handleKeyDown(e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && !state.isCreating) {
        deleteSelected();
        e.preventDefault();
    }

    if (e.key === 'Escape') {
        state.selectedNodes = [];
        state.selectedConnection = null;
        state.isConnecting = false;
        state.connectionStartNode = null;
        state.isCreating = false;
        closeTextModal();
        updatePropertiesPanel();
        render();
    }

    if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        state.selectedNodes = [...state.nodes];
        updatePropertiesPanel();
        render();
    }

    if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
    }

    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveToStorage();
    }

    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    }

    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
    }

    if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        copySelected();
    }

    if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        paste();
    }

    if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        groupSelected();
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        ungroupSelected();
    }

    if (KEYBOARD_SHORTCUTS[e.key]) {
        setTool(KEYBOARD_SHORTCUTS[e.key]);
    }

    if (e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        toggleRulers();
    }

    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        document.getElementById('shortcuts-modal').style.display = 'flex';
    }
}

function handleCopy(e) {
    if (state.selectedNodes.length === 0) return;
    try {
        const data = JSON.stringify(state.selectedNodes.map(n => ({ ...n, groupId: undefined })));
        localStorage.setItem('mindmap_clipboard', data);
    } catch (err) {}
}

function handlePaste(e) {
    try {
        let data = localStorage.getItem('mindmap_clipboard');
        if (!data) return;
        
        const nodes = JSON.parse(data);
        saveUndoState();
        const newNodes = nodes.map(node => ({
            ...node,
            id: generateId(),
            x: node.x + 20,
            y: node.y + 20,
            groupId: undefined
        }));
        newNodes.forEach(n => state.nodes.push(n));
        state.selectedNodes = newNodes;
        updatePropertiesPanel();
        render();
    } catch (err) {}
}

function handleMinimapClick(e) {
    const rect = minimap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const bounds = getContentBounds();
    if (!bounds) return;

    const scale = 180 / (bounds.maxX - bounds.minX + 100);
    const contentX = x / scale + bounds.minX - 50;
    const contentY = y / scale + bounds.minY - 50;

    state.panX = canvas.width / 2 - contentX * state.zoom;
    state.panY = canvas.height / 2 - contentY * state.zoom;
    render();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawRulers();
    drawConnections();
    drawNodes();
    drawFreehandLines();
    drawConnectionAnchors();
    drawSelection();
    drawSmartGuides();
    if (state.isConnecting && state.connectionStartNode) drawConnectionPreview();
    drawMinimap();
}

function autoLayout() {
    if (state.nodes.length === 0) return;
    
    saveUndoState();
    
    const centerX = canvas.width / 2 / state.zoom;
    const centerY = canvas.height / 2 / state.zoom;
    
    const sortedNodes = [...state.nodes].sort((a, b) => a.zIndex - b.zIndex);
    
    const cols = Math.ceil(Math.sqrt(sortedNodes.length));
    const spacingX = 200;
    const spacingY = 150;
    
    sortedNodes.forEach((node, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        node.x = centerX - (cols * spacingX / 2) + col * spacingX + (node.width / 2);
        node.y = centerY - (Math.ceil(sortedNodes.length / cols) * spacingY / 2) + row * spacingY + (node.height / 2);
    });
    
    render();
}

function init() {
    resizeCanvas();
    loadFromStorage();
    setupEventListeners();
    render();
    startAutoSave();
}

// Initialize the app when DOM is ready
init();
