/* globals require module */
class ArticleSearchResult {
  constructor(snippet, title, baseUri) {
    this.rawSnippet = snippet;
    this.title = title;
    this.baseUri = baseUri;
  }

  get uri() {
    return encodeURI(this.baseUri + '/wiki/' + this.title);
  }

  get snippet() {
    return this.rawSnippet.replace(/<span class="searchmatch">/g, '').replace(/<\/span>/g, '').replace(/&quot;/g, '');
  }
}

module.exports.ArticleSearchResult = ArticleSearchResult;
