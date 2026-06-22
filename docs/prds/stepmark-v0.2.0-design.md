# SnapNote V0.2.0 Design

> Companion design document for `docs/prds/snapnote-v0.2.0-prd.md`.
> PRD defines what V0.2.0 delivers. This file defines how the implementation should behave.

## 1. Design Goals

V0.2.0 focuses on three areas:

1. Fix visible annotation defects from V0.1.0.
2. Move editor rendering to a full-screen-source coordinate model so crop adjustment can expand beyond the initially selected region.
3. Add persistent, per-tool style customization through a compact Snipaste-style secondary toolbar panel.

The implementation must preserve the existing stack:

- Tauri 2
- React 18
- TypeScript
- Vite
- Konva / react-konva
- Zustand
- xcap for screen capture

## 2. Coordinate Model

### 2.1 Core Decision

V0.2.0 must store the original full-screen screenshot in the editor, not only the cropped region.

Implementation note for the current V0.1 codebase: the editor already draws the full screenshot at window size and treats Konva stage coordinates as screen/source coordinates. V0.2.0 should preserve that model and upgrade the existing initial selection rectangle into a mutable `cropRegion`; it should not rewrite the editor into a separate crop-origin viewport coordinate system.

The editor should treat the screenshot as:

- `sourceImage`: full-screen capture returned by xcap.
- `cropRegion`: the visible region inside `sourceImage`.
- `annotations`: stored in source-image coordinates.

This is required because the editor crop region can expand outward beyond the user's initial screenshot selection.

### 2.2 Data Shape

```ts
interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EditorImageState {
  sourceImage: string;
  sourceSize: Size;
  cropRegion: Rect;
}
```

`cropRegion.x` and `cropRegion.y` are offsets inside the original full-screen image.

### 2.3 Coordinate Conversion

All tool hooks and shape renderers must use explicit conversion helpers instead of local ad hoc math.

```ts
function sourceToViewport(point: Point, crop: Rect): Point {
  return {
    x: point.x - crop.x,
    y: point.y - crop.y,
  };
}

function viewportToSource(point: Point, crop: Rect): Point {
  return {
    x: point.x + crop.x,
    y: point.y + crop.y,
  };
}
```

Rendering rule:

- Konva stage coordinates represent the current crop viewport.
- Annotation data remains in source coordinates.
- Shape components convert source coordinates to viewport coordinates before rendering.
- Mouse events from Konva are converted from viewport coordinates back to source coordinates before creating or updating annotations.

### 2.4 Export Rule

Export must render the current crop viewport only.

The exported image includes:

1. The source image portion inside `cropRegion`.
2. Any visible portions of annotations intersecting `cropRegion`.
3. No annotations or pixels outside `cropRegion`.

## 3. Editor Crop Adjustment

### 3.1 Interaction

After entering the editor, the visible screenshot boundary has 8 resize handles:

- 4 corners: top-left, top-right, bottom-left, bottom-right.
- 4 edges: top, right, bottom, left.

Dragging a handle updates `cropRegion` in real time.

The interaction should feel like Snipaste:

- Direct manipulation.
- Immediate visual feedback.
- Cursor changes by handle direction.
- Toolbar follows the crop boundary and remains near the crop, flipping above if there is not enough space below.

### 3.2 Constraints

Crop adjustment must satisfy:

- Crop cannot move outside `sourceImage`.
- Crop cannot shrink below a minimum size.
- Recommended minimum: `20 x 20`.
- Corner handles update two sides.
- Edge handles update one side.

Clamp logic:

```ts
const MIN_CROP_SIZE = 20;
```

When dragging left/top handles, preserve the opposite side unless clamped by the minimum size or source bounds.

### 3.3 Annotation Behavior During Crop

Annotations are anchored to the original full-screen image.

If crop changes:

- Annotation source coordinates do not change.
- Rendering position changes because viewport origin changes.
- An annotation outside the current crop remains in state.
- An annotation outside the current crop is clipped by the crop viewport and export.

This applies to smart notes, rectangles/ellipses, arrows, text, and mosaic regions.

### 3.4 Undo/Redo

Crop changes are structural editor changes and should participate in undo/redo.

Recommended snapshot:

```ts
interface EditorSnapshot {
  cropRegion: Rect;
  annotations: Annotation[];
}
```

During drag, avoid pushing one history entry per mousemove. Push history once when the crop drag ends.

## 4. Smart Note Geometry

### 4.1 Previous Rule

V0.1.0 used:

- Arrow tail = nearest rectangle corner.

V0.2.0 replaces this rule.

### 4.2 New Rule

During smart note arrow preview:

- Arrow head follows the mouse.
- Arrow tail is recomputed continuously.
- Arrow tail is the nearest boundary point on the smart note shape.

The smart note shape can be:

- Rectangle.
- Ellipse.

### 4.3 Rectangle Boundary Point

For a rectangle and a mouse point, compute the closest point on the rectangle perimeter.

Expected helper:

```ts
function nearestPointOnRectBoundary(rect: Rect, point: Point): Point
```

Rules:

- If the point is outside the rectangle, clamp the point to the rectangle bounds, then project to the nearest edge if needed.
- If the point is inside the rectangle, choose the nearest edge by distance and project onto that edge.
- The returned point must always lie on the rectangle perimeter.

### 4.4 Ellipse Boundary Point

For an ellipse and a mouse point, compute the boundary point along the ray from ellipse center to mouse point.

Expected helper:

```ts
function pointOnEllipseBoundary(ellipseBounds: Rect, point: Point): Point
```

Algorithm:

1. Let center be `(cx, cy)`.
2. Let radii be `rx = width / 2`, `ry = height / 2`.
3. Let direction be `dx = point.x - cx`, `dy = point.y - cy`.
4. If direction is zero, return the rightmost boundary point `(cx + rx, cy)`.
5. Scale direction to ellipse boundary:

```ts
const scale = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
return {
  x: cx + dx * scale,
  y: cy + dy * scale,
};
```

### 4.5 Smart Note Data

Smart note should no longer depend on `startCorner`.

Recommended model:

```ts
type ShapeKind = "rect" | "ellipse";

interface SmartAnnotation {
  type: "smart";
  rect: Rect;
  shape: ShapeKind;
  arrow: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
  note: string;
  style: AnnotationStyle;
}
```

During preview, `startX/startY` are derived from the current mouse position and the selected shape boundary. On commit, store the final computed start point.

## 5. Smart Note Text Placement

### 5.1 Placement Rule

When the smart note arrow endpoint is on the left side of the target shape, the text input appears to the left of the endpoint.

Use the target shape center as the reference:

```ts
const isLeftSide = arrowEnd.x < shapeCenter.x;
```

For V0.2.0 this is the required left/right rule. Top/bottom refinements can remain simple as long as labels do not overlap the target shape in normal use.

### 5.2 Leftward Text Growth

When `isLeftSide === true`:

- The input anchor is the arrow endpoint.
- The input box extends left from the anchor.
- Text alignment is right.
- The caret stays near the anchor while typed text grows leftward.

Implementation direction:

- Use an HTML input or textarea overlay.
- Measure text width as the user types.
- Position `left = anchorViewportX - measuredWidth`.
- Use `text-align: right`.
- Keep a minimum input width.

### 5.3 Right-side Behavior

When `isLeftSide === false`:

- The input starts at the arrow endpoint.
- Text grows rightward.
- Text alignment is left.

## 6. Annotation Visual Cleanup

### 6.1 Blue Shadow Removal

Smart note, rectangle, and arrow annotations must not render the unwanted light-blue shadow/glow after creation.

Search for Konva props or CSS that may cause this:

- `shadowColor`
- `shadowBlur`
- `shadowOpacity`
- selection overlay strokes
- Transformer border styles
- hover highlight styles

Selection feedback is still allowed, but it must be clearly an editing affordance:

- Handles.
- Thin bounding outline.
- Temporary hover state.

It must not look like an exported annotation style.

### 6.2 Export Safety

Selection-only UI must not be included in exported images.

Recommended layer split:

- Background layer.
- Annotation layer.
- Editing overlay layer.

Only background and annotation layers should be exported.

## 7. Style System

### 7.1 Persistent Tool Styles

Style settings are persisted per tool and restored on next launch.

Recommended storage:

- Frontend `localStorage` is acceptable for V0.2.0.
- A Tauri-side settings file can be added later if global settings expand.

Use a typed settings loader with validation and default fallback.

### 7.2 Settings Model

```ts
type LineStyle = "solid" | "dashed";
type ShapeKind = "rect" | "ellipse";

interface ToolStyleSettings {
  smart: {
    color: string;
    strokeWidth: number;
    shape: ShapeKind;
    fontSize: number;
    fontFamily: string;
  };
  rect: {
    color: string;
    strokeWidth: number;
    shape: ShapeKind;
  };
  arrow: {
    color: string;
    strokeWidth: number;
    lineStyle: LineStyle;
    arrowHeadSize: number;
  };
  text: {
    color: string;
    fontSize: number;
    fontFamily: string;
  };
}
```

Defaults:

```ts
const DEFAULT_TOOL_STYLES: ToolStyleSettings = {
  smart: {
    color: "#ff4757",
    strokeWidth: 3,
    shape: "rect",
    fontSize: 13,
    fontFamily: "system-ui",
  },
  rect: {
    color: "#ff4757",
    strokeWidth: 3,
    shape: "rect",
  },
  arrow: {
    color: "#ff4757",
    strokeWidth: 3,
    lineStyle: "solid",
    arrowHeadSize: 12,
  },
  text: {
    color: "#ff4757",
    fontSize: 13,
    fontFamily: "system-ui",
  },
};
```

### 7.3 Validation

Validate persisted values on load:

- `color`: valid CSS color or hex.
- `strokeWidth`: clamp to a reasonable range, recommended `1-12`.
- `fontSize`: clamp to a reasonable range, recommended `10-72`.
- `arrowHeadSize`: clamp to a reasonable range, recommended `6-40`.
- `shape`: must be `rect` or `ellipse`.
- `lineStyle`: must be `solid` or `dashed`.
- `fontFamily`: non-empty string; fallback to `system-ui`.

If any field is invalid, replace only that field with default where practical.

### 7.4 Application Rule

Style settings apply to newly created annotations.

Existing annotations keep their own style unless the user explicitly edits a selected annotation. V0.2.0 does not require selected-annotation style editing.

## 8. Toolbar Secondary Panel

### 8.1 Behavior

Clicking a toolbar tool shows a compact secondary panel below the toolbar.

The panel:

- Is attached visually to the toolbar.
- Changes content based on active tool.
- Uses compact controls similar to the user-provided Snipaste reference.
- Should not block the screenshot content more than necessary.
- Should flip above the toolbar if there is not enough space below.

### 8.2 Controls By Tool

Smart note:

- Stroke width control.
- Shape selector: rectangle / ellipse.
- Color swatches or color picker.
- Font size control.
- Font family control.

Rectangle:

- Stroke width control.
- Shape selector: rectangle / ellipse.
- Color swatches or color picker.

Arrow:

- Stroke width control.
- Line style selector: solid / dashed.
- Arrow head size control.
- Color swatches or color picker.

Text:

- Color swatches or color picker.
- Font size control.
- Font family control.

Mosaic, copy, save, close:

- No V0.2.0 secondary style panel required unless already supported by the existing UI.

### 8.3 Numeric Controls

Stroke width, font size, and arrow head size should support precise changes.

Preferred V0.2.0 behavior:

- Mouse wheel over the numeric control increments/decrements.
- Keyboard input can set an exact value.
- Values are clamped to valid ranges.

## 9. Rendering Requirements

### 9.1 Rectangle and Ellipse

The same annotation type can represent rectangle and ellipse by `shape`.

Renderer behavior:

- `shape === "rect"`: render Konva `Rect`.
- `shape === "ellipse"`: render Konva `Ellipse` using the same bounds.

Smart note uses this for its target boundary. Rectangle tool uses this for standalone shapes.

### 9.2 Dashed Arrow

Arrow line style maps to Konva dash props.

Suggested mapping:

```ts
const dash = lineStyle === "dashed" ? [8, 6] : undefined;
```

Arrow head size should affect pointer/head dimensions consistently.

### 9.3 Text Style

Smart note and text annotations use their own font settings from the style snapshot saved at creation time.

If the font is unavailable, browser fallback is acceptable.

## 10. Testing Strategy

### 10.1 Unit Tests

Required:

- `nearestPointOnRectBoundary`.
- `pointOnEllipseBoundary`.
- `sourceToViewport`.
- `viewportToSource`.
- Crop clamp logic.
- Tool style settings validation.

### 10.2 Manual Smoke Tests

Run after implementation:

1. Capture a region, expand crop left/top/right/bottom in editor, then export.
2. Capture a region, shrink crop so an annotation is outside the crop, then expand again and verify annotation still exists.
3. Smart note rectangle: move arrow preview around all sides and confirm arrow tail follows boundary.
4. Smart note ellipse: move arrow preview around all sides and confirm arrow tail follows ellipse boundary.
5. Smart note left-side label: type long text and verify it grows leftward.
6. Rectangle tool: create rectangle and ellipse with different colors and stroke widths.
7. Arrow tool: create solid and dashed arrows with different arrow head sizes.
8. Text tool: create text with changed font size and font family.
9. Restart SnapNote and confirm style settings persist.
10. Export and confirm no selection handles or blue shadows appear in the output.

## 11. Implementation Order

Recommended order:

1. Coordinate conversion helpers and tests.
2. Full-screen source image plus crop-region editor state.
3. Editor crop handles and crop export.
4. Smart note nearest-boundary geometry.
5. Smart note left-side text input behavior.
6. Blue shadow cleanup.
7. Persistent tool style settings.
8. Toolbar secondary panel.
9. Tool renderers consume style settings.
10. Regression and packaging.

This order keeps the risky coordinate change ahead of style UI work.

---

**Document Version**: 1.0
**Created**: 2026-06-18
