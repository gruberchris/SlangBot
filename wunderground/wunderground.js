/* globals require module */
const rp = require('request-promise');
const wundergroundApiKey = require('.././config.json').wundergroundApiKey;
const wundergroundBaseUri = 'http://api.wunderground.com/api/' + wundergroundApiKey + '/conditions/q';

function getCurrentConditions(state, city) {
  const options = {
    uri: encodeURI(wundergroundBaseUri + '/' + state + '/' + city + '.json'),
    json: true
  };

  return rp(options);
}

module.exports.getCurrentConditions = getCurrentConditions;

getCurrentConditions('mn', 'minneapolis').then((result) => {
  console.log(result);
}).catch((error) => {
  console.log(error);
});
