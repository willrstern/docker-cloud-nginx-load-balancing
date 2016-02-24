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
    const test3Cert = readFileSync("/certs/test3.com.crt", "utf-8")
    const expectedCert = readFileSync(__dirname + "/mocks/test3.com.crt", "utf-8")

    assert.equal(test3Cert, expectedCert);
  })

  it("doesn't create a cert file when no NGINX_CERTS is set", () => {
    let noTest4Cert = false;
    try {
      readFileSync("/certs/test4.com.crt", "utf-8")
    } catch(e) {
      noTest4Cert = true
    }
    assert(noTest4Cert);
  })

  it("creates multiple, comma-separated cert files when NGINX_CERTS is set", () => {
    const testCert = readFileSync("/certs/test.com.crt", "utf-8")
    const test2Cert = readFileSync("/certs/test2.com.crt", "utf-8")
    const expectedTestCert = readFileSync(__dirname + "/mocks/test.com.crt", "utf-8")
    const expectedTest2Cert = readFileSync(__dirname + "/mocks/test2.com.crt", "utf-8")

    assert.equal(testCert, expectedTestCert)
    assert.equal(test2Cert, expectedTest2Cert)
  })

  it("allows for an empty cert with comma-separated cert files", () => {
    let noTest5Cert = false;
    try {
      readFileSync("/certs/test5.com.crt", "utf-8")
    } catch(e) {
      noTest5Cert = true
    }
    const test6Cert = readFileSync("/certs/test6.com.crt", "utf-8")
    const expectedCert = readFileSync(__dirname + "/mocks/test6.com.crt", "utf-8")

    assert(noTest5Cert)
    assert.equal(test6Cert, expectedCert);
  })

})
