import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// `public/web.config` is copied verbatim into the build and read by IIS on Azure App Service.
//
// IIS answers 404.3 for any file whose extension has no MIME mapping, even when the file is
// on disk. `.woff2` is not in its default list, so every Open Sans font 404'd on the deployed
// dev site while the JS and CSS that referenced them loaded fine. These tests pin the mappings
// the build actually needs, plus the framing headers (CSP frame-ancestors, no X-Frame-Options)
// that let Dynamics 365 embed the app.

const webConfig = readFileSync(new URL('../public/web.config', import.meta.url), 'utf8');

// The @fontsource/open-sans imports in packages/ui emit both formats.
const FONT_EXTENSIONS = ['.woff', '.woff2'] as const;

describe('web.config', () => {
  it.each(FONT_EXTENSIONS)('serves %s fonts with a font MIME type', (extension) => {
    expect(webConfig).toMatch(
      new RegExp(`<mimeMap\\s+fileExtension="\\${extension}"\\s+mimeType="font/`),
    );
  });

  it.each(FONT_EXTENSIONS)(
    'removes any inherited %s mapping before adding its own',
    (extension) => {
      // Some IIS versions already map `.woff`. Adding a duplicate is a 500.19 that takes down
      // the whole site, not just the fonts, so each mapping must be preceded by a <remove>.
      const remove = webConfig.indexOf(`<remove fileExtension="${extension}"`);
      const add = webConfig.indexOf(`<mimeMap fileExtension="${extension}"`);
      expect(remove).toBeGreaterThan(-1);
      expect(remove).toBeLessThan(add);
    },
  );

  it('keeps the SPA fallback that lets /embed and deep links resolve', () => {
    expect(webConfig).toContain('<action type="Rewrite" url="/index.html" />');
  });

  describe('/api virtual application (ADR-0017)', () => {
    // The Integration Layer runs as an IIS virtual application at /api under this site. The
    // fallback must not rewrite those requests to index.html, or the SPA shell answers an API
    // call. IIS resolves the virtual application first, but ADR-0017 § 1 adds the exclusion so
    // the two configs do not depend on an ordering guarantee neither documents.
    const apiExclusion = () => {
      const condition = webConfig.match(
        /<add\s+input="\{REQUEST_URI\}"\s+pattern="([^"]*)"\s+negate="true"\s*\/>/,
      );
      return new RegExp(condition?.[1] ?? '(?!)');
    };

    it('adds a negated REQUEST_URI condition to the SPA fallback rule', () => {
      const rule = webConfig.match(/<rule name="SPA fallback"[\s\S]*?<\/rule>/)?.[0] ?? '';
      expect(rule).toMatch(/<add\s+input="\{REQUEST_URI\}"[^>]*negate="true"/);
    });

    it.each(['/api', '/api/', '/api/health/live', '/api/crm/agents/me?x=1'])(
      'leaves %s to the virtual application',
      (path) => {
        expect(path).toMatch(apiExclusion());
      },
    );

    it.each(['/', '/embed', '/apiary', '/search/api'])('still falls back for %s', (path) => {
      expect(path).not.toMatch(apiExclusion());
    });
  });

  describe('frame embedding policy (VCX-10478)', () => {
    const CSP_ADD = /<add\s+name="Content-Security-Policy"\s+value="([^"]*)"/;
    const cspValue = () => webConfig.match(CSP_ADD)?.[1] ?? '';
    const directives = () =>
      cspValue()
        .split(';')
        .map((directive) => directive.trim())
        .filter(Boolean);

    // 'self' keeps the mock D365 shell at / (which frames /embed same-origin) working.
    const ALLOWED_ANCESTORS = [
      "'self'",
      'https://*.crm.dynamics.com',
      'https://*.powerapps.com',
    ] as const;

    it('sends a Content-Security-Policy header', () => {
      expect(webConfig).toMatch(CSP_ADD);
    });

    it.each(ALLOWED_ANCESTORS)('allows %s to frame the app', (origin) => {
      const [frameAncestors] = directives();
      expect(frameAncestors?.split(/\s+/)).toEqual(
        expect.arrayContaining(['frame-ancestors', origin]),
      );
    });

    it('restricts only framing, so no other directive can break the bundle', () => {
      // A default-src/script-src here would also govern the Vite bundle, MSW and fonts;
      // tightening those is a separate hardening decision, not part of embedding.
      expect(directives().map((directive) => directive.split(/\s+/)[0])).toEqual([
        'frame-ancestors',
      ]);
    });

    it('never allows any origin to frame the app', () => {
      const sources = directives()[0]?.split(/\s+/).slice(1) ?? [];
      expect(sources).not.toEqual(expect.arrayContaining(['*']));
      expect(sources).not.toEqual(expect.arrayContaining(['https:']));
      expect(sources).not.toEqual(expect.arrayContaining(['http:']));
    });

    it('removes any inherited CSP before adding its own', () => {
      // Same 500.19 risk as the font mappings: a duplicate inherited header fails the site.
      const remove = webConfig.indexOf('<remove name="Content-Security-Policy"');
      const add = webConfig.search(CSP_ADD);
      expect(remove).toBeGreaterThan(-1);
      expect(remove).toBeLessThan(add);
    });

    // Browsers apply X-Frame-Options alongside CSP, so an inherited DENY/SAMEORIGIN would still
    // block D365 even with frame-ancestors set. ALLOW-FROM is ignored by modern browsers, so
    // the header is stripped rather than rewritten.
    it('strips any inherited X-Frame-Options header', () => {
      expect(webConfig).toMatch(/<remove\s+name="X-Frame-Options"\s*\/>/);
    });

    it('never sets X-Frame-Options itself', () => {
      expect(webConfig).not.toMatch(/<add\s+name="X-Frame-Options"/);
    });
  });

  // VCX-10480: the launch URL carries CRM record ids (contact, opportunity, agent). Without a
  // policy a browser may send the full URL, query and all, as the Referer to other origins (a
  // font CDN, an analytics call). strict-origin-when-cross-origin sends only the origin
  // cross-site, and nothing at all on a downgrade to http.
  describe('referrer policy (VCX-10480)', () => {
    it('keeps launch ids out of the Referer sent to other origins', () => {
      expect(webConfig).toMatch(
        /<add\s+name="Referrer-Policy"\s+value="strict-origin-when-cross-origin"\s*\/>/,
      );
    });

    it('removes any inherited Referrer-Policy before adding its own', () => {
      const remove = webConfig.indexOf('<remove name="Referrer-Policy"');
      const add = webConfig.indexOf('<add name="Referrer-Policy"');
      expect(remove).toBeGreaterThan(-1);
      expect(remove).toBeLessThan(add);
    });
  });
});
