import hogan from "hogan.js";

export default hogan.compile(`
#catch-all 404 server
server {
    listen 80;
    listen 443 ssl;

    server_name _;

    return 404;
}

{{#configs}}
# APP: {{serviceName}}
  upstream {{upstreamName}} {
    {{#upstream}}
      server {{.}};
    {{/upstream}}
  }
  {{#servers}}
  server {
    listen 80;
    server_name {{host}};

    location / {
      proxy_pass http://{{upstreamName}}{{path}};
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-For $remote_addr;
    }
  }
  {{/servers}}
{{/configs}}
`);
