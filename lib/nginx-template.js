import hogan from "hogan.js";

export default hogan.compile(`
{{#servers}}
upstream {{upstreamName}} {
    {{#upstream}}
      server {{.}};
    {{/upstream}}
}

server {
    listen 80;
    server_name {{serverName}};

    location / {
      {{#privateIp}}
        error_page 418 = @private;
        if ( $remote_addr ~* "{{privateIp}}" ) {
          return 418;
        }
        proxy_pass http://{{upstreamName}}{{publicPath}};
      {{/privateIp}}
      {{^privateIp}}
        proxy_pass http://{{upstreamName}}{{publicPath}};
      {{/privateIp}}

    }
    {{#privateIp}}

    location @private {
      proxy_pass http://{{upstreamName}}{{privatePath}};
    }

    {{/privateIp}}
}
{{/servers}}
`);
