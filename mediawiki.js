/* globals require module */
const rp = require('request-promise');

function getArticleSummaryByTitle(title) {
  const urlBase = 'https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=';

  const options = {
    uri: urlBase + '&titles=' + title,
    json: true
  };

  return rp(options).then((response) => {
    let firstResult = response.query.pages[Object.keys(response.query.pages)[0]];

    if(firstResult.pageid !== -1) {
      return firstResult.extract.substring(0, 252) + '...';
    }
  }).catch((error) => {
    throw new Error('Error attempting to GET article title matching ' + title + ' from mediawiki api source');
  });
}

function getMatchingArticles(searchTerm) {
  const urlBase = 'http://en.wikipedia.org/w/api.php?action=query&list=search&format=json&prop=extracts&exintro=&explaintext=';

  const options = {
    uri: urlBase + '&srsearch=' + searchTerm + '&utf8=&continue=',
    json: true
  };

  return rp(options).then((response) => {
    if(response.query && response.query.searchinfo) {
      if(response.query.searchinfo.totalhits > 0) {
        return response.query.search[0].title;
      }
    }
  }).catch((error) => {
    throw new Error('Error attempting to GET articles matching ' + searchTerm + ' from mediawiki api source');
  });
}

module.exports.findMatchingArticle = (searchTerm, onSuccessCallback, onErrorCallback) => {
  getMatchingArticles(searchTerm).then((title) => {
    if(title) {
      // getArticleSummaryByTitle(title).then((summary) => {
      //   if(summary) {
      //     onSuccessCallback('http://en.wikipedia.org/wiki/' + title + '\n> ' + summary);
      //   } else {
      //     onSuccessCallback();
      //   }
      // }).catch((error) => {
      //   onErrorCallback(error);
      // });
      let articleUri = encodeURI('http://en.wikipedia.org/wiki/' + title);
      onSuccessCallback(articleUri);
    } else {
      onSuccessCallback();
    }
  }).catch((error) => {
    onErrorCallback(error);
  });
};
