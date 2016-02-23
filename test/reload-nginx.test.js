import assert from "assert"
import { readFileSync } from "fs"
import { find } from "lodash"

import { getContainersToBalance, parseServices, generateNewConfig } from "../lib/reload-nginx"
const certString = "-----BEGIN RSA PRIVATE KEY-----\\nMIICXQIBAAKBgQC/G6eud0cQqqI729F+uxT1Zv1HLpqz/qOc/3GjtZohNUyOCJK0\\ngoiiNwz9nNy62Q3iAknW/EP6TKNfiN1AFNsqECsxOku0mUAyvERLeBfWpXVXTi27\\n7ml7KXoVhhDxPj3/PDsgyvrEsQ8e9/jDvkzovSKyfMJa0shbi6gwzJr+awIDAQAB\\nAoGBAK0yoBZzDVnieyOqxcOIQ6dgjlzrtNM6DQglTdVjqWs9RcNXq7Wis7foEoLq\nnfVM79ML5eXMPMNkn4/elz4TaMe1tQKzeevy7waLEjLDlrtqQs4duX4ulUhQvDr2\\nZnWLiaoGIN/K+QnHzR1k7Kj07sT8PL3gIwqtqRdDBSO4ljIRAkEA6wMZ/OxKJCH6\nlKQ3C+7wlXttmBhkGQpzjvC0E8yJFR2ui/SCnvL75OD5+2pDUGpoXaIeCXDAisWN\\nAi/KZ9bF2QJBANAszwEUeU1cjf6vPTxrLOzcVLZSdgr3NBe8IAUtE46jL3rdfWlQ\nAYPmXfmRynLk8hZM3LgJFM1gO8JrFTJBp+MCQE3UUR76AfPFbP8dAz3oe7SFk93y\\n9fN1CqAkBv8nlZ5wngWrjDansdQyzZb9sh1HoBiiP+BQfvN2SSSYPyf0cMECQQC2\nkQV92fnDyc7Rs9eNXCTLGTPFra3OUhvCUP736x9CsYRbSVHKARtDFM4HqD8W4ggZ\\nXJEZaQVwU9w01fqB16inAkBW5FWZixHCqHrDHMKevB+VRGtr94s0yOAxUZPPEAT/\nwIBs4GGlzYk6sPgp8vMOHCtoox2JjzzgiZCsU2HObLS/\\n-----END RSA PRIVATE KEY-----\n-----BEGIN CERTIFICATE-----\\nMIIB8TCCAVoCCQCrK/E7Wz0CxTANBgkqhkiG9w0BAQUFADA9MQswCQYDVQQGEwJV\nUzELMAkGA1UECBMCVFgxITAfBgNVBAoTGEludGVybmV0IFdpZGdpdHMgUHR5IEx0\\nZDAeFw0xNjAyMjMxNzUxMzBaFw0xNzAyMjIxNzUxMzBaMD0xCzAJBgNVBAYTAlVT\\nMQswCQYDVQQIEwJUWDEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRk\\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC/G6eud0cQqqI729F+uxT1Zv1H\\nLpqz/qOc/3GjtZohNUyOCJK0goiiNwz9nNy62Q3iAknW/EP6TKNfiN1AFNsqECsx\\nOku0mUAyvERLeBfWpXVXTi277ml7KXoVhhDxPj3/PDsgyvrEsQ8e9/jDvkzovSKy\\nfMJa0shbi6gwzJr+awIDAQABMA0GCSqGSIb3DQEBBQUAA4GBAAQG+EhyuEQleHRg\\nuZZnGKIYbeODAWTY4UOVNjV2AItHWk/yPDbPoxhj9e1iC7JdKHgJTLaJw0JzLuXx\\nmPvyczvXfORsTv0Isc3JH71xhZ2GLX10rhQKBzIzud6CwopFmfdAAM0/z4gJ67JZ\\noAPJD828GizKayML5BIu3hQSufiy\\n-----END CERTIFICATE-----"

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
