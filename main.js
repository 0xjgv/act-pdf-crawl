const fs = require('fs');
const path = require('path');
const Apify = require('apify');
const { promisify } = require('util');
const pdf2Table = require('pdf2table');
const requestPromise = require('request-promise');

const { log } = console;

try {
  const webpack = require('webpack');
} catch (err) {
  log('Local development.');
}

const removeEmpty = (array) =>
  array.reduce((acc, cur) => {
    if (Array.isArray(cur)) {
      const deep = removeEmpty(cur);
      if (deep.length) {
        acc.push(deep);
      }
    } else if (!/^\s*$/.test(cur)) {
      acc.push(cur.trim());
    }
    return acc;
  }, []);

const parseRows = (headers, rows) =>
  rows.map((row) =>
    headers.reduce((obj, header, i) => {
      let current = row[i] || row[i + 1] || '\n';
      if (current.includes('\n')) {
        current = current.split('\n');
      } else {
        current = [].concat(current);
      }
      const output = removeEmpty(current);
      return Object.assign(obj, { [header]: output });
    }, {})
  );

Apify.main(async () => {
  const { queryUrl } = await Apify.getValue('INPUT');

  if (!queryUrl) {
    throw Error('Missing URL in INPUT!');
  }

  const options = {
    uri: queryUrl,
    encoding: null
  };

  const tmpTarget = 'med.pdf';

  let pdfBuffer = fs.readFileSync(tmpTarget);

  if (pdfBuffer) {
    log('File already saved found.');
  } else {
    log('Requesting URL: ', options.uri);
    const response = await requestPromise(options);
    pdfBuffer = Buffer.from(response);
    log(`Saving file to: ${tmpTarget}`);
    try {
      await fs.writeFileSync(tmpTarget, pdfBuffer);
      log('File saved.');
    } catch (err) {
      throw Error(err);
    }
  }

  const pathToPdf = path.join(__dirname, tmpTarget);
  console.log(pathToPdf);

  const extractPdf = promisify(pdf2Table.parse);
  let pages;
  try {
    pages = await new Promise((resolve, reject) => {
      fs.readFile(pathToPdf, async (error, buffer) => {
        if (error) reject(error);
        log('Extracting PDF...');
        try {
          const row = await extractPdf(buffer);
          resolve(row);
        } catch (err) {
          reject(err);
        }
      });
    });
    console.log(pages.slice(500));
  } catch (err) {
    throw Error('while extracting to table', err);
  }
  return;

  const parsedPages = removeEmpty(pages);
  log(
    `Found ${parsedPages.length} page${parsedPages.length > 1 ? 's' : ''}`
  );

  const [headers, ...allRows] = [].concat(...parsedPages);
  log(headers);

  // Check Hynek's OUTPUT
  // Use it to train the classifier
  // https://api.apify.com/v1/execs/Gp2sgPzQE5nukKB7o/results?format=json&simplified=1

  const headerCheck = headers.join('');
  const filteredRows = allRows.filter(
    (row) => row.join('').trim() !== headerCheck.trim()
  );

  const output = parseRows(headers, filteredRows);

  log('Setting OUTPUT...');
  await Apify.setValue('OUTPUT', output);

  log('Done.');
});
