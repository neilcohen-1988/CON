import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { configureContent, setLanguage, localizeProject, t, direction } from '../public/i18n.mjs';

const read = async path => JSON.parse(await readFile(new URL(`../public/data/${path}.json`, import.meta.url), 'utf8'));
const content = await read('locales');
configureContent(content);
const metadata = [...await read('index'), ...await read('projects')];
const projects = await Promise.all(metadata.map(item => read(`${item.editorial ? 'projects/' : ''}${item.id}`)));
const textBlocks = item => [
  ...item.productDescription.blocks,
  ...item.projectContent.flatMap(section => section.blocks || [])
].filter(block => block.text || block.html);
const hrefs = html => [...new Set([...String(html || '').matchAll(/href=["']([^"']+)["']/g)]
  .map(match => match[1].replaceAll('&amp;', '&')))].sort();

test('every project has localized Hebrew copy and retains its original media and source links', () => {
  setLanguage('he');
  assert.equal(direction(), 'rtl');
  for (const original of projects) {
    const before = JSON.stringify(original);
    const localized = localizeProject(original);
    assert.match(localized.displayTitle, /[\u0590-\u05ff]/, original.id);
    assert.match(localized.objectType, /[\u0590-\u05ff]/, original.id);
    assert.equal(localized.productImages, original.productImages);
    assert.equal(localized.additionalPageImages, original.additionalPageImages);
    textBlocks(localized).forEach((block, index) => {
      assert.match(block.text, /[\u0590-\u05ff]/, `${original.id}: ${block.text}`);
      assert.deepEqual(hrefs(block.html), hrefs(textBlocks(original)[index].html), `${original.id}: links ${index}`);
    });
    assert.equal(JSON.stringify(original), before);
  }
});

test('English mode has English project titles and Dudu Geva descriptions and credits', () => {
  setLanguage('en');
  assert.equal(direction(), 'ltr');
  assert.equal(t('projects'), 'PROJECTS');
  for (const original of projects) {
    assert.doesNotMatch(localizeProject(original).displayTitle, /[\u0590-\u05ff]/);
  }
  const dudu = localizeProject(projects.find(item => item.id === 'dudu-geva-was-here'));
  for (const block of textBlocks(dudu)) assert.doesNotMatch(block.text, /[\u0590-\u05ff]/);
  assert.match(dudu.website.label, /website/);
  assert.equal(localizeProject(projects.find(item => item.id === 'dressed-to-protest')).website, undefined);
});

test('switching languages repeatedly does not lose original copy or media', () => {
  const original = projects.find(item => item.id === 'dan-reisinger-letters');
  setLanguage('he');
  assert.equal(localizeProject(original).website.label, 'לאתר אותיות ריזינגר');
  setLanguage('en');
  const english = localizeProject(original);
  assert.deepEqual(english.productDescription, original.productDescription);
  assert.deepEqual(english.projectContent, original.projectContent);
  assert.equal(english.website.href, original.website.href);
  assert.equal(t('photoAlt', { title: english.displayTitle, number: 2 }), 'Dan Reisinger Letters — photograph 2');
});
