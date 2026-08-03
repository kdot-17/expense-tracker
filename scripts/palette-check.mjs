#!/usr/bin/env node
/**
 * Dataviz palette validator.
 *
 * Every categorical palette in this project must pass all six checks before it
 * is allowed near a chart. Run it whenever you add or change a series colour:
 *
 *   node scripts/palette-check.mjs \
 *     --page  "#F5F3ED" --card "#FFFFFF" \
 *     --slots "#D62828,#F77F00,#3A86FF,#06A77D,#8338EC,#C29B0C" \
 *     --other "#6E6E6E" \
 *     --ink   "#111111" --ink2 "#3D3D3D" --muted "#6E6E6E"
 *
 * Or check both themes at once:  npm run palette
 *
 * Exits 0 only when every check passes.
 */

/* ----------------------------------------------------------- colour math */

const hex2rgb = (h) => {
  const s = h.trim().replace("#", "");
  const v = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
};
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const unlin = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function rgb2xyz([r, g, b]) {
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  return [
    0.4124564 * R + 0.3575761 * G + 0.1804375 * B,
    0.2126729 * R + 0.7151522 * G + 0.072175 * B,
    0.0193339 * R + 0.119192 * G + 0.9503041 * B,
  ];
}

const WHITE = [0.95047, 1.0, 1.08883];
function xyz2lab([x, y, z]) {
  const f = (t) =>
    t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t) / 116 + 16 / 116;
  const [fx, fy, fz] = [f(x / WHITE[0]), f(y / WHITE[1]), f(z / WHITE[2])];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const hex2lab = (h) => xyz2lab(rgb2xyz(hex2rgb(h)));

/** OKLab / OKLCh — the perceptual lightness band and the chroma floor. */
function hex2oklch(h) {
  const [r, g, b] = hex2rgb(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B) };
}

/** CIEDE2000. */
function deltaE00(lab1, lab2) {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1;
  const ap2 = (1 + G) * a2;
  const Cp1 = Math.hypot(ap1, b1);
  const Cp2 = Math.hypot(ap2, b2);
  const hp = (b, ap) => {
    if (b === 0 && ap === 0) return 0;
    const d = (Math.atan2(b, ap) * 180) / Math.PI;
    return d >= 0 ? d : d + 360;
  };
  const hp1 = hp(b1, ap1);
  const hp2 = hp(b2, ap2);
  const dLp = L2 - L1;
  const dCp = Cp2 - Cp1;
  let dhp = 0;
  if (Cp1 * Cp2 !== 0) {
    dhp = hp2 - hp1;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dhp * rad) / 2);
  const Lbp = (L1 + L2) / 2;
  const Cbp = (Cp1 + Cp2) / 2;
  let hbp = hp1 + hp2;
  if (Cp1 * Cp2 !== 0) {
    if (Math.abs(hp1 - hp2) > 180) hbp += hp1 + hp2 < 360 ? 360 : -360;
    hbp /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * rad) +
    0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) -
    0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTh = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTh * rad) * Rc;
  return Math.sqrt(
    (dLp / Sl) ** 2 +
      (dCp / Sc) ** 2 +
      (dHp / Sh) ** 2 +
      Rt * (dCp / Sc) * (dHp / Sh),
  );
}

/** Machado, Oliveira & Fernandes (2009), severity 1.0, on linear RGB. */
const CVD = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function simulate(hex, kind) {
  const [r, g, b] = hex2rgb(hex).map(lin);
  const M = CVD[kind];
  const out = M.map((row) => clamp01(row[0] * r + row[1] * g + row[2] * b));
  return xyz2lab(rgb2xyz(out.map(unlin)));
}

const relLum = (hex) => {
  const [r, g, b] = hex2rgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* ------------------------------------------------------------------ args */

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
}

/* --------------------------------------------------------------- --all ---
   Reads both themes straight out of the source files, checks each one, and
   cross-checks that globals.css and palette.ts still agree. The two files
   necessarily duplicate every hex — CSS cannot import TypeScript and Chart.js
   cannot read a CSS variable — so this is what stops them drifting apart. */

if (process.argv.includes("--all")) {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const ts = readFileSync(new URL("../src/lib/palette.ts", import.meta.url), "utf8");

  // The dark block under :root[data-theme="dark"] and the light block under :root
  const block = (selector) => {
    const at = css.indexOf(selector);
    if (at === -1) return "";
    return css.slice(at, css.indexOf("\n}", at));
  };
  const varsOf = (text) => {
    const out = {};
    for (const [, k, v] of text.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
      out[k] = v.toUpperCase();
    }
    return out;
  };
  const cssLight = varsOf(block(":root {"));
  const cssDark = varsOf(block(':root[data-theme="dark"]'));
  // globals.css declares the dark values TWICE — once for the explicit choice
  // and once inside the prefers-color-scheme block. Checking only the first
  // would let the media copy rot silently, which is the copy most readers hit.
  const cssDarkMedia = varsOf(block(":root:not([data-theme=\"light\"])"));

  // The two exported Palette literals
  const tsBlock = (name) => {
    const at = ts.indexOf(`export const ${name}: Palette = {`);
    return at === -1 ? "" : ts.slice(at, ts.indexOf("\n};", at));
  };
  const tsSet = (name) => {
    const text = tsBlock(name);
    const groups = [...text.matchAll(/"(#[0-9a-fA-F]{6})", \/\/ \d/g)].map((m) =>
      m[1].toUpperCase(),
    );
    const scalar = (key) => {
      const m = text.match(new RegExp(`${key}: "(#[0-9a-fA-F]{6})"`));
      return m ? m[1].toUpperCase() : null;
    };
    const list = (key) => {
      const m = text.match(new RegExp(`${key}: \\[([^\\]]+)\\]`, "s"));
      return m
        ? [...m[1].matchAll(/#[0-9a-fA-F]{6}/g)].map((x) => x[0].toUpperCase())
        : [];
    };
    return { groups, scalar, ramp: list("ramp") };
  };

  const mismatches = [];
  const compare = (theme, cssVars, name) => {
    // A selector that matches nothing yields {} and would pass every assertion
    // below — a vacuous green. Fail loudly instead.
    if (Object.keys(cssVars).length === 0) {
      mismatches.push(`${theme}: parsed no tokens from globals.css — selector changed?`);
      return;
    }
    const t = tsSet(name);
    t.groups.forEach((hex, i) => {
      if (cssVars[`slot-${i}`] !== hex) {
        mismatches.push(
          `${theme} slot-${i}: globals.css ${cssVars[`slot-${i}`]} vs palette.ts ${hex}`,
        );
      }
    });
    t.ramp.forEach((hex, i) => {
      if (cssVars[`ramp-${i}`] !== hex) {
        mismatches.push(
          `${theme} ramp-${i}: globals.css ${cssVars[`ramp-${i}`]} vs palette.ts ${hex}`,
        );
      }
    });
    for (const [cssKey, tsKey] of [
      ["page", "page"],
      ["card", "card"],
      ["ink", "ink"],
      ["muted", "muted"],
      ["grid", "grid"],
      ["rule", "rule"],
    ]) {
      const a = cssVars[cssKey];
      const b = t.scalar(tsKey);
      if (a && b && a !== b) {
        mismatches.push(`${theme} ${cssKey}: globals.css ${a} vs palette.ts ${b}`);
      }
    }
  };
  compare("light", cssLight, "LIGHT");
  compare("dark", cssDark, "DARK");
  compare("dark(@media)", cssDarkMedia, "DARK");

  const run = (vars) =>
    spawnCheck({
      page: vars.page,
      card: vars.card,
      slots: [0, 1, 2, 3, 4, 5].map((i) => vars[`slot-${i}`]),
      other: vars["slot-6"],
      ink: vars.ink,
      ink2: vars["ink-2"],
      muted: vars.muted,
    });

  const { execFileSync } = await import("node:child_process");
  function spawnCheck(cfg) {
    try {
      const out = execFileSync(
        process.execPath,
        [
          new URL(import.meta.url).pathname,
          "--page", cfg.page, "--card", cfg.card,
          "--slots", cfg.slots.join(","), "--other", cfg.other,
          "--ink", cfg.ink, "--ink2", cfg.ink2, "--muted", cfg.muted,
        ],
        { encoding: "utf8" },
      );
      return { ok: true, out };
    } catch (e) {
      return { ok: false, out: e.stdout || String(e) };
    }
  }

  console.log("──────── LIGHT ────────");
  const l = run(cssLight);
  console.log(l.out);
  console.log("──────── DARK ─────────");
  const d = run(cssDark);
  console.log(d.out);

  console.log("──────── globals.css ↔ palette.ts ────────");
  if (mismatches.length) {
    console.log("  DRIFT:\n" + mismatches.map((m) => `    ${m}`).join("\n") + "\n");
  } else {
    console.log("  PASS  the two files declare identical values\n");
  }

  process.exit(l.ok && d.ok && mismatches.length === 0 ? 0 : 1);
}
const need = (k) => {
  if (!args[k]) {
    console.error(`missing --${k}`);
    process.exit(2);
  }
  return args[k];
};

const page = need("page");
const card = args.card || page;
const slots = need("slots").split(",").map((s) => s.trim()).filter(Boolean);
const other = args.other || null;
const ink = need("ink");
const ink2 = args.ink2 || ink;
const muted = args.muted || ink2;

const DARK_SURFACE = relLum(page) < 0.18;
const ALL = other ? [...slots, other] : slots;

/* ---------------------------------------------------------------- checks */

const results = [];
const add = (name, ok, detail) => results.push({ name, ok, detail });

// 1 — no slot may dominate by sheer brightness
{
  const Ls = slots.map((s) => hex2oklch(s).L);
  const lo = Math.min(...Ls);
  const hi = Math.max(...Ls);
  const [absLo, absHi] = DARK_SURFACE ? [0.55, 0.86] : [0.42, 0.74];
  const spread = hi - lo;
  const ok = spread <= 0.22 && lo >= absLo && hi <= absHi;
  add(
    "1 LIGHTNESS BAND",
    ok,
    `OKLab L ${lo.toFixed(3)}–${hi.toFixed(3)} (spread ${spread.toFixed(3)} ≤ 0.220), ` +
      `band for a ${DARK_SURFACE ? "dark" : "light"} surface is ${absLo}–${absHi}` +
      (ok
        ? ""
        : `  ← ${
            slots
              .map((s, i) => [s, Ls[i]])
              .filter(([, L]) => L < absLo || L > absHi)
              .map(([s, L]) => `${s} L=${L.toFixed(3)}`)
              .join(", ") || "spread too wide"
          }`),
  );
}

// 2 — slots must read as hues; Other must read as not-a-hue
{
  const Cs = slots.map((s) => hex2oklch(s).C);
  const minC = Math.min(...Cs);
  let ok = minC >= 0.075;
  let detail = `min slot chroma ${minC.toFixed(3)} ≥ 0.075`;
  if (!ok) {
    detail += `  ← ${slots
      .map((s, i) => [s, Cs[i]])
      .filter(([, c]) => c < 0.075)
      .map(([s, c]) => `${s} C=${c.toFixed(3)}`)
      .join(", ")}`;
  }
  if (other) {
    const oc = hex2oklch(other).C;
    const otherOk = oc <= 0.035 && minC - oc >= 0.04;
    ok = ok && otherOk;
    detail += ` · other ${other} C=${oc.toFixed(3)} ≤ 0.035${
      otherOk ? "" : "  ← too colourful to read as “not a category”"
    }`;
  }
  add("2 CHROMA FLOOR", ok, detail);
}

// 3 — CVD.
//
// Six distinct hues cannot all be pairwise separable under full dichromacy —
// green and red-orange ARE the same colour to a deuteranope, and no amount of
// stepping fixes that. So the bar is split:
//
//   3a ADJACENT — pairs that touch in the frozen slot order (neighbouring pie
//      arcs, neighbouring legend rows, neighbouring bars) must clear ΔE 12 for
//      every dichromacy. These are the collisions a reader hits without moving
//      their eyes.
//   3b GLOBAL — no pair may be indistinguishable to *everyone*: each pair must
//      clear ΔE 9 under at least one of the three. Every series is also
//      directly labelled, so colour is never the only channel.
{
  const kinds = Object.keys(CVD);
  const labs = Object.fromEntries(
    kinds.map((k) => [k, ALL.map((h) => simulate(h, k))]),
  );

  const adjRows = [];
  let adjOk = true;
  for (const kind of kinds) {
    let worst = Infinity;
    let pair = "";
    for (let i = 0; i + 1 < ALL.length; i += 1) {
      const d = deltaE00(labs[kind][i], labs[kind][i + 1]);
      if (d < worst) {
        worst = d;
        pair = `${ALL[i]}/${ALL[i + 1]}`;
      }
    }
    const kindOk = worst >= 12;
    adjOk = adjOk && kindOk;
    adjRows.push(
      `${kind.padEnd(13)} worst adjacent ΔE ${worst.toFixed(1)} (${pair}) ≥ 12${
        kindOk ? "" : "   ← FAIL"
      }`,
    );
  }
  add("3a CVD — ADJACENT SLOTS", adjOk, adjRows.join("\n      "));

  let globalOk = true;
  let worstBest = Infinity;
  let worstBestPair = "";
  const collisions = [];
  for (let i = 0; i < ALL.length; i += 1) {
    for (let j = i + 1; j < ALL.length; j += 1) {
      const best = Math.max(...kinds.map((k) => deltaE00(labs[k][i], labs[k][j])));
      if (best < worstBest) {
        worstBest = best;
        worstBestPair = `${ALL[i]}/${ALL[j]}`;
      }
      if (best < 9) {
        globalOk = false;
        collisions.push(`${ALL[i]}/${ALL[j]} best ΔE ${best.toFixed(1)}`);
      }
    }
  }
  add(
    "3b CVD — NO UNIVERSAL COLLISION",
    globalOk,
    `hardest pair ${worstBestPair} separates by ΔE ${worstBest.toFixed(
      1,
    )} for its best-case dichromacy (≥ 9)` +
      (collisions.length ? `  ← ${collisions.join("; ")}` : ""),
  );
}

// 4 — normal vision floor
{
  const labs = ALL.map(hex2lab);
  let worst = Infinity;
  let pair = "";
  for (let i = 0; i < labs.length; i += 1) {
    for (let j = i + 1; j < labs.length; j += 1) {
      const d = deltaE00(labs[i], labs[j]);
      if (d < worst) {
        worst = d;
        pair = `${ALL[i]}/${ALL[j]}`;
      }
    }
  }
  add("4 NORMAL-VISION FLOOR", worst >= 15, `worst ΔE ${worst.toFixed(1)} (${pair}) ≥ 15`);
}

// 5 — every series colour ≥ 3:1 on both surfaces
{
  const bad = ALL.filter((h) => contrast(h, page) < 3 || contrast(h, card) < 3).map(
    (h) => `${h} page ${contrast(h, page).toFixed(2)} card ${contrast(h, card).toFixed(2)}`,
  );
  const worstP = Math.min(...ALL.map((h) => contrast(h, page)));
  const worstC = Math.min(...ALL.map((h) => contrast(h, card)));
  add(
    "5 SURFACE CONTRAST",
    bad.length === 0,
    `worst vs page ${worstP.toFixed(2)}:1, vs card ${worstC.toFixed(2)}:1, both ≥ 3:1` +
      (bad.length ? `  ← ${bad.join("; ")}` : ""),
  );
}

// 6 — the ink ramp
{
  const checks = [
    ["ink", ink, 7],
    ["ink2", ink2, 4.5],
    ["muted", muted, 3],
  ];
  const bad = [];
  const rows = checks.map(([name, hexv, floor]) => {
    const cp = contrast(hexv, page);
    const cc = contrast(hexv, card);
    if (Math.min(cp, cc) < floor) bad.push(name);
    return `${name} ${hexv} page ${cp.toFixed(2)} card ${cc.toFixed(2)} (≥ ${floor})`;
  });
  add("6 INK CONTRAST", bad.length === 0, rows.join(" · "));
}

/* ---------------------------------------------------------------- report */

console.log(`\n  surface: ${page} / ${card}  (${DARK_SURFACE ? "dark" : "light"})`);
console.log(`  slots:   ${slots.join(" ")}${other ? `  other ${other}` : ""}\n`);
for (const r of results) {
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}\n      ${r.detail}`);
}
const allOk = results.every((r) => r.ok);
console.log(
  `\n  ${allOk ? "ALL CHECKS PASS" : "PALETTE REJECTED — fix the FAIL rows above"}\n`,
);
process.exit(allOk ? 0 : 1);
