const axios = require('axios');
const WebSocket = require('ws');

module.exports.stream = new WebSocket(`${process.env.TUTUM_STREAM_HOST}/v1/events?auth=${process.env.TUTUM_AUTH}`);

module.exports.api = function(resourceURI) {
  return axios.get(process.env.TUTUM_REST_HOST + resourceURI, {
      headers: {'Authorization': process.env.TUTUM_AUTH},
    })
    .then(response => response.data)
  ;
};
