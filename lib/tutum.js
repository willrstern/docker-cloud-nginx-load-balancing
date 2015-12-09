const axios = require('axios');
const WebSocket = require('ws');

const tutumAPI = 'https://dashboard.tutum.co';
const userPublicToken = 'your tutum token';
const username = 'your tutum username';

module.exports.stream = new WebSocket('wss://stream.tutum.co/v1/events?token='+ userPublicToken +'&user=' +username);

module.exports.api = function(resourceURI) {
  return axios.get(tutumAPI + resourceURI, {
      headers: {'Authorization': `ApiKey ${username}:${userPublicToken}`},
    })
    .then(response => response.data)
  ;
};
