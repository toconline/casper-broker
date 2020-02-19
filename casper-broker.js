import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';

class CasperBroker extends PolymerElement {

  static get template () {
    return html``;
  }

  static get properties () {
    return {
      /**
       * The nginx-broker base URL that will be used when building the full path.
       *
       * @type {String}
       */
      apiBaseUrl: String,
    };
  }

  async get (url, timeoutInMilliseconds) { return this.__formatResponse(await this.__request('GET', url, undefined, timeoutInMilliseconds)); }
  async post (url, body, timeoutInMilliseconds) { return this.__formatResponse(await this.__request('POST', url, body, timeoutInMilliseconds)); }
  async patch (url, body, timeoutInMilliseconds) { return this.__formatResponse(await this.__request('PATCH', url, body, timeoutInMilliseconds)); }
  async delete (url, body, timeoutInMilliseconds) { return this.__formatResponse(await this.__request('DELETE', url, body, timeoutInMilliseconds)); }

  /**
   * Performs an HTTP request to the ngix-broker API.
   *
   * @param {String} method The request's HTTP verb.
   * @param {String} requestUrl The request's URL.
   * @param {Object} requestBody The request's body.
   * @param {Number} timeoutInMilliseconds The request's timeout in milliseconds.
   */
  async __request (method, requestUrl, requestBody, timeoutInMilliseconds) {
    const abortController = new AbortController();

    const fetchSettings = {
      method: method,
      signal: abortController.signal,
      headers: new Headers({
        'Authorization': `Bearer ${this.__readCookieValue('casper_session')}`,
        'Content-Type': 'application/vnd.api+json'
      })
    };

    // Include the body unless we're dealing GET and HEAD methods, otherwise the fetch method call will error out.
    if (!['GET', 'HEAD'].includes(method) && !!requestBody) {
      fetchSettings.body = JSON.stringify(requestBody);
    }

    try {
      setTimeout(() => { abortController.abort(); }, timeoutInMilliseconds);

      const fetchResponse = await fetch(encodeURI(`${this.apiBaseUrl}/${requestUrl}`), fetchSettings);

      return await fetchResponse.json();
    } catch (exception) {
      console.error(exception);
    }
  }

  /**
   * Since the response is formatted according the JSON API standards, the response must be "flattened".
   *
   * @param {Object} response The nginx-broker response.
   */
  __formatResponse (response) {
    if (!response) return;

    // Output the errors.
    if (response.errors) return console.error(response.errors);

    // This means the response did not bring any data.
    if (!response.data) return;

    // Flatten the nginx-broker response.
    if (response.data.constructor.name === 'Object') {
      return !response.hasOwnProperty('meta')
        ? { data: { id: response.data.id, ...response.data.attributes } }
        : { data: { id: response.data.id, ...response.data.attributes }, meta: response.meta };
    } else {
      return !response.hasOwnProperty('meta')
        ? { data: response.data.map(item => ({ id: item.id, ...item.attributes })) }
        : { data: response.data.map(item => ({ id: item.id, ...item.attributes })), meta: response.meta };
    }
  }

  /**
   * This method returns the value of an existing cookie.
   *
   * @param {String} cookieName The cookie that we'll looking for.
   */
  __readCookieValue (cookieName) {
    const regexMatches = document.cookie.match(new RegExp(`${cookieName}=(\\w+);`));

    return regexMatches ? regexMatches.pop() : '';
  }
}

window.customElements.define('casper-broker', CasperBroker);