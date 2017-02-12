/* globals require module */
const rp = require('request-promise');
const ArticleSearchResult = require('./articleSearchResult').ArticleSearchResult;
const mediaWikiHostBaseUri = require('.././config.json').mediaWikiBaseUri;

// TODO: Keep this function or remove ?
function getArticleSummaryByTitle(title) {
  const urlBase = mediaWikiHostBaseUri + '/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=';

  const options = {
    uri: encodeURI(urlBase + '&titles=' + title),
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
  const urlBase = mediaWikiHostBaseUri + '/w/api.php?action=query&list=search&format=json&prop=extracts&exintro=&explaintext=';

  const options = {
    uri: encodeURI(urlBase + '&srsearch=' + searchTerm + '&utf8=&continue='),
    json: true
  };

  return rp(options).then((response) => {
    return processQueryResponse(response);
  }).catch((error) => {
    throw new Error('Error attempting to GET articles matching ' + searchTerm + ' from mediawiki api source');
  });
}

function processQueryResponse(response) {
  if(response.query && response.query.searchinfo) {
    if (response.query.searchinfo.totalhits > 0) {
      let suggestedArticles =  [];

      for(let counter = 0; counter < response.query.search.length; counter++) {
        let articleSnippet = response.query.search[counter].snippet;
        let articleTitle = response.query.search[counter].title;

        suggestedArticles.push(new ArticleSearchResult(articleSnippet, articleTitle, mediaWikiHostBaseUri));
      }

      return { suggestedArticles : suggestedArticles }
    }
  }
}

function findMatchingArticleTest (searchTerm, onSuccessCallback, onErrorCallback) {
  getMatchingArticles(searchTerm).then((queryResult) => {
    if(queryResult) {
      // getArticleSummaryByTitle(title).then((summary) => {
      //   if(summary) {
      //     onSuccessCallback('http://en.wikipedia.org/wiki/' + title + '\n> ' + summary);
      //   } else {
      //     onSuccessCallback();
      //   }
      // }).catch((error) => {
      //   onErrorCallback(error);
      // });

      onSuccessCallback(queryResult);
    } else {
      onSuccessCallback();
    }
  }).catch((error) => {
    onErrorCallback(error);
  });
}

module.exports.findMatchingArticle = findMatchingArticleTest;

findMatchingArticleTest('Trump', (success) => {
   console.log(success);
 }, (error) => {
   console.log(error);
});
