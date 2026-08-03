/**
 * The spending taxonomy — ten verticals and the subtypes beneath them.
 *
 * This mirrors `drizzle/0001_seed_taxonomy.sql`, which is the authority: the
 * database seeds these rows, and everything here exists so the UI can lay out
 * and colour the tree before a single expense has been recorded. Both levels
 * are editable in the app, so treat this as the seeded *starting point*, not a
 * closed set. See docs/database.md.
 *
 * Subtype names are only unique **within** a vertical — `Others` exists under
 * Food, Convenience and Transport, and the database enforces uniqueness per
 * vertical for exactly that reason. So a subtype is always carried as a
 * (vertical, name) pair, never as a bare string.
 */

/**
 * Display order, which is deliberately *not* the order the seed migration
 * inserts them in. `Other` moves to the end: it is the absence of a category
 * rather than a tenth one, and it takes the achromatic slot, which the palette
 * checks expect last. Every other position matches the seed.
 *
 * This order is frozen. It fixes which colour each vertical gets, and the whole
 * point of a frozen slot is that the same vertical is the same colour in every
 * month and in both themes.
 */
export const VERTICAL_ORDER = [
  "Food",
  "Convenience",
  "Subscriptions",
  "Transport",
  "Health",
  "Shopping",
  "Leisure",
  "People",
  "Loans",
  "Other",
] as const;

export type Vertical = (typeof VERTICAL_ORDER)[number];

/** The slot index a vertical paints in. Frozen with VERTICAL_ORDER. */
export function slotOf(vertical: Vertical): number {
  return VERTICAL_ORDER.indexOf(vertical);
}

/**
 * The seeded subtypes, in the order the seed file lists them. `Others` sorts
 * last within a vertical by hand rather than alphabetically — a catch-all at
 * the top of a picker is noise.
 */
export const SUBTYPES: Record<Vertical, readonly string[]> = {
  Food: [
    "Swiggy",
    "Zomato",
    "Zepto Café",
    "Bistro",
    "EatClub",
    "Swish",
    "Dining Out",
    "Others",
  ],
  Convenience: ["Blinkit", "Zepto", "Instamart", "Others"],
  Subscriptions: [
    "Electricity",
    "Gas",
    "Water",
    "Internet",
    "Mobile",
    "Streaming",
    "Music",
    "Apps & Cloud",
  ],
  Transport: ["Rapido", "Uber", "Metro", "Others"],
  Health: ["Doctor", "Medicines", "Diagnostics", "Insurance", "Fitness"],
  Shopping: ["Clothing", "Electronics", "Home & Kitchen", "Personal Care"],
  Leisure: ["Movies & Events", "Hobbies", "Books", "Games"],
  People: ["Gifts", "Festivals", "Family Support", "Donations"],
  Loans: [
    "Home Loan",
    "Vehicle Loan",
    "Personal Loan",
    "Education Loan",
    "Credit Card Dues",
  ],
  Other: ["Uncategorized"],
};

/** A subtype is only meaningful alongside its vertical. */
export type SubtypeRef = { vertical: Vertical; name: string };

/**
 * A stable identity for a subtype, safe to use as a React key or a Map key.
 * `Food/Others` and `Transport/Others` are different things and must not
 * collapse into one another.
 */
export function subtypeKey(ref: SubtypeRef): string {
  return `${ref.vertical}/${ref.name}`;
}

/** Every subtype in the tree, flattened, keeping vertical order. */
export const ALL_SUBTYPES: readonly SubtypeRef[] = VERTICAL_ORDER.flatMap(
  (vertical) => SUBTYPES[vertical].map((name) => ({ vertical, name })),
);

/** Subtype names used by more than one vertical — `Others`, today. */
const AMBIGUOUS: ReadonlySet<string> = new Set(
  ALL_SUBTYPES.map((ref) => ref.name).filter(
    (name, _, all) => all.filter((other) => other === name).length > 1,
  ),
);

/**
 * How a subtype is written when it appears away from its vertical — on the
 * top-subtypes axis, say, where rows from eight different verticals sit
 * together. Only names that genuinely collide are qualified, so the common
 * case stays short. Derived rather than hardcoded, so adding a second
 * `Insurance` later starts qualifying both without anyone remembering to.
 */
export function subtypeLabel(ref: SubtypeRef): string {
  return AMBIGUOUS.has(ref.name) ? `${ref.name} · ${ref.vertical}` : ref.name;
}
