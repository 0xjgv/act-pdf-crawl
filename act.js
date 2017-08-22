const fs = require('fs');
const path = require('path');
const Apify = require('apify');
const request = require('request');
const rp = require('request-promise');
const pdfExtract = require('pdf-text-extract');

// Helper functions
const log = console.log;
const trim = x => x.trim();

const targetUrl = 'http://www.ripuc.org/utilityinfo/electric/NPP_List.pdf';

Apify.main(() => {
  const options = {
    url: targetUrl,
    encoding: null
  };

  function crawlResult(err, pages) {
    if (err) {
      console.dir(err);
      return;
    }
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
    const th = allPages[1].map(trim);

    log('Crawling pdf...');
    let company, temp, i, j;
    for (i = 2; i < allPages.length; i++) {
      company = allPages[i];
      temp = {};
      for (j in th) temp[th[j]] = company[j];
      info.Companies.push(temp);
    }
    
    let json = JSON.stringify(info, null, 2);
    const output = {
      crawledAt: new Date(),
      json,
    };
    console.log('My output:');
    console.dir(output);
    Apify.setValue('OUTPUT', output);
    log('Finalizing...');
    fs.writeFileSync('got.json', json);
  }

  return rp(options)
    .then(function(response) {
      log('PDF requested.')
      const buffer = Buffer.from(response);
      fs.writeFileSync('temp.pdf', buffer);
      log('PDF saved.');
    })
    .finally(() => {
      log('Extracting PDF...')
      const pathToPdf = path.join(__dirname, 'temp.pdf')
      // pdfExtract function needs to be executed after the pdf file has been correctly saved.
      pdfExtract(pathToPdf, crawlResult);
    });

  // let json = await JSON.parse(
  //   fs.readFileSync('got.json', 'utf8')
  // );
});