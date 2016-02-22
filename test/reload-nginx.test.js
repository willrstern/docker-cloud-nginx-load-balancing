import assert from "assert"
import { readFileSync } from "fs"
import { find } from "lodash"

import { getContainersToBalance, parseServices, generateNewConfig } from "../lib/reload-nginx"

describe("getContainersToBalance", () => {
  const containers = getContainersToBalance(require("./mocks/allcontainers.json"))

  it("returns containers when NGINX_LB == test", () => {
    const testContainers = containers.filter((container) => {
      return find(container.container_envvars, {key: "NGINX_LB"}).value === "test"
    })
    assert(testContainers.length === 6)
  })

  it("doesn't return containers when NGINX_LB !== test", () => {
    const nonTestContainers = containers.filter((container) => {
      return find(container.container_envvars, {key: "NGINX_LB"}).value !== "test"
    })
    assert(nonTestContainers.length === 0)
  })

  it("returns state='Running' containers", () => {
    const running = containers.filter((container) => container.state === "Running")
    assert(running.length === 6)
  })

  it("doesn't return containers when state !== 'Running'", () => {
    const running = containers.filter((container) => container.state !== "Running")
    assert(running.length === 0)
  })
})

describe("parseServices", () => {
  const containers = getContainersToBalance(require("./mocks/allcontainers.json"))
  const services = parseServices(containers)

  it("groups upstreams by virtual host", () => {
    const testService = find(services, {host: "test.com"})
    const upstream1 = ~testService.upstream.indexOf('10.7.0.1:3000')
    const upstream2 = ~testService.upstream.indexOf('10.7.0.2:3001')
    const upstream3 = ~testService.upstream.indexOf('10.7.0.3:3002')

    assert(upstream1 && upstream2 && upstream3)
  })

  it("accepts multiple, comma-separated virtual hosts", () => {
    const testService = find(services, {host: "test2.com"})
    const upstream1 = ~testService.upstream.indexOf('10.7.0.1:3000')
    const upstream2 = ~testService.upstream.indexOf('10.7.0.2:3001')
    const upstream3 = ~testService.upstream.indexOf('10.7.0.3:3002')

    assert(upstream1 && upstream2 && upstream3)
  })

  it("defaults to port 80 when NGINX_PORT is not set", () => {
    const testService = find(services, {host: "test3.com"})

    assert(~testService.upstream.indexOf('10.7.0.6:80'))
  })

  it("sets ssl to false when no cert exists", () => {
    const testService = find(services, {host: "test4.com"})
    assert(testService.ssl === false);
  })

  it("creates a cert file when NGINX_CERTS is set", () => {
    const test3Cert = readFileSync(process.env.NGINX_CERTS + "/test3.com.crt", "utf-8")
    assert(test3Cert === "test3.com");
  })

  it("doesn't create a cert file when no NGINX_CERTS is set", () => {
    let fail = false;
    try {
      readFileSync(process.env.NGINX_CERTS + "/test4.com.crt", "utf-8")
    } catch(e) {
      fail = true
    }
    assert(fail);
  })

  it("creates multiple, comma-separated cert files when NGINX_CERTS is set", () => {
    const testCert = readFileSync(process.env.NGINX_CERTS + "/test.com.crt", "utf-8")
    const test2Cert = readFileSync(process.env.NGINX_CERTS + "/test2.com.crt", "utf-8")
    assert(testCert === "test.com" && test2Cert === "test2.com");
  })

  it("allows for an empty cert with comma-separated cert files", () => {
    let noTest5Cert = false;
    try {
      readFileSync(process.env.NGINX_CERTS + "/test5.com.crt", "utf-8")
    } catch(e) {
      noTest5Cert = true
    }
    const test6Cert = readFileSync(process.env.NGINX_CERTS + "/test6.com.crt", "utf-8")
    assert(noTest5Cert && test6Cert === "test6.com");
  })

})

describe("TODO: generateNewConfig", () => {
  it("is pending")
})
