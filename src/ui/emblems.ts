const svg = (body: string): string =>
  `<svg class="tab-emblem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" aria-hidden="true" focusable="false">${body}</svg>`;

export const EMBLEM_SCROLL = svg('<path d="M6 4.5h10a2 2 0 0 1 2 2V20H8a2 2 0 0 1-2-2V4.5Zm0 0A2.5 2.5 0 0 0 3.5 7V18A2 2 0 0 0 5.5 20H8"/><path d="M9 8h6M9 12h6M9 16h4"/>');
export const EMBLEM_SPADE = svg('<path d="m12 3 2.2 5.1 4.8 1.8-4.8 1.8L12 17l-2.2-5.3L5 9.9l4.8-1.8L12 3Z"/><path d="M12 17v4M9 21h6"/>');
export const EMBLEM_GEAR = svg('<path d="m12 3 1.5 1.8 2.4-.2.8 2.3 2.2 1 .1 2.4 2 1.5-2 1.5-.1 2.4-2.2 1-.8 2.3-2.4-.2L12 21l-1.5-1.8-2.4.2-.8-2.3-2.2-1-.1-2.4-2-1.5 2-1.5.1-2.4 2.2-1 .8-2.3 2.4.2L12 3Z"/><circle cx="12" cy="12" r="3"/>');
export const EMBLEM_ALEMBIC = svg('<path d="M9 3h6M10 3v5L5 18a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 18l-5-10V3"/><path d="M7.5 16h9"/>');
export const EMBLEM_STONE = svg('<path d="m5 19 1-9 6-5 6 4 1 10-5 2H9l-4-2Z"/><path d="m8 12 3-2 4 1 1 4-3 2-4-1-1-4Z"/>');
export const EMBLEM_STAR = svg('<path d="m12 3 2.1 5.8L20 11l-5.9 2.1L12 19l-2.1-5.9L4 11l5.9-2.2L12 3Z"/><path d="M12 19v2"/>');
export const EMBLEM_SLIDERS = svg('<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>');
export const EMBLEM_SPEAKER_OFF = svg('<path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="m17 9 4 6m0-6-4 6"/>');
export const EMBLEM_SPEAKER_ON = svg('<path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M17 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>');
