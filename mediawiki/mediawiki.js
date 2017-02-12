/* globals require module */
const rp = require('request-promise');
const ArticleSearchResult = require('./articleSearchResult').ArticleSearchResult;
const mediaWikiHostBaseUri = require('.././config.json').mediaWikiBaseUri;

function getMatchingArticles(searchTerm) {
  const urlBase = mediaWikiHostBaseUri + '/w/api.php?action=query&list=search&format=json&prop=extracts&exintro=&explaintext=';

  const options = {
    uri: encodeURI(urlBase + '&srsearch=' + searchTerm + '&srlimit=6&utf8=&continue='),
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

      response.query.search.forEach((element) => {
        let articleSnippet = element.snippet;
        let articleTitle = element.title;

        suggestedArticles.push(new ArticleSearchResult(articleSnippet, articleTitle, mediaWikiHostBaseUri));
      });

      return { suggestedArticles : suggestedArticles }
    }
  }
}

function findMatchingArticleTest (searchTerm, onSuccessCallback, onErrorCallback) {
  getMatchingArticles(searchTerm).then((queryResult) => {
    if(queryResult) {
      onSuccessCallback(queryResult);
    } else {
      onSuccessCallback();
    }
  }).catch((error) => {
    onErrorCallback(error);
  });
}

module.exports.findMatchingArticle = findMatchingArticleTest;

findMatchingArticleTest('', (success) => {
   console.log(success);
 }, (error) => {
   console.log(error);
});
