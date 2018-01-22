const fs = require('fs');
const path = require('path');
const Apify = require('apify');
const Promise = require('bluebird');
const { typeCheck } = require('type-check');
const pdfExtract = require('pdf-text-extract');
const requestPromise = require('request-promise');

// Helper functions
const { log, dir, error } = console;

// Definition of the input
const INPUT_TYPE = `{
  url: String,
}`;

// This function will vary on the formatting of each PDF.
function crawlResult(arr) {
  const allPages = arr[0].split(/\n/g)
    .map(x => x.split(/\s{4,}/g)
      .map(y => y.replace(/\s+/g, ' '))
      .filter(Boolean)
      .filter(e => e.length));

  const info = {
    Title: allPages[0][0],
    'Number of Registered Companies': allPages.length,
    Companies: []
  };

  const th = allPages[3].map(x => x.trim());

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
  // const json = JSON.stringify(info); // or return a JSON Object;
  return info;
}

Apify.main(async () => {
  // Fetch and check the input

  const input = await Apify.getValue('INPUT');
  if (!typeCheck(INPUT_TYPE, input)) {
    error('Expected input:');
    error(INPUT_TYPE);
    error('Received input:');
    throw new Error('Received invalid input');
  }

  const options = {
    url: 'http://www.ripuc.org/utilityinfo/electric/NPP_List.pdf',
    // set to `null`, if you expect binary data.
    encoding: null
  };

  log('Requesting URL: ', options.url);
  const response = await requestPromise(options);
  const buffer = Buffer.from(response);

  const tmpTarget = 'temp.pdf';

  log(`Saving file to: ${tmpTarget}`);
  fs.writeFile(tmpTarget, buffer, (err) => {
    if (err) throw new Error(err);
    log('File saved.');
  });

  const pathToPdf = path.join(__dirname, tmpTarget);
  const extract = Promise.promisify(pdfExtract);

  log('Extracting PDF...');
  const arrayOfPages = await extract(pathToPdf);
  log('Crawling result...');
  const json = crawlResult(arrayOfPages);

  const output = {
    actAt: new Date(),
    actResult: json
  };
  dir(JSON.stringify(output));

  log('Setting OUTPUT...');
  await Apify.setValue('OUTPUT', output);
  log('Finished');
});
