import assert from "assert"
import { execSync } from "child_process"
import { readFileSync } from "fs"
import { find, snakeCase } from "lodash"
import nginxConfigParser from "nginx-config-parser"

import { getContainersToBalance, parseServices, generateNewConfig } from "../lib/reload-nginx"

const NGINX_CONFIG_FILE = "/etc/nginx/conf.d/default.conf";

describe("nginx", () => {
  beforeEach(function(done) {
    const containers = getContainersToBalance(require("./mocks/allcontainers.json"))
    const services = parseServices(containers)
    const newConfig = generateNewConfig(services)

    //a little time for checksum
    setTimeout(() => {
      done()
    }, 100)
  })

  describe("config", () => {
    it("was created", () => {
      readFileSync(NGINX_CONFIG_FILE);
    })

    it("is accepted by nginx", () => {
      execSync("nginx -t")
    })

    describe("upstreams", () => {
      it("contains running test.com upstream nodes", () => {
        const config = nginxConfigParser.parseFromString( readFileSync(NGINX_CONFIG_FILE, 'utf-8') )
        const upstream = config["upstream test_com"][0].server;

        assert(hasUpstream(upstream, "10.7.0.1:3000"))
        assert(hasUpstream(upstream, "10.7.0.2:3001"))
        assert(hasUpstream(upstream, "10.7.0.3:3002"))
        assert(!hasUpstream(upstream, "10.7.0.4:3000"))
      })

      it("contains running test2.com upstream nodes", () => {
        const config = nginxConfigParser.parseFromString( readFileSync(NGINX_CONFIG_FILE, 'utf-8') )
        const upstream = config["upstream test_2_com"][0].server;

        assert(hasUpstream(upstream, "10.7.0.1:3000"))
        assert(hasUpstream(upstream, "10.7.0.2:3001"))
        assert(hasUpstream(upstream, "10.7.0.3:3002"))
        assert(!hasUpstream(upstream, "10.7.0.4:3000"))
      })

      it("contains running test3.com upstream nodes", () => {
        const config = nginxConfigParser.parseFromString( readFileSync(NGINX_CONFIG_FILE, 'utf-8') )
        const upstream = config["upstream test_3_com"][0].server;

        assert(hasUpstream(upstream, "10.7.0.6:80"))
      })

      it("contains running test4.com upstream nodes", () => {
        const config = nginxConfigParser.parseFromString( readFileSync(NGINX_CONFIG_FILE, 'utf-8') )
        const upstream = config["upstream test_4_com"][0].server;

        assert(hasUpstream(upstream, "10.7.0.7:80"))
      })

      it("contains running test5.com upstream nodes", () => {
        const config = nginxConfigParser.parseFromString( readFileSync(NGINX_CONFIG_FILE, 'utf-8') )
        const upstream = config["upstream test_5_com"][0].server;

        assert(hasUpstream(upstream, "10.7.0.8:80"))
      })

      it("contains running test6.com upstream nodes", () => {
        const config = nginxConfigParser.parseFromString( readFileSync(NGINX_CONFIG_FILE, 'utf-8') )
        const upstream = config["upstream test_6_com"][0].server;

        assert(hasUpstream(upstream, "10.7.0.8:80"))
      })
    })

    describe("servers", () => {
      it("proxy_pass points to correct upstream for virtual hosts", () => {
        const config = nginxConfigParser.parseFromString( readFileSync(NGINX_CONFIG_FILE, 'utf-8') )
        const hosts = ["test.com", "test2.com", "test3.com", "test4.com", "test5.com", "test6.com"];

        hosts.forEach((host) => {
          assert.equal(getProxyPass(config.server, host), `http://${snakeCase(host)}`);
        })
      })
    })
  })

})

function hasUpstream(upstream, url) {
  let exists = false;
  upstream.forEach((val) => {
    if (Array.isArray(val) && val[0] === url) {
      exists = true;
    }
  })
  return exists;
}

function getProxyPass(servers, serverName) {
  const server = getServer(servers, serverName);
  return server["location /"][0].proxy_pass[0][0];
}

function getServer(servers, serverName) {
  for (let i=0; i < servers.length; i++) {
    if (servers[i].server_name[0][0] === serverName) {
      return servers[i]
    }
  }
}
