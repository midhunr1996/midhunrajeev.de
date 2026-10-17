import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftMailto } from '../site/js/contact.js';

test('draft mailto addresses the email with a generic subject when no role is chosen', () => {
  const href = draftMailto('a@b.de', null);
  assert.ok(href.startsWith('mailto:a@b.de?subject='));
  assert.ok(decodeURIComponent(href).includes('subject=Enquiry via midhunrajeev.de'));
});

test('draft mailto puts the role subject in the subject line', () => {
  const href = draftMailto('a@b.de', { subject: 'Embedded firmware role', label: 'Embedded firmware' });
  assert.ok(decodeURIComponent(href).includes('subject=Embedded firmware role via midhunrajeev.de'));
});

test('draft mailto is a single encoded line with a body', () => {
  const href = draftMailto('a@b.de', null);
  assert.equal(href.includes('\n'), false);
  assert.ok(href.includes('&body=Hi%20Midhun'));
});
