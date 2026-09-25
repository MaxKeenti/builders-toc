// adapter-static: every route (and each /es/ variant) is emitted as HTML at build time,
// so hooks.server.ts only runs during prerendering, never at request time.
export const prerender = true;

// Emit `es/index.html` rather than `es.html`, so `/es/` works on any static host without
// clean-URL rewrites.
export const trailingSlash = 'always';
