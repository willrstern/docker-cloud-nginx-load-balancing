import axios from "axios";
import WebSocket from "ws";

const { DOCKERCLOUD_AUTH, DOCKERCLOUD_REST_HOST, DOCKERCLOUD_STREAM_HOST } = process.env;
let stream;

export function createStream() {
  stream = new WebSocket(`${DOCKERCLOUD_STREAM_HOST || "wss://ws.cloud.docker.com"}/api/audit/v1/events?auth=${DOCKERCLOUD_AUTH}`);
  return stream;
}

export function api(resourceURI) {
  return axios.get((DOCKERCLOUD_REST_HOST || "https://cloud.docker.com") + resourceURI, {
      headers: {'Authorization': DOCKERCLOUD_AUTH},
    })
    .then(response => response.data)
  ;
};
