/* NanoFactory — assets/icons.js
 * SVG icon strings as JS constants. No emoji anywhere.
 */

const ICONS = {
  // Resources
  iron_ore: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" fill="none" stroke="#c87a4b" stroke-width="1.5"/>
    <polygon points="8,4 12,6 12,10 8,12 4,10 4,6" fill="#c87a4b" opacity="0.4"/>
  </svg>`,

  copper_ore: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" fill="none" stroke="#c8a84b" stroke-width="1.5"/>
    <polygon points="8,4 12,6 12,10 8,12 4,10 4,6" fill="#c8a84b" opacity="0.4"/>
  </svg>`,

  coal: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="12" height="10" rx="1" fill="#444" stroke="#666" stroke-width="1.5"/>
    <rect x="5" y="6" width="6" height="4" fill="#222"/>
  </svg>`,

  iron_plate: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="14" height="8" rx="1" fill="none" stroke="#c87a4b" stroke-width="1.5"/>
    <rect x="3" y="6" width="10" height="4" fill="#c87a4b" opacity="0.3"/>
  </svg>`,

  copper_wire: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M2,8 Q4,3 8,8 Q12,13 14,8" fill="none" stroke="#c8a84b" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  steel: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="3" width="14" height="4" rx="1" fill="none" stroke="#aaa" stroke-width="1.5"/>
    <rect x="1" y="9" width="14" height="4" rx="1" fill="none" stroke="#aaa" stroke-width="1.5"/>
    <rect x="3" y="5" width="10" height="2" fill="#888" opacity="0.4"/>
    <rect x="3" y="11" width="10" height="2" fill="#888" opacity="0.4"/>
  </svg>`,

  circuit_board: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="#4bc87a" stroke-width="1.5"/>
    <line x1="5" y1="2" x2="5" y2="14" stroke="#4bc87a" stroke-width="0.5" opacity="0.6"/>
    <line x1="8" y1="2" x2="8" y2="14" stroke="#4bc87a" stroke-width="0.5" opacity="0.6"/>
    <line x1="11" y1="2" x2="11" y2="14" stroke="#4bc87a" stroke-width="0.5" opacity="0.6"/>
    <line x1="2" y1="6" x2="14" y2="6" stroke="#4bc87a" stroke-width="0.5" opacity="0.6"/>
    <line x1="2" y1="10" x2="14" y2="10" stroke="#4bc87a" stroke-width="0.5" opacity="0.6"/>
    <rect x="6" y="5" width="4" height="6" fill="#4bc87a" opacity="0.4"/>
  </svg>`,

  battery: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="12" height="8" rx="1" fill="none" stroke="#4b8fc8" stroke-width="1.5"/>
    <rect x="13" y="6" width="2" height="4" rx="1" fill="#4b8fc8"/>
    <rect x="3" y="6" width="4" height="4" fill="#4b8fc8" opacity="0.5"/>
  </svg>`,

  energy_cell: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <polygon points="8,1 14,4 14,12 8,15 2,12 2,4" fill="none" stroke="#c8a84b" stroke-width="1.5"/>
    <polygon points="8,4 7,8 9,8 7,12 11,7 8.5,7 10,4" fill="#c8a84b" opacity="0.8"/>
  </svg>`,

  research_points: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" fill="none" stroke="#4bc87a" stroke-width="1.5"/>
    <text x="8" y="12" text-anchor="middle" fill="#4bc87a" font-size="8" font-family="monospace">RP</text>
  </svg>`,

  // Buildings
  iron_mine: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M3,13 L8,3 L13,13 Z" fill="none" stroke="#c87a4b" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="5" y1="13" x2="11" y2="13" stroke="#c87a4b" stroke-width="1.5"/>
    <line x1="8" y1="3" x2="8" y2="8" stroke="#c87a4b" stroke-width="1" opacity="0.5"/>
  </svg>`,

  copper_mine: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M3,13 L8,3 L13,13 Z" fill="none" stroke="#c8a84b" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="5" y1="13" x2="11" y2="13" stroke="#c8a84b" stroke-width="1.5"/>
    <line x1="8" y1="3" x2="8" y2="8" stroke="#c8a84b" stroke-width="1" opacity="0.5"/>
  </svg>`,

  coal_mine: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M3,13 L8,3 L13,13 Z" fill="none" stroke="#888" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="5" y1="13" x2="11" y2="13" stroke="#888" stroke-width="1.5"/>
  </svg>`,

  smelter: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="10" height="9" rx="1" fill="none" stroke="#c87a4b" stroke-width="1.5"/>
    <path d="M5,5 Q5,2 8,2 Q11,2 11,5" fill="none" stroke="#c87a4b" stroke-width="1.5"/>
    <rect x="6" y="7" width="4" height="5" fill="#c87a4b" opacity="0.3"/>
  </svg>`,

  wire_mill: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="12" height="8" rx="1" fill="none" stroke="#c8a84b" stroke-width="1.5"/>
    <circle cx="5" cy="8" r="2" fill="#c8a84b" opacity="0.4"/>
    <circle cx="11" cy="8" r="2" fill="#c8a84b" opacity="0.4"/>
    <line x1="7" y1="8" x2="9" y2="8" stroke="#c8a84b" stroke-width="1.5"/>
  </svg>`,

  forge: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="7" width="12" height="7" rx="1" fill="none" stroke="#aaa" stroke-width="1.5"/>
    <path d="M5,7 L6,2 L10,2 L11,7" fill="none" stroke="#aaa" stroke-width="1.5"/>
    <rect x="5" y="9" width="6" height="3" fill="#888" opacity="0.4"/>
  </svg>`,

  assembly_line: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="6" width="14" height="4" rx="1" fill="none" stroke="#4bc87a" stroke-width="1.5"/>
    <circle cx="4" cy="8" r="1.5" fill="#4bc87a" opacity="0.6"/>
    <circle cx="8" cy="8" r="1.5" fill="#4bc87a" opacity="0.6"/>
    <circle cx="12" cy="8" r="1.5" fill="#4bc87a" opacity="0.6"/>
    <line x1="1" y1="4" x2="15" y2="4" stroke="#2a2a2a" stroke-width="1"/>
    <line x1="1" y1="12" x2="15" y2="12" stroke="#2a2a2a" stroke-width="1"/>
  </svg>`,

  battery_plant: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="10" height="8" rx="1" fill="none" stroke="#4b8fc8" stroke-width="1.5"/>
    <rect x="12" y="6" width="2" height="4" rx="1" fill="#4b8fc8"/>
    <rect x="4" y="6" width="3" height="4" fill="#4b8fc8" opacity="0.4"/>
    <rect x="8" y="6" width="3" height="4" fill="#4b8fc8" opacity="0.4"/>
  </svg>`,

  cell_factory: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <polygon points="8,1 14,4 14,12 8,15 2,12 2,4" fill="none" stroke="#c8a84b" stroke-width="1.5"/>
    <line x1="8" y1="1" x2="8" y2="15" stroke="#c8a84b" stroke-width="0.5" opacity="0.4"/>
    <line x1="2" y1="4" x2="14" y2="12" stroke="#c8a84b" stroke-width="0.5" opacity="0.4"/>
    <line x1="2" y1="12" x2="14" y2="4" stroke="#c8a84b" stroke-width="0.5" opacity="0.4"/>
  </svg>`,

  lab: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M6,2 L6,8 L2,13 L14,13 L10,8 L10,2" fill="none" stroke="#4bc87a" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="5" y1="5" x2="11" y2="5" stroke="#4bc87a" stroke-width="1" opacity="0.5"/>
    <ellipse cx="8" cy="11" rx="3" ry="1.5" fill="#4bc87a" opacity="0.3"/>
  </svg>`,

  coal_generator: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="12" height="8" rx="1" fill="none" stroke="#4b8fc8" stroke-width="1.5"/>
    <rect x="6" y="2" width="4" height="4" rx="1" fill="none" stroke="#666" stroke-width="1.5"/>
    <circle cx="8" cy="10" r="2.5" fill="none" stroke="#4b8fc8" stroke-width="1.5"/>
    <circle cx="8" cy="10" r="1" fill="#4b8fc8" opacity="0.6"/>
  </svg>`,

  solar_panel: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="3" width="14" height="10" rx="1" fill="none" stroke="#4b8fc8" stroke-width="1.5"/>
    <line x1="5" y1="3" x2="5" y2="13" stroke="#4b8fc8" stroke-width="0.5" opacity="0.7"/>
    <line x1="9" y1="3" x2="9" y2="13" stroke="#4b8fc8" stroke-width="0.5" opacity="0.7"/>
    <line x1="13" y1="3" x2="13" y2="13" stroke="#4b8fc8" stroke-width="0.5" opacity="0.7"/>
    <line x1="1" y1="7" x2="15" y2="7" stroke="#4b8fc8" stroke-width="0.5" opacity="0.7"/>
    <line x1="1" y1="10" x2="15" y2="10" stroke="#4b8fc8" stroke-width="0.5" opacity="0.7"/>
  </svg>`,

  nuclear_reactor: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" fill="none" stroke="#c8a84b" stroke-width="1.5"/>
    <circle cx="8" cy="8" r="2" fill="#c8a84b" opacity="0.5"/>
    <line x1="8" y1="2" x2="8" y2="5" stroke="#c8a84b" stroke-width="1.5"/>
    <line x1="8" y1="11" x2="8" y2="14" stroke="#c8a84b" stroke-width="1.5"/>
    <line x1="2" y1="8" x2="5" y2="8" stroke="#c8a84b" stroke-width="1.5"/>
    <line x1="11" y1="8" x2="14" y2="8" stroke="#c8a84b" stroke-width="1.5"/>
  </svg>`,

  storage_depot: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="12" height="8" rx="1" fill="none" stroke="#888" stroke-width="1.5"/>
    <path d="M1,6 L8,2 L15,6" fill="none" stroke="#888" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="5" y1="10" x2="11" y2="10" stroke="#888" stroke-width="1" opacity="0.5"/>
    <line x1="8" y1="6" x2="8" y2="14" stroke="#888" stroke-width="0.5" opacity="0.5"/>
  </svg>`,

  // Generic fallback
  building: `<svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="10" height="10" fill="none" stroke="#666" stroke-width="1.5"/>
    <path d="M2,4 L8,1 L14,4" fill="none" stroke="#666" stroke-width="1.5"/>
  </svg>`,
};
