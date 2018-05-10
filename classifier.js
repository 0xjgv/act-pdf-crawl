const Apify = require('apify'); // eslint-disable-line
const natural = require('natural'); // eslint-disable-line
const request = require('request-promise'); // eslint-disable-line

const { log } = console;

// To do: refactor to reduce
const keysAndValues = {};
function train(data, previousKey) {
  if (data && typeof data === 'object') {
    if (Array.isArray(data)) {
      data.forEach(item => train(item, previousKey));
    } else {
      const keys = Object.keys(data);
      keys.forEach(key => train(data[key], key));
    }
  } else if (data) {
    if (previousKey in keysAndValues) {
      keysAndValues[previousKey].push(data);
    } else {
      keysAndValues[previousKey] = [data];
    }
  }
}

Apify.main(async () => {
  const input = await Apify.getValue('INPUT');
  if (!input.data) {
    throw new Error('data INPUT is required.');
  }

  let data = require('./data.json'); // eslint-disable-line
  if (!data.length) {
    const dataRequest = request(input.data);
    data = JSON.parse(await dataRequest);
  }

  const classifiersType = ['LOGISTIC', 'BAYES'];
  const classifiers = classifiersType.map(
    classifier => Apify.getValue(classifier)
  );
  let [previousLogistic, previousBayes] = await Promise.all(classifiers);
  [previousLogistic, previousBayes] = [previousLogistic, previousBayes].map(JSON.parse);


  let isTrained = false;
  let logistic;
  if (previousLogistic) {
    log('Restoring previous LOGISTIC...');
    logistic = natural.LogisticRegressionClassifier.restore(previousLogistic);
    isTrained = true;
  } else {
    log('Creating new Logistic Regression CLASSIFIER.');
    logistic = new natural.LogisticRegressionClassifier();
  }

  let bayes;
  if (previousBayes) {
    log('Restoring previous BAYES...');
    bayes = natural.BayesClassifier.restore(previousBayes);
    isTrained = isTrained && true;
  } else {
    log('Creating new Bayes CLASSIFIER.');
    bayes = new natural.BayesClassifier();
  }

  // Train
  if (data.length && isTrained) {
    log('Data found:', data.length);
    console.time('training');
    train(data);

    // Reduce the size of the data to train. O(n^2) complexity.
    Object.keys(keysAndValues).forEach((key) => {
      log('Training:', key);
      // Reduce the training data size
      const values = [...new Set(keysAndValues[key])].slice(0, 30);

      values.forEach((val) => {
        logistic.addDocument(val, key);
        bayes.addDocument(val, key);
      });
    });
    logistic.train();
    bayes.train();
    console.timeEnd('training');
  }

  const examples = ['03/5/2018', 'active', 'IL', 'MA'];
  examples.forEach((ex) => {
    const testLogistic = logistic.classify(ex);
    const testBayes = bayes.classify(ex);
    log(ex, testLogistic, testBayes);
  });
  log('Saving classifiers...');
  const savePreviousClassifiers = [logistic, bayes].map(
    (classifier, i) => Apify.setValue(classifiersType[i], JSON.stringify(classifier))
  );
  await Promise.all(savePreviousClassifiers);

  log('Done.');
});
