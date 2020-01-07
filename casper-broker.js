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

  async get (url) { return this.__formatResponse(await this.__request('GET', url)); }
  async delete (url) { return this.__formatResponse(await this.__request('DELETE', url)); }
  async post (url, body) { return this.__formatResponse(await this.__request('POST', url, body)); }
  async patch (url, body) { return this.__formatResponse(await this.__request('PATCH', url, body)); }

  /**
   * Performs an HTTP request to the ngix-broker API.
   *
   * @param {String} method The request's HTTP verb.
   * @param {String} requestUrl The request's URL.
   * @param {Object} requestBody The request's body.
   */
  async __request (method, requestUrl, requestBody) {
    const fetchSettings = {
      method: method,
      headers: new Headers({
        'Authorization': `Bearer ${this.__readCookieValue('casper_session')}`,
        'Content-Type': 'application/vnd.api+json'
      })
    };

    // Only include the body unless we're dealing GET and HEAD methods. Otherwise the fetch will error out.
    if (!['GET', 'HEAD'].includes(method) && !!requestBody) {
      fetchSettings.body = JSON.stringify(requestBody);
    }

    try {
      const fetchResponse = await fetch(`${this.apiBaseUrl}/${requestUrl}`, fetchSettings);

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
    return response.data.constructor.name === 'Object'
      ? { id: response.data.id, ...response.data.attributes }
      : response.data.map(item => ({ id: item.id, ...item.attributes }));
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