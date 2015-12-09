const hogan = require('hogan.js');

module.exports = hogan.compile(`
{{#dns}}
upstream {{name}} {
    {{#upstream}}
      server {{.}};
    {{/upstream}}
}

server {
    listen 80;
    server_name {{name}};

    location / {
        proxy_pass http://{{name}};
    }
}
{{/dns}}
`);
