const fs = require('fs');
const path = require('path');
const Apify = require('apify');
const Promise = require("bluebird");
const pdfExtract = require('pdf-text-extract');
const requestPromise = require('request-promise');

// Helper functions
const log = console.log;

// This function will vary on the formatting of each PDF.
function crawlResult(pages) {
  log('Crawling pdf...');
  const allPages = pages[0].split(/\n/g)
    .map(x => x.split(/\s{4,}/g)
      .map(y => y.replace(/\s+/g, ' '))
      .filter(Boolean)
    ).filter(e => e.length);

  const info = {
    'Title': allPages[0][0],
    'Number of Registered Companies': allPages.length,
    'Companies': [],
  };
  const th = allPages[1].map(x => x.trim());

  let company, temp, i, j;
  for (i = 2; i < allPages.length; i++) {
    company = allPages[i];
    temp = {};
    for (j in th) temp[th[j]] = company[j];
    info.Companies.push(temp);
  }

  // const json = JSON.stringify(info); // or return a JSON Object;
  return info;
}

Apify.main(async () => {
  const { url } = await Apify.getValue('INPUT');
  log('URL: ' + url);
  const options = {
    url,
    encoding: null // if you expect binary data, set encoding to `null`.
  };

  log('Requesting URL...');
  const response = await requestPromise(options);
  const buffer = Buffer.from(response);
  const tmpTarget = 'temp.pdf';
  log('Saving file to: ' + tmpTarget);
  fs.writeFileSync(tmpTarget, buffer)
  log('File saved.');

  const pathToPdf = path.join(__dirname, tmpTarget);
  const extract = Promise.promisify(pdfExtract);

  log('Starting PDF extraction...');
  const pages = await extract(pathToPdf);
  const json = crawlResult(pages);
  const output = {
    crawledAt: new Date(),
    JSON: json,
  };
  console.log('My output:');
  console.dir(output);
  log('Setting output...');
  return await Apify.setValue('OUTPUT', output);
});