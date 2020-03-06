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

  async getRaw (url, timeoutInMilliseconds, urlAlreadyEncoded = false) { return await this.__request('GET', url, undefined, timeoutInMilliseconds, urlAlreadyEncoded); }
  async postRaw (url, body, timeoutInMilliseconds, urlAlreadyEncoded = false) { return await this.__request('POST', url, body, timeoutInMilliseconds, urlAlreadyEncoded); }
  async patchRaw (url, body, timeoutInMilliseconds, urlAlreadyEncoded = false) { return await this.__request('PATCH', url, body, timeoutInMilliseconds, urlAlreadyEncoded); }
  async deleteRaw (url, timeoutInMilliseconds, urlAlreadyEncoded = false) { return await this.__request('DELETE', url, undefined, timeoutInMilliseconds, urlAlreadyEncoded); }

  async get (url, timeoutInMilliseconds, urlAlreadyEncoded = false) { return this.__formatResponse(await this.__request('GET', url, undefined, timeoutInMilliseconds, urlAlreadyEncoded)); }
  async post (url, body, timeoutInMilliseconds, urlAlreadyEncoded = false) { return this.__formatResponse(await this.__request('POST', url, body, timeoutInMilliseconds, urlAlreadyEncoded)); }
  async patch (url, body, timeoutInMilliseconds, urlAlreadyEncoded = false) { return this.__formatResponse(await this.__request('PATCH', url, body, timeoutInMilliseconds, urlAlreadyEncoded)); }
  async delete (url, timeoutInMilliseconds, urlAlreadyEncoded = false) { return this.__formatResponse(await this.__request('DELETE', url, undefined, timeoutInMilliseconds, urlAlreadyEncoded)); }

  abortPendingRequest () {
    // Abort a previous pending request.
    if (this.__abortRequestController) {
      this.__abortRequestController.abort();
      this.__clearPendingRequestControlVariables();
    }
  }

  /**
   * Performs an HTTP request to the ngix-broker API.
   *
   * @param {String} method The request's HTTP verb.
   * @param {String} url The request's URL.
   * @param {Object} body The request's body.
   * @param {Number} timeoutInMilliseconds The request's timeout in milliseconds.
   * @param {Boolean} urlAlreadyEncoded This flag states if the URL is already encoded or not.
   */
  async __request (method, url, body, timeoutInMilliseconds, urlAlreadyEncoded) {
    if (!timeoutInMilliseconds) throw { error: 'The parameter timeout is required.' };

    this.__abortRequestController = new AbortController();
    const fetchSettings = {
      method: method,
      signal: this.__abortRequestController.signal,
      headers: new Headers({
        'Authorization': `Bearer ${this.__readCookieValue('casper_session')}`,
        'Content-Type': 'application/vnd.api+json'
      })
    };

    // Include the body unless we're dealing GET and HEAD methods, otherwise the fetch method call will error out.
    if (!['GET', 'HEAD', 'DELETE'].includes(method) && !!body) {
      fetchSettings.body = JSON.stringify(body);
    }

    try {
      this.__abortRequestTimeout = setTimeout(() => this.abortPendingRequest(), timeoutInMilliseconds);

      const response = urlAlreadyEncoded
        ? await fetch(`${this.apiBaseUrl}/${url}`, fetchSettings)
        : await fetch(encodeURI(`${this.apiBaseUrl}/${url}`), fetchSettings);

      this.__clearPendingRequestControlVariables();

      return await response.json();
    } catch (exception) {
      exception.name !== 'AbortError'
        ? console.error(exception)
        : console.error('The request was aborted by the component either by timeout or because there was a pending request.');

      throw exception;
    }
  }

  /**
   * Since the response is formatted according the JSON API standards, the response must be "flattened".
   *
   * @param {Object} response The nginx-broker response.
   */
  __formatResponse (response) {
    if (!response) throw [{ detail: 'Ocorreu um erro inesperado. Por favor tente mais tarde.' }];

    // Output the errors.
    if (response.errors) throw response.errors;

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

  /**
   * Removes the reference to the abort controller which is no longer needed and removes the timeout that was going to cancel
   * the request for exceeding the permitted time.
   */
  __clearPendingRequestControlVariables () {
    this.__abortRequestController = undefined;
    clearTimeout(this.__abortRequestTimeout);
  }
}

window.customElements.define('casper-broker', CasperBroker);