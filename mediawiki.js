/* globals require module */
const rp = require('request-promise');

function getArticleSummaryByTitle(title) {
  const urlBase = 'https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=';

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
  const urlBase = 'http://en.wikipedia.org/w/api.php?action=query&list=search&format=json&prop=extracts&exintro=&explaintext=';

  const options = {
    uri: encodeURI(urlBase + '&srsearch=' + searchTerm + '&utf8=&continue='),
    json: true
  };

  return rp(options).then((response) => {
    if(response.query && response.query.searchinfo) {
      if(response.query.searchinfo.totalhits > 0) {
        let firstArticleTitle = response.query.search[0].title;
        let firstArticleSnippet = response.query.search[0].snippet;

        if((firstArticleSnippet.lastIndexOf(' may refer to: ') > -1 ||
          firstArticleSnippet.lastIndexOf(' usually refers to: ') > -1 ||
          firstArticleSnippet.lastIndexOf('(disambiguation)') > -1 ||
          firstArticleTitle.lastIndexOf('(disambiguation)') > -1) &&
          firstArticleTitle.toLowerCase() !== searchTerm.toLowerCase()) {

          let resultCount = response.query.search.length;

          let titleResponse = {};
          titleResponse.resultType = 'multiple';
          titleResponse.suggestedTitles = [];

          for(let counter = 0; counter < resultCount; counter++) {
            let suggestedTitle = {};
            suggestedTitle.articleTitle = response.query.search[counter].title;
            suggestedTitle.articleSnippet = response.query.search[counter].snippet;

            titleResponse.suggestedTitles.push(suggestedTitle);
          }

          return titleResponse;
        }

        let suggestedTitles = [];

        suggestedTitles.push({
          articleTitle: firstArticleTitle,
          articleSnippet: firstArticleSnippet
        });

        let isSingle = true;

        for(let counter = 0; counter < response.query.search.length; counter++) {
          if(response.query.search[counter].title.toLowerCase() === searchTerm.toLowerCase() + ' (disambiguation)')
          {
            suggestedTitles.push({
              articleTitle: response.query.search[counter].title,
              articleSnippet: response.query.search[counter].snippet
            });

            isSingle = false;

            break;
          }
        }

        return { suggestedTitles: suggestedTitles, resultType: isSingle? 'single' : 'multiple' };
      }
    }
  }).catch((error) => {
    throw new Error('Error attempting to GET articles matching ' + searchTerm + ' from mediawiki api source');
  });
}

module.exports.findMatchingArticle = (searchTerm, onSuccessCallback, onErrorCallback) => {
  getMatchingArticles(searchTerm).then((searchResult) => {
    if(searchResult) {
      // getArticleSummaryByTitle(title).then((summary) => {
      //   if(summary) {
      //     onSuccessCallback('http://en.wikipedia.org/wiki/' + title + '\n> ' + summary);
      //   } else {
      //     onSuccessCallback();
      //   }
      // }).catch((error) => {
      //   onErrorCallback(error);
      // });

      let result = {};
      result.resultType = searchResult.resultType;
      result.suggestedArticles = [];

      if(searchResult.resultType === 'single') {
        let articleTitle = searchResult.suggestedTitles[0].articleTitle;
        let articleSnippet = searchResult.suggestedTitles[0].articleSnippet;

        articleSnippet = articleSnippet.replace(/<span class="searchmatch">/g, '');
        articleSnippet = articleSnippet.replace(/<\/span>/g, '');
        articleSnippet = articleSnippet.replace(/&quot;/g, '');

        result.suggestedArticles.push({
          articleUri: encodeURI('http://en.wikipedia.org/wiki/' + articleTitle),
          articleSnippet: articleSnippet,
          articleTitle: articleTitle
        });
      } else {
        for(let counter = 0; counter < searchResult.suggestedTitles.length; counter++) {
          let articleTitle = searchResult.suggestedTitles[counter].articleTitle;
          let articleSnippet = searchResult.suggestedTitles[counter].articleSnippet;

          articleSnippet = articleSnippet.replace(/<span class="searchmatch">/g, '');
          articleSnippet = articleSnippet.replace(/<\/span>/g, '');
          articleSnippet = articleSnippet.replace(/&quot;/g, '');

          result.suggestedArticles.push({
            articleUri: encodeURI('http://en.wikipedia.org/wiki/' + articleTitle),
            articleSnippet: articleSnippet,
            articleTitle: articleTitle
          });
        }
      }

      onSuccessCallback(result);
    } else {
      onSuccessCallback();
    }
  }).catch((error) => {
    onErrorCallback(error);
  });
};
