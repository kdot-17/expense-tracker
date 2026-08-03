/**
 * Chart.js v4 is tree-shakeable. react-chartjs-2 registers the *controllers*
 * itself, but elements, scales and plugins are on us. A missing element or
 * scale throws at render; a missing plugin fails silently — forget Filler and
 * `fill` just quietly does nothing.
 *
 * Side-effect import, module scope. Safe under Fast Refresh because the
 * registry is keyed by id, so re-registering overwrites rather than duplicates.
 */
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

Chart.register(
  ArcElement, // doughnut
  LineElement, // line
  PointElement, // line
  BarElement, // bar
  CategoryScale, // x on line + bar
  LinearScale, // y on line + bar
  Filler, // the area wash under the line
  Tooltip,
  Legend,
);

export { Chart };
