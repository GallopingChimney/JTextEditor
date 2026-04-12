import { StreamLanguage } from "@codemirror/language";

/** Cache of loaded language support instances */
const cache = new Map();

/**
 * Language loader registry.
 * Keys match the language IDs from languages.js.
 * Each value is a thunk returning a Promise<LanguageSupport | StreamLanguage>.
 */
const LOADERS = {
    // Native CM6 language packages
    js:         () => import("@codemirror/lang-javascript").then(m => m.javascript({ jsx: true })),
    jsx:        () => import("@codemirror/lang-javascript").then(m => m.javascript({ jsx: true })),
    ts:         () => import("@codemirror/lang-javascript").then(m => m.javascript({ typescript: true, jsx: true })),
    tsx:        () => import("@codemirror/lang-javascript").then(m => m.javascript({ typescript: true, jsx: true })),
    py:         () => import("@codemirror/lang-python").then(m => m.python()),
    c:          () => import("@codemirror/lang-cpp").then(m => m.cpp()),
    cpp:        () => import("@codemirror/lang-cpp").then(m => m.cpp()),
    h:          () => import("@codemirror/lang-cpp").then(m => m.cpp()),
    hpp:        () => import("@codemirror/lang-cpp").then(m => m.cpp()),
    cs:         () => import("@codemirror/lang-java").then(m => m.java()),
    java:       () => import("@codemirror/lang-java").then(m => m.java()),
    rs:         () => import("@codemirror/lang-rust").then(m => m.rust()),
    go:         () => import("@codemirror/lang-go").then(m => m.go()),
    css:        () => import("@codemirror/lang-css").then(m => m.css()),
    html:       () => import("@codemirror/lang-html").then(m => m.html()),
    htm:        () => import("@codemirror/lang-html").then(m => m.html()),
    svg:        () => import("@codemirror/lang-html").then(m => m.html()),
    xml:        () => import("@codemirror/lang-xml").then(m => m.xml()),
    json:       () => import("@codemirror/lang-json").then(m => m.json()),
    md:         () => import("@codemirror/lang-markdown").then(m => m.markdown()),
    sql:        () => import("@codemirror/lang-sql").then(m => m.sql()),
    php:        () => import("@codemirror/lang-php").then(m => m.php()),
    yaml:       () => import("@codemirror/lang-yaml").then(m => m.yaml()),
    yml:        () => import("@codemirror/lang-yaml").then(m => m.yaml()),

    // Legacy modes (CM5-era tokenizers via StreamLanguage)
    rb:         () => import("@codemirror/legacy-modes/mode/ruby").then(m => StreamLanguage.define(m.ruby)),
    swift:      () => import("@codemirror/legacy-modes/mode/swift").then(m => StreamLanguage.define(m.swift)),
    kt:         () => import("@codemirror/legacy-modes/mode/clike").then(m => StreamLanguage.define(m.kotlin)),
    lua:        () => import("@codemirror/legacy-modes/mode/lua").then(m => StreamLanguage.define(m.lua)),
    pl:         () => import("@codemirror/legacy-modes/mode/perl").then(m => StreamLanguage.define(m.perl)),
    r:          () => import("@codemirror/legacy-modes/mode/r").then(m => StreamLanguage.define(m.r)),
    scala:      () => import("@codemirror/legacy-modes/mode/clike").then(m => StreamLanguage.define(m.scala)),
    dart:       () => import("@codemirror/legacy-modes/mode/clike").then(m => StreamLanguage.define(m.dart)),
    ps1:        () => import("@codemirror/legacy-modes/mode/powershell").then(m => StreamLanguage.define(m.powerShell)),
    toml:       () => import("@codemirror/legacy-modes/mode/toml").then(m => StreamLanguage.define(m.toml)),
    diff:       () => import("@codemirror/legacy-modes/mode/diff").then(m => StreamLanguage.define(m.diff)),
    dockerfile: () => import("@codemirror/legacy-modes/mode/dockerfile").then(m => StreamLanguage.define(m.dockerFile)),
    ini:        () => import("@codemirror/legacy-modes/mode/properties").then(m => StreamLanguage.define(m.properties)),
    cfg:        () => import("@codemirror/legacy-modes/mode/properties").then(m => StreamLanguage.define(m.properties)),
    bash:       () => import("@codemirror/legacy-modes/mode/shell").then(m => StreamLanguage.define(m.shell)),
    sh:         () => import("@codemirror/legacy-modes/mode/shell").then(m => StreamLanguage.define(m.shell)),
};

/**
 * Load a language by ID. Returns cached instance on subsequent calls.
 * @param {string} langId - Language identifier (e.g. "js", "py", "rs")
 * @returns {Promise<import("@codemirror/language").LanguageSupport | StreamLanguage | null>}
 */
export async function loadLanguage(langId) {
    if (!langId) return null;

    const key = langId.toLowerCase();
    if (cache.has(key)) return cache.get(key);

    const loader = LOADERS[key];
    if (!loader) return null;

    const lang = await loader();
    cache.set(key, lang);
    return lang;
}
