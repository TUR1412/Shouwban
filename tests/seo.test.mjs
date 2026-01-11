import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSeo } from '../scripts/modules/seo.js';

describe('SEO', () => {
  it('canonicalizeHref strips hash and preserves query', () => {
    const seo = createSeo();
    const out = seo.canonicalizeHref(
      'https://example.test/product-detail.html?id=P001#top',
    );
    assert.equal(out, 'https://example.test/product-detail.html?id=P001');
  });

  it('canonicalizeHref rejects non-http(s) protocols', () => {
    const seo = createSeo();
    assert.equal(seo.canonicalizeHref('file:///C:/index.html#x'), '');
    assert.equal(seo.canonicalizeHref('about:blank'), '');
  });

  it('ensureCanonical upserts link[rel=canonical]', () => {
    const appended = [];
    const head = {
      querySelector: () => null,
      appendChild: (el) => appended.push(el),
    };
    const doc = {
      head,
      createElement: () => {
        const attrs = {};
        return {
          attrs,
          setAttribute: (k, v) => {
            attrs[String(k)] = String(v);
          },
        };
      },
    };

    const seo = createSeo({
      getHref: () => 'https://example.test/product-detail.html?id=P001#top',
      getDocument: () => doc,
    });

    const ok = seo.ensureCanonical();
    assert.equal(ok, true);
    assert.equal(appended.length, 1);
    assert.equal(appended[0].attrs.rel, 'canonical');
    assert.equal(
      appended[0].attrs.href,
      'https://example.test/product-detail.html?id=P001',
    );
  });

  it('ensureCanonical updates existing link element', () => {
    const attrs = { rel: 'canonical', href: 'https://example.test/old' };
    const link = {
      setAttribute: (k, v) => {
        attrs[String(k)] = String(v);
      },
    };
    const head = {
      querySelector: () => link,
      appendChild: () => assert.fail('should not append when link exists'),
    };
    const doc = { head, createElement: () => assert.fail('should not create') };

    const seo = createSeo({
      getHref: () => 'https://example.test/index.html#hash',
      getDocument: () => doc,
    });

    const ok = seo.ensureCanonical();
    assert.equal(ok, true);
    assert.equal(attrs.href, 'https://example.test/index.html');
  });

  it('upsertWebSiteJsonLd emits WebSite + SearchAction JSON-LD', () => {        
    const appended = [];
    const head = {
      appendChild: (el) => appended.push(el),
    };
    const doc = {
      head,
      getElementById: () => null,
      createElement: () => ({}),
    };

    const seo = createSeo({
      getHref: () => 'https://example.test/products.html#top',
      getDocument: () => doc,
    });

    const ok = seo.upsertWebSiteJsonLd({ name: 'Shouwban' });
    assert.equal(ok, true);
    assert.equal(appended.length, 1);
    assert.equal(appended[0].id, 'website-jsonld');
    assert.equal(appended[0].type, 'application/ld+json');

    const json = JSON.parse(appended[0].textContent);
    assert.equal(json['@type'], 'WebSite');
    assert.equal(json.name, 'Shouwban');
    assert.equal(json.url, 'https://example.test/index.html');
    assert.equal(json.potentialAction['@type'], 'SearchAction');
    assert.equal(
      json.potentialAction.target,
      'https://example.test/products.html?query={search_term_string}',
    );
    assert.equal(
      json.potentialAction['query-input'],
      'required name=search_term_string',
    );
  });

  it('upsertOrganizationJsonLd emits Organization JSON-LD', () => {
    const appended = [];
    const head = {
      appendChild: (el) => appended.push(el),
    };
    const doc = {
      head,
      getElementById: () => null,
      createElement: () => ({}),
    };

    const seo = createSeo({
      getHref: () => 'https://example.test/products.html#top',
      getDocument: () => doc,
    });

    const ok = seo.upsertOrganizationJsonLd({
      name: 'Shouwban',
      logo: 'assets/favicon.svg',
    });
    assert.equal(ok, true);
    assert.equal(appended.length, 1);
    assert.equal(appended[0].id, 'organization-jsonld');
    assert.equal(appended[0].type, 'application/ld+json');

    const json = JSON.parse(appended[0].textContent);
    assert.equal(json['@type'], 'Organization');
    assert.equal(json.name, 'Shouwban');
    assert.equal(json.url, 'https://example.test/index.html');
    assert.equal(json.logo, 'https://example.test/assets/favicon.svg');
  });
});
