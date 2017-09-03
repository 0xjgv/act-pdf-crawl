// Quick setup required modules
const fs = require('fs');
const path = require('path');
const pathToPdf = path.join(__dirname, 'NPP_List.pdf')

// Helper functions
const log = console.log;
const trim = x => x.trim();
// const { dropTillOrWhen } = require('./helpers.js');

// Apify Pdf Extractor
const Apify = require('apify');
const request = require('request-promise');
const extract = require('pdf-text-extract');
const options = {
  splitPages: true,
  layout: 'layout',
};

function crawlResult(err, text) {
  // Test for Quokka Cmd + K, Q
  text
  err
  if (err) {
    console.dir(err);
    return;
  }

  const allPages = text[0].split(/\n/g) 
    .map(x => x.split(/\s{4,}/g) 
      .map(y => y.replace(/\s+/g, ' ')) 
      .filter(Boolean)
    ).filter(e => e.length); 

  const info = {
    'Title': allPages[0][0],
    'Number of Registered Companies': allPages.length,
    'Companies': [],
  };
  const th = allPages[1].map(trim);

  let company, temp, i, j;
  for (i = 2; i < allPages.length; i++) {
    company = allPages[i];
    temp = {};
    for (j in th) temp[th[j]] = company[j];
    info.Companies.push(temp);
  }
  fs.writeFileSync('output.json', JSON.stringify(info, null, 2));
  log('File Ready:', pathToPdf);
}

extract(pathToPdf, options, 'pdftotext', crawlResult);