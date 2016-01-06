import hogan from "hogan.js";

export default hogan.compile(`
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
    }
  }
  {{/servers}}
{{/configs}}
`);
