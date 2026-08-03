"use client";

/**
 * The board's view switcher, and the only client component the layout adds.
 *
 * Every panel is rendered on the server and handed in as a prop; this chooses
 * which one is on screen and nothing else. That split matters for the charts:
 * mounting a Chart.js canvas inside a `display: none` panel gives it a
 * zero-size parent and, with `maintainAspectRatio: false`, it never recovers —
 * so the inactive panels are genuinely unmounted rather than hidden with CSS.
 *
 * Tabs follow the ARIA pattern — arrow keys move between them, and the panel is
 * labelled by its tab — because a row of buttons that only responds to clicks
 * is a worse control than the scroll it replaced.
 */

import { useRef, useState } from "react";

const MICRO = "text-[10px] font-semibold uppercase tracking-[0.2em]";

export type TabDef = { id: string; label: string; panel: React.ReactNode };

export function TabShell({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (from: number, delta: number) => {
    const next = tabs[(from + delta + tabs.length) % tabs.length];
    setActive(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="tablist"
        aria-label="Dashboard views"
        className="border-rule flex shrink-0 flex-wrap border-b-2"
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                refs.current[tab.id] = node;
              }}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              // Only the active tab is in the tab order; arrows do the rest.
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => {
                // These four keys keep their native behaviour on a focused
                // button — Home and End scroll the nearest scroll container —
                // so switching tabs would also jump the view. The ARIA tabs
                // pattern calls for suppressing that.
                const handled: Record<string, () => void> = {
                  ArrowRight: () => move(i, 1),
                  ArrowLeft: () => move(i, -1),
                  Home: () => move(0, 0),
                  End: () => move(tabs.length - 1, 0),
                };
                const action = handled[event.key];
                if (!action) return;
                event.preventDefault();
                action();
              }}
              className={`${MICRO} border-rule -mb-0.5 border-2 border-b-0 px-4 py-2.5 focus-visible:relative focus-visible:z-10 ${
                selected ? "bg-rule text-page" : "text-ink-2 bg-transparent"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) =>
        tab.id === active ? (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            tabIndex={0}
            className="flex min-h-0 flex-1 flex-col pt-2.5 lg:pt-3"
          >
            {tab.panel}
          </div>
        ) : null,
      )}
    </div>
  );
}
