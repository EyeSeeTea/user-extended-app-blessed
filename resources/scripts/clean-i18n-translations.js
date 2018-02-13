#!/bin/env node

/***
  Clean the i18n_module_XX.properties files. Tasks performed:

    - Decode unicode-escaped strings (\uxxyy).
    - Keep only i18n keys specified (one key per line).

  To get the keys used by the app, you can either parse the source code or
  paste this somewhere d2 is already initialized:

    window.i18Keys = new Set();
    const gt = d2.i18n.getTranslation.bind(d2.i18n);
    d2.i18n.getTranslation = (key, ...args) => {
      if (!window.i18Keys.has(key)) {
        window.i18Keys.add(key)
        console.log("New key: " + key)
      }
      return gt(key, ...args);
    };

  Use the app to save keys and finally get them, one per line:

    console.log(_(Array.from(window.i18Keys)).sort().uniq().join("\n"));
***/

const fs = require('fs');
const path = require('path');
const unicodeUnescape = require('unescape-js');
const _ = require('lodash');

function die(msg) {
  throw new Error(msg);
}

function getTranslations(contents) {
  return _(contents.split("\n"))
    .map(line => [line.split("=")[0].trim(), line.split("=").slice(1).join("=").trim()])
    .fromPairs()
    .value();
}

function buildTranslationFromKeys(contents, keys, referenceTranslations) {
  const translations = getTranslations(contents);
  const foundKeysCount = _(keys).filter(key => translations[key]).size();
  console.debug(`  Keys found: ${foundKeysCount} of ${keys.length}`);
  return _(keys)
    .map(key => key + "=" + (translations[key] || referenceTranslations[key]))
    .join("\n");
}

function cleanI18nFiles(i18nDirectory, keysToPreserve, {referenceLocale = "en"}) {
  const propertyFiles = fs.readdirSync(i18nDirectory)
    .filter(fn => fn.endsWith(".properties"))
    .map(fn => path.join(i18nDirectory, fn));
  const referenceTranslationsPath = propertyFiles.find(fn => _.includes(fn, `module_${referenceLocale}`)) ||
    die(`No reference properties found: ${referenceLocale}`);
  const referenceTranslations = getTranslations(fs.readFileSync(referenceTranslationsPath, "utf-8"));

  propertyFiles.forEach(i18nPath => {
    console.debug(`Process: ${i18nPath}`);
    const contents = fs.readFileSync(i18nPath, "utf-8");
    const keys = keysToPreserve || _.keys(referenceTranslations);
    const newContents = buildTranslationFromKeys(contents, keys, referenceTranslations);
    fs.writeFileSync(i18nPath, unicodeUnescape(newContents), "utf-8");
  });
}

function main(args) {
  if (args.length < 1) {
    const scriptname = path.basename(__filename);
    console.error(`Usage: ${scriptname} I18N_DIRECTORY [FILE_WITH_KEYS_TO_PRESERVE]`)
    process.exit(1);
  } else {
    const [i18nDirectory, keysToPreservePath] = args;
    const keysToPreserve = keysToPreservePath ?
      _.compact(fs.readFileSync(keysToPreservePath, "utf-8").split("\n")) : null;
    cleanI18nFiles(i18nDirectory, keysToPreserve, {});
  }
}

main(process.argv.slice(2));