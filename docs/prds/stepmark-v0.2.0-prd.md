# SnapNote V0.2.0 - Product Requirements Document (PRD)

## Requirements Description

### Background

- **Business Problem**: V0.1.0 has shipped, but the core annotation flow still has several visual and interaction issues that make the tool feel less polished than Snipaste. V0.2.0 should focus on fixing these defects and adding practical style customization.
- **Target Users**: Windows users who create screenshot feedback for product review, implementation acceptance, and daily issue reporting.
- **Value Proposition**: Make SnapNote's annotation output cleaner, make smart annotation feel more natural, and let users persist their preferred visual style across sessions.

### Feature Overview

- **Core Features**:
  - Remove unwanted light-blue shadow/glow from smart note, rectangle, and arrow annotations.
  - Improve smart note label placement when the arrow endpoint is on the left side.
  - Change smart note arrow start logic from nearest rectangle corner to nearest point on the shape boundary.
  - Allow the screenshot crop region to be adjusted inside the editor, including expanding outward beyond the initially selected region.
  - Add persistent per-tool style settings for color, stroke width, shape, line style, arrow head size, font size, and font family.
  - Add Snipaste-style secondary option panel under the toolbar for the selected tool.
- **Feature Boundaries**:
  - Included: smart note, rectangle, arrow, and text style customization.
  - Included: editor-stage crop adjustment based on the original full-screen capture.
  - Included: rectangular and elliptical shape modes for smart note boundary and rectangle tool.
  - Included: solid and dashed arrow modes, plus arrow head size adjustment.
  - Excluded: AI analysis, issue-list markdown export, cloud sync, multi-profile style presets, and advanced shape libraries.
- **User Scenarios**:
  - A user captures a region, notices the initial selection missed a few pixels, and drags an editor crop handle outward to include the missing screen area.
  - A user prefers blue 5px arrows and larger text. They change the style once, close SnapNote, and the next screenshot uses the same settings.
  - A user creates a smart note with the arrow extending left from the target shape. The text input appears on the left side and grows leftward while typing.

### Detailed Requirements

#### Bug Fixes

1. **Remove annotation shadow**
   - Smart note, rectangle, and arrow annotations must not render the current unwanted light-blue shadow/glow after creation.
   - Selection affordances may still exist, but they must be explicit handles or bounding controls, not a persistent decorative blue shadow on the annotation itself.

2. **Smart note left-side label behavior**
   - When the smart note arrow endpoint is left of the target shape centerline, the text input overlay appears to the left of the arrow endpoint.
   - While typing, the caret remains visually anchored and the text box expands leftward.
   - Long text should extend left by default in this case, instead of pushing the label rightward over the arrow or target shape.

3. **Smart note arrow start follows nearest boundary**
   - During smart note arrow preview, the arrow tail must continuously recompute from the shape boundary point nearest to the current mouse position.
   - The start point must not stay fixed at one corner after the target shape is drawn.
   - For rectangular smart notes, compute the nearest point on the rectangle perimeter.
   - For elliptical smart notes, compute the intersection point on the ellipse boundary in the direction from the ellipse center to the mouse position.

4. **Editor crop adjustment**
   - After entering the editor, users can resize the screenshot crop region by dragging any of the four edges or four corners.
   - The crop region can expand outward beyond the originally selected area, as long as it stays within the original full-screen capture bounds.
   - Crop adjustment should behave like Snipaste: direct manipulation handles on the current screenshot boundary, with immediate visual feedback.

#### New Requirements

1. **Persistent style settings**
   - Style settings must be saved locally and restored after closing and reopening SnapNote.
   - Settings are per tool where behavior differs by tool.
   - Defaults must remain compatible with V0.1.0: red `#ff4757`, 3px stroke, system font.

2. **Toolbar secondary option panel**
   - Clicking a tool in the toolbar shows a small secondary panel below the toolbar.
   - The panel content depends on the active tool.
   - The panel should follow the Snipaste reference pattern provided by the user: compact controls for stroke width, fill/shape options where applicable, and color swatches.

3. **Tool-specific options**
   - Smart note:
     - Color.
     - Stroke width.
     - Shape: rectangle or ellipse.
     - Text font size.
     - Text font family.
   - Rectangle:
     - Color.
     - Stroke width.
     - Shape: rectangle or ellipse.
   - Arrow:
     - Color.
     - Stroke width.
     - Line style: solid or dashed.
     - Arrow head size.
   - Text:
     - Color.
     - Font size.
     - Font family.

### Input/Output

- **Input**:
  - Mouse drag on crop handles.
  - Toolbar tool selection.
  - Secondary panel style changes.
  - Keyboard or wheel input for numeric stroke width and font size, where supported.
  - Text input for font family selection or dropdown selection from available fonts.
- **Output**:
  - Updated editor preview.
  - Updated annotation style for newly created annotations.
  - Persisted local settings for future sessions.
  - Exported image reflects the current crop region and visible annotations.

### Edge Cases

- Crop region cannot be resized outside the original full-screen capture.
- Crop region must enforce a practical minimum size, such as 20x20 px.
- Annotations are positioned in full-screen coordinate space. If crop adjustment hides an annotation outside the crop, the annotation remains stored and is clipped by the visible canvas.
- Undo/redo should include crop-region changes.
- Existing annotations should keep their own styles after creation unless an explicit "apply to selected annotation" action exists. V0.2.0 only requires style settings to affect newly created annotations.
- If a saved font family is unavailable, fall back to system UI font without crashing.
- If style settings are corrupt or missing, use defaults.

## Design Decisions

### Technical Approach

- **Architecture Choice**: Keep the existing Tauri 2 + React + TypeScript + Konva + Zustand architecture. V0.2.0 should extend the editor model rather than replace it.
- **Full-screen source image**: The editor must retain the original full-screen capture, not only the initially cropped image. The current visible screenshot is a crop viewport over that full-screen source.
- **Coordinate model**: Store crop bounds and annotations in full-screen coordinate space. Rendering maps full-screen coordinates into the editor viewport by subtracting the current crop origin.
- **Style model**: Add a persistent style settings store, likely backed by localStorage or a Tauri-side settings file. Use a typed wrapper so corrupt persisted values can be validated and reset.
- **Toolbar option panel**: Add a reusable secondary panel component that renders controls based on the active tool and updates the persisted style store.

### Suggested Data Model Changes

```typescript
type ShapeKind = "rect" | "ellipse";
type LineStyle = "solid" | "dashed";

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EditorState {
  sourceImage: string;       // full-screen capture base64
  cropRegion: CropRegion;   // visible crop in source-image coordinates
  annotations: Annotation[]; // coordinates are source-image coordinates
}

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

### Constraints

- **Platform**: Windows x64 only.
- **Performance**: Crop handle dragging and arrow preview should remain visually smooth. Target: no visible lag during normal mouse movement on a 1080p display.
- **Compatibility**: Preserve V0.1.0 export behavior: PNG/JPG save and clipboard copy still export the visible crop with annotations.
- **Visual Quality**: Default style remains Snipaste-like: 3px stroke, `#ff4757`, system font.
- **Implementation Boundary**: Do not add a full settings page in V0.2.0 unless required by implementation. Use the toolbar secondary panel for this release.

### Risk Assessment

- **Crop coordinate migration risk**: Moving from cropped-image coordinates to full-screen coordinates can break annotation placement and export. Mitigation: add geometry tests and manual smoke tests for initial crop, expanded crop, shrunken crop, and exported output.
- **Konva rendering risk**: Crop clipping and shape transforms can produce off-by-one or blurry output. Mitigation: render the full-screen source with explicit crop offset and verify export pixels manually.
- **Text input overlay risk**: HTML input positioning over Konva can drift when crop origin changes. Mitigation: centralize coordinate conversion helpers and test left/right label placement.
- **Settings persistence risk**: Invalid saved values can break the toolbar. Mitigation: validate persisted settings and fallback to defaults.

## Acceptance Criteria

### Functional Acceptance

- [ ] Smart note, rectangle, and arrow annotations no longer show the unwanted light-blue shadow after creation.
- [ ] Smart note labels appear on the left side and grow leftward when the arrow endpoint is left of the target shape centerline.
- [ ] Smart note arrow tail follows the nearest boundary point while the mouse moves during arrow preview.
- [ ] Smart note supports rectangle and ellipse target shapes.
- [ ] Rectangle tool supports rectangle and ellipse shapes.
- [ ] Arrow tool supports solid and dashed lines.
- [ ] Arrow head size can be adjusted and affects newly created arrows.
- [ ] Each supported tool can persist color and relevant style settings after app restart.
- [ ] Text and smart note tools can persist font size and font family.
- [ ] Clicking a toolbar tool opens a compact secondary options panel below the toolbar.
- [ ] Editor crop region can be resized by dragging four edges and four corners.
- [ ] Editor crop region can expand beyond the initially selected screenshot area but not beyond the original full-screen capture.
- [ ] Annotations outside the current crop remain stored but are clipped from the visible/exported image.
- [ ] Export to clipboard and file uses the current crop region.

### Quality Standards

- [ ] Geometry helpers for nearest rectangle boundary point and nearest ellipse boundary point have unit tests.
- [ ] Crop coordinate conversion helpers have unit tests.
- [ ] Settings validation and default fallback have unit tests.
- [ ] Existing V0.1.0 core flows still pass: F1 capture, editor open, annotate, copy, save, close.
- [ ] Manual smoke test covers at least 1080p display and one high-DPI scenario if available.

### User Acceptance

- [ ] Default visual output is clean and does not include unwanted blue glow.
- [ ] The smart note flow feels coordinated: target shape, arrow tail, arrow endpoint, and label placement match mouse intent.
- [ ] Style changes feel immediate and are easy to find from the active toolbar tool.
- [ ] Crop resizing behaves close enough to Snipaste for edge and corner dragging.

## Execution Phases

### Phase 1: Data Model and Geometry

**Goal**: Prepare the coordinate and style foundation.

- [ ] Add crop-region model based on full-screen source coordinates.
- [ ] Add coordinate conversion helpers between source coordinates, crop viewport coordinates, and Konva stage coordinates.
- [ ] Add nearest rectangle boundary and ellipse boundary geometry helpers.
- [ ] Extend annotation/style types for shape kind, line style, arrow head size, font size, and font family.
- [ ] Add unit tests for geometry and coordinate conversion.

**Deliverables**: Updated types, geometry helpers, tests.
**Time**: 0.5-1 day.

### Phase 2: Crop Adjustment in Editor

**Goal**: Allow editor-stage crop resizing from original full-screen capture.

- [ ] Ensure editor receives and retains the original full-screen source image.
- [ ] Render visible screenshot as a crop viewport over the full-screen source.
- [ ] Add crop boundary handles for four edges and four corners.
- [ ] Clamp crop resizing to full-screen source bounds and minimum crop size.
- [ ] Include crop changes in undo/redo.
- [ ] Update export to use the current crop region.

**Deliverables**: Editor crop resize flow, export alignment, manual smoke test.
**Time**: 1-2 days.

### Phase 3: Smart Note Behavior Fixes

**Goal**: Make smart note arrow and label placement natural.

- [ ] Replace smart note fixed-corner arrow start with nearest-boundary tracking.
- [ ] Support rectangle and ellipse smart note boundaries.
- [ ] Implement left-side label input positioning and leftward text growth.
- [ ] Remove unwanted blue shadow from smart note rendering.
- [ ] Add smoke tests for right-side, left-side, top-side, and bottom-side label placement.

**Deliverables**: Improved smart note interaction.
**Time**: 1 day.

### Phase 4: Style Settings and Toolbar Option Panel

**Goal**: Add persistent Snipaste-style tool options.

- [ ] Add persistent tool style store with validation and default fallback.
- [ ] Add toolbar secondary option panel below active tool.
- [ ] Add color swatches or color picker.
- [ ] Add stroke width control with wheel and keyboard/input support.
- [ ] Add shape selector for smart note and rectangle tools.
- [ ] Add solid/dashed selector and arrow head size control for arrow tool.
- [ ] Add font size and font family controls for smart note and text tools.
- [ ] Apply settings to newly created annotations.

**Deliverables**: Persistent style customization UI.
**Time**: 1-2 days.

### Phase 5: Regression, Packaging, and Release

**Goal**: Stabilize V0.2.0 for release.

- [ ] Run unit tests.
- [ ] Run frontend build.
- [ ] Run Tauri build if release packaging is required.
- [ ] Manual smoke test: capture, crop expand/shrink, smart note, rectangle/ellipse, arrow solid/dashed, text font, copy, save.
- [ ] Update release notes for V0.2.0.

**Deliverables**: Release-ready V0.2.0 build and notes.
**Time**: 0.5-1 day.

---

**Document Version**: 1.0
**Created**: 2026-06-18
**Clarification Rounds**: 3
**Quality Score**: 94/100
