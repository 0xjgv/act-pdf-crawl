// PDF extraction test for the Indian goverment.
const path = require('path');
const Promise = require('bluebird');
const pdfExtract = require('pdf-text-extract');

const { log, dir } = console;
const extract = Promise.promisify(pdfExtract);

(async () => {
  let extracted;
  try {
    const pathToPdf = path.join(__dirname, './Test.pdf');
    log('Extracting PDF...');
    const options = {
      layout: 'raw'
    };
    extracted = await extract(pathToPdf, options);
    log('Number of extracted pages:', extracted.length);
    log(extracted[3]);
  } catch (error) {
    log('Error:', error);
  }

  // Next: parse PDF into JSON object to output.test.json
  const output = extracted || {};
  dir(JSON.stringify(output));
})();
