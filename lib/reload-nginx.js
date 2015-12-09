const _ = require('lodash');
const checksum = require('checksum');
const exec = require('child_process').exec;
const fs = require('fs');

const nginxTemplate = require('./nginx-template');
const tutum = require('./tutum').api;

module.exports = function() {
  tutum('/api/v1/container/')
    .then((allContainers) => {
      //fetch full resource for each container
      return Promise.all(
        allContainers.objects.map(container => tutum(container.resource_uri))
      );
    })
    .then(getDnsEntries)
    .then(parseDnsEntries)
    .then((dnsEntries) => {
      if (dnsEntries.length) {
        const newConfig = nginxTemplate.render({dns:dnsEntries});
        //reload nginx if config has changed
        checksum.file("/etc/nginx/conf.d/default.conf", (err, sum) => {
          if (sum !== checksum(newConfig)) {
            reloadNginxConfig(newConfig);
          }
        });
      }
    })
    .catch(err => console.log("Error:", err));
  ;
};



function getDnsEntries(allContainers) {
  //find containers that have env var ending with PUBLIC_DNS or PRIVATE_DNS
  return allContainers.filter((container) => {
    return container.container_envvars
      .filter(env => env.key === "DNS_ENTRY")
      .length
    ;
  })
  //grab dns entries from each service
  .map((container) => {
    const dns = _.findWhere(container.container_envvars, {key: "DNS_ENTRY"});
    const port = _.findWhere(container.container_envvars, {key: "DNS_PORT"});
    const ip = _.findWhere(container.container_envvars, {key: "TUTUM_IP_ADDRESS"}).value;

    return {
      name: dns.value,
      upstream: `${ip.split("/")[0]}:${port ? port.value : 80}`, //get port from "tcp://10.7.0.1:3000"
    };
  });
}

function parseDnsEntries(dnsEntries) {
  //consolidate all upstreams with matching dns entries
  const dnsObject = dnsEntries.reduce((dns, entry) => {
    dns[entry.name] = (dns[entry.name] || []).concat(entry.upstream);
    return dns;
  }, {});

  return Object.keys(dnsObject).map((key) => ({
    name: key,
    upstream: dnsObject[key],
  }));
}

function reloadNginxConfig(config) {
  fs.writeFileSync("/etc/nginx/conf.d/default.conf", config);
  console.log("testing new Nginx config...");
  exec('nginx -t', (error, stdout, stderr) => {
      if (error !== null) {
        console.log('Nginx config error: ' + stderr);
      } else {
        exec('service nginx reload', (error, stdout, stderr) => {
          if (error !== null) {
            console.log('Nginx reload error: ' + stderr);
          } else {
            console.log('Nginx reload successful');
          }
        });
      }
  });
}
