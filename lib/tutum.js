import axios from "axios";
import WebSocket from "ws";

const { TUTUM_AUTH, TUTUM_REST_HOST, TUTUM_STREAM_HOST } = process.env;
let stream;

export function createStream() {
  stream = new WebSocket(`${TUTUM_STREAM_HOST || "wss://stream.tutum.co"}/v1/events?auth=${TUTUM_AUTH}`);
  return stream;
}

export function api(resourceURI) {
  return axios.get((TUTUM_REST_HOST || "https://dashboard.tutum.co") + resourceURI, {
      headers: {'Authorization': TUTUM_AUTH},
    })
    .then(response => response.data)
  ;
};
