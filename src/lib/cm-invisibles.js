import { ViewPlugin, Decoration, WidgetType } from "@codemirror/view";

/** C0 control characters -> Unicode Control Pictures */
const CONTROL_PICTURES = {
    0x00: "\u2400", 0x01: "\u2401", 0x02: "\u2402", 0x03: "\u2403",
    0x04: "\u2404", 0x05: "\u2405", 0x06: "\u2406", 0x07: "\u2407",
    0x08: "\u2408",
    // 0x09 (tab) and 0x0A (LF) handled by CM natively
    0x0B: "\u240B", 0x0C: "\u240C", 0x0D: "\u240D",
    0x0E: "\u240E", 0x0F: "\u240F", 0x10: "\u2410", 0x11: "\u2411",
    0x12: "\u2412", 0x13: "\u2413", 0x14: "\u2414", 0x15: "\u2415",
    0x16: "\u2416", 0x17: "\u2417", 0x18: "\u2418", 0x19: "\u2419",
    0x1A: "\u241A", 0x1B: "\u241B", 0x1C: "\u241C", 0x1D: "\u241D",
    0x1E: "\u241E", 0x1F: "\u241F", 0x7F: "\u2421",
};

/** Extended invisible/whitespace characters */
const EXTENDED_INVISIBLES = {
    0x85: "NEL", 0xA0: "NBSP", 0x1680: "OGSP",
    0x2000: "NQSP", 0x2001: "MQSP", 0x2002: "ENSP", 0x2003: "EMSP",
    0x2004: "3/SP", 0x2005: "4/SP", 0x2006: "6/SP", 0x2007: "FSP",
    0x2008: "PSP", 0x2009: "TSP", 0x200A: "HSP", 0x200B: "ZWSP",
    0x200C: "ZWNJ", 0x200D: "ZWJ", 0x2028: "LS", 0x2029: "PS",
    0x202F: "NNBSP", 0x205F: "MMSP", 0x2060: "WJ", 0x3000: "IDSP",
    0xFEFF: "BOM",
};

/** Widget that renders a space as a visible dot */
class SpaceDot extends WidgetType {
    toDOM() {
        const span = document.createElement("span");
        span.className = "jte-invisible jte-invisible-space";
        span.textContent = "\u00B7"; // middle dot
        return span;
    }
    eq() { return true; }
}

/** Widget that renders a tab as an arrow */
class TabArrow extends WidgetType {
    toDOM() {
        const span = document.createElement("span");
        span.className = "jte-invisible jte-invisible-tab";
        span.textContent = "\u2192"; // right arrow
        return span;
    }
    eq() { return true; }
}

/** Widget that renders a control char label */
class InvisibleChar extends WidgetType {
    constructor(label) { super(); this.label = label; }
    toDOM() {
        const span = document.createElement("span");
        span.className = "jte-invisible jte-invisible-control";
        span.textContent = this.label;
        return span;
    }
    eq(other) { return this.label === other.label; }
}

const spaceDot = new SpaceDot();
const tabArrow = new TabArrow();

function buildDecorations(view) {
    const widgets = [];
    for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        for (let i = 0; i < text.length; i++) {
            const code = text.codePointAt(i);
            const pos = from + i;

            if (code === 0x20) {
                // Space: add a widget after the space (don't replace, preserves cursor)
                widgets.push(Decoration.widget({ widget: spaceDot, side: 1 }).range(pos));
            } else if (code === 0x09) {
                // Tab: add arrow widget at start of tab
                widgets.push(Decoration.widget({ widget: tabArrow, side: 1 }).range(pos));
            } else if (CONTROL_PICTURES[code]) {
                widgets.push(Decoration.replace({
                    widget: new InvisibleChar(CONTROL_PICTURES[code]),
                }).range(pos, pos + 1));
            } else if (EXTENDED_INVISIBLES[code]) {
                const label = `[${EXTENDED_INVISIBLES[code]}]`;
                widgets.push(Decoration.replace({
                    widget: new InvisibleChar(label),
                }).range(pos, pos + (code > 0xFFFF ? 2 : 1)));
                if (code > 0xFFFF) i++; // skip surrogate pair
            }
        }
    }
    return Decoration.set(widgets, true);
}

/**
 * CM6 ViewPlugin that renders invisible characters.
 * Only scans visible ranges for performance with large files.
 */
export const invisiblesPlugin = ViewPlugin.fromClass(
    class {
        constructor(view) { this.decorations = buildDecorations(view); }
        update(update) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = buildDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations },
);
