import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const card = readFileSync(fileURLToPath(new URL('../site/assets/Midhun-Rajeev.vcf', import.meta.url)), 'utf8');
const lines = card.split(/\r?\n/).filter(Boolean);

test('the vCard is a complete version 3.0 card with CRLF line endings', () => {
  assert.equal(lines[0], 'BEGIN:VCARD');
  assert.equal(lines[1], 'VERSION:3.0');
  assert.equal(lines[lines.length - 1], 'END:VCARD');
  assert.ok(card.includes('\r\n'), 'vCard lines end with CRLF');
});

test('the vCard carries the public contact details', () => {
  assert.ok(lines.includes('FN:Midhun Rajeev'));
  assert.ok(lines.includes('N:Rajeev;Midhun;;;'));
  assert.ok(lines.some((line) => /^EMAIL[;:].*midhunr2013@gmail\.com$/.test(line)));
  assert.ok(lines.some((line) => /^URL[;:].*https:\/\/midhunrajeev\.de\/?$/.test(line)));
  assert.ok(lines.some((line) => line.includes('linkedin.com/in/midhun-rajeev1060')));
  assert.ok(lines.some((line) => line.includes('github.com/midhunr1996')));
});

test('the vCard never carries a phone number, street address or birthday', () => {
  assert.equal(lines.some((line) => line.startsWith('TEL')), false);
  assert.equal(lines.some((line) => line.startsWith('BDAY')), false);
  const address = lines.find((line) => line.startsWith('ADR'));
  if (address) {
    const [, , street] = address.split(':')[1].split(';');
    assert.equal(street, '', 'ADR street field is empty');
  }
});
