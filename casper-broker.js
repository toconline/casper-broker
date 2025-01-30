/* 
 * Copyright (C) 2020 Cloudware S.A. All rights reserved.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';

export class CasperBroker extends PolymerElement {

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

  abortPendingRequest () { }

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
    return new Promise((resolve, reject) => {
      if (!timeoutInMilliseconds) throw { error: 'The parameter timeout is required.' };

      const encodedUrl = urlAlreadyEncoded
        ? `${this.apiBaseUrl}/${url}`
        : encodeURI(`${this.apiBaseUrl}/${url}`);

      const request = new XMLHttpRequest();
      request.open(method, encodedUrl);
      request.setRequestHeader('Content-Type', 'application/vnd.api+json');
      request.setRequestHeader('Authorization', `Bearer ${app.socket.sessionCookie}`);
      request.timeout = timeoutInMilliseconds;
      request.onerror = () => reject({});
      request.ontimeout = () => reject({});
      request.onload = event => {
        try {
          const parsedResponse = JSON.parse(event.target.response);
          event.target.status.toString().startsWith('2')
            ? resolve(parsedResponse)
            : reject(parsedResponse);
        } catch (error) {
          // If we cant parse the response just reject with the error
          reject(error);
        }
      };

      !['POST', 'PATCH'].includes(method) || !body
        ? request.send()
        : request.send(JSON.stringify(body));
    });
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
    return response.data.constructor.name === 'Object'
      ? { ...response,
          id: response.data.id,
          type: response.data.type,
          data: { id: response.data.id, ...response.data.attributes, relationships: response.data.relationships } }
      : { ...response,
          id: response.data.id,
          type: response.data.type,
          data: response.data.map(item => ({ id: item.id, ...item.attributes, relationships: item.relationships })) };
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
