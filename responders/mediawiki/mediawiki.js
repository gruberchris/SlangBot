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

      return { suggestedArticles : suggestedArticles };
    }
  }
}

function findMatchingArticle(searchTerm) {
  return getMatchingArticles(searchTerm);
}

function onMediawikiResponse(bot, message) {

  let articleSearchTerm = message.match[1];

  findMatchingArticle(articleSearchTerm).then((result) => {
    if(result) {
      let articlesCount = result.suggestedArticles.length;
      let response = {};

      response.attachments = [];

      for(let counter = 0; counter < articlesCount; counter++) {
        let article = result.suggestedArticles[counter];

        response.attachments.push({
          fallback: article.title,
          title : article.title,
          title_link: article.uri,
          text: article.snippet,
          color: "#7CD197"
        });

        if(articlesCount === 1 || article.title.toLowerCase() === articleSearchTerm.toLowerCase()) {
          response.text = 'This article appears to be what you asked for :tada:';
          break;
        } else {
          response.text = 'I found ' + articlesCount + ' articles about `' + articleSearchTerm
            + '` you may be interested in :confetti_ball:';
        }
      }

      bot.reply(message, response);
    } else {
      bot.reply(message, 'I could not find any information about `' + articleSearchTerm + '` :confounded:');
    }
  }).catch((error) => {
    bot.reply(message, 'There was a problem while looking up information about `' + articleSearchTerm + '` :boom:');
  });
}

module.exports.onMediawikiResponse = onMediawikiResponse;

/*
findMatchingArticle('').then((queryResult) => {
  console.log(queryResult);
}).catch((error) => {
  console.log(error);
});
*/
