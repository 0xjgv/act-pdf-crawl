const fs = require('fs');
const path = require('path');
const Apify = require('apify');
const Promise = require('bluebird');
const pdfToTable = require('pdf-table-extractor');
const requestPromise = require('request-promise');

// const pdfExtract = require('pdf-text-extract');

const { log, dir } = console;

const removeEmpty = array => array.reduce((acc, cur) => {
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

const parseRows = (headers, rows) => (
  rows.map(row => (
    headers.reduce((obj, header, i) => {
      let current = row[i];
      if (current.includes('\n')) {
        current = current.split('\n');
      } else {
        current = [current];
      }
      log(current);
      const output = removeEmpty(current);
      return Object.assign(obj, { [header]: output });
    }, {})
  ))
);

// Automate with natural BayesClassifier
function crawlResult(array) {
  log(`Found ${array.length} page${array.length > 1 ? 's' : ''}`);
  const allPages = array.map(arr =>
    arr.split(/\n/g).reduce((acc, line) => {
      if (line) {
        acc.push(line.trim());
      }
      return acc;
    }, []));

  // The first page contains the main information or is blank
  const [firstPage, ...morePages] = allPages;
  log(morePages.length);

  // Pair rows in the PDF table together and train

  log(firstPage);

  const [title] = firstPage;
  const info = {
    title,
    companies: []
  };

  const th = firstPage[3].map(x => x.trim());

  let company;
  let temp;
  for (let i = 4; i < allPages.length; i += 1) {
    company = allPages[i];
    temp = {};
    for (let j = 0; j < th.length; j += 1) {
      temp[th[j]] = company[j];
    }
    info.Companies.push(temp);
  }
  return info;
}

Apify.main(async () => {
  const { url } = await Apify.getValue('INPUT');

  if (!url) {
    throw new Error('Missing URL in INPUT!');
  }

  const options = {
    url,
    encoding: null
  };

  log('Requesting URL: ', options.url);
  const response = await requestPromise(options);
  const buffer = Buffer.from(response);

  const tmpTarget = 'temp.pdf';

  log(`Saving file to: ${tmpTarget}`);
  try {
    await fs.writeFileSync(tmpTarget, buffer);
    log('File saved.');
  } catch (err) {
    throw new Error(err);
  }

  const pathToPdf = path.join(__dirname, tmpTarget);
  // const extract = Promise.promisify(pdfExtract);

  log('Extracting PDF...');
  // const arrayOfPages = await extract(pathToPdf);
  let pages;
  try {
    const { pageTables } = await new Promise((resolve, reject) => {
      pdfToTable(pathToPdf, resolve, reject);
    });
    pages = pageTables.map(({ tables: tbs }) => tbs);
  } catch (err) {
    log('Error while extracting to table:', err);
    return null;
  }
  const parsedPages = removeEmpty(pages);
  const [firstPage] = parsedPages;
  log(`Found ${parsedPages.length} page${parsedPages.length > 1 ? 's' : ''}`);

  // split each index into a column
  const [headers, ...firstPageRest] = firstPage;
  log(headers);

  // Flatten all pages into a an array of rows.
  const allPages = [...firstPageRest, [].concat(...parsedPages)];

  // Check Hynek's OUTPUT
  // https://api.apify.com/v1/execs/Gp2sgPzQE5nukKB7o/results?format=json&simplified=1

  const result = parseRows(headers, allPages);
  log(result);

  const output = {
    actAt: new Date(),
    actResult: JSON.stringify(result, null, 2)
  };

  log('Setting OUTPUT...');
  await Apify.setValue('OUTPUT', output);
  log('Done.');
});
