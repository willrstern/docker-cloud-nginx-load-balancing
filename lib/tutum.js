import axios from "axios";
import WebSocket from "ws";

const { TUTUM_AUTH, TUTUM_REST_HOST, TUTUM_STREAM_HOST } = process.env;

export var stream = new WebSocket(`${TUTUM_STREAM_HOST}/v1/events?auth=${TUTUM_AUTH}`);

export function api(resourceURI) {
  return axios.get(TUTUM_REST_HOST + resourceURI, {
      headers: {'Authorization': TUTUM_AUTH},
    })
    .then(response => response.data)
  ;
};
