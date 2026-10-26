import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { convertYamlProxyToObject } from '../src/parsers/convertYamlProxyToObject.js';
import { SingboxConfigBuilder } from '../src/builders/SingboxConfigBuilder.js';

describe('Trojan & TLS outbound nil pointer crash prevention', () => {
    it('ensures Trojan from Clash YAML always has tls.enabled = true and never tls.enabled = false', () => {
        const clashYaml = `
proxies:
  - name: "Trojan Node No TLS Tag"
    type: trojan
    server: hk01.trojan.com
    port: 443
    password: 12345678
    skip-cert-verify: true

  - name: "Trojan Node With IP"
    type: trojan
    server: 1.2.3.4
    port: 443
    password: "secretpassword"
    sni: mydomain.com

  - name: "VMess Plain TCP"
    type: vmess
    server: vmess.com
    port: 80
    uuid: 550e8400-e29b-41d4-a716-446655440000
    cipher: auto

  - name: "VLESS Reality No Explicit TLS Tag"
    type: vless
    server: vless.com
    port: 443
    uuid: 550e8400-e29b-41d4-a716-446655440001
    servername: apple.com
    reality-opts:
      public-key: abcd
      short-id: 1234
`;
        const parsed = yaml.load(clashYaml);
        const converted = parsed.proxies.map(p => convertYamlProxyToObject(p));

        const trojan1 = converted.find(p => p.tag === 'Trojan Node No TLS Tag');
        expect(trojan1.tls).toBeDefined();
        expect(trojan1.tls.enabled).toBe(true);
        expect(trojan1.tls.server_name).toBe('hk01.trojan.com');
        expect(trojan1.tls.insecure).toBe(true);

        const trojan2 = converted.find(p => p.tag === 'Trojan Node With IP');
        expect(trojan2.tls).toBeDefined();
        expect(trojan2.tls.enabled).toBe(true);
        expect(trojan2.tls.server_name).toBe('mydomain.com');

        const vmessPlain = converted.find(p => p.tag === 'VMess Plain TCP');
        expect(vmessPlain.tls).toBeUndefined();

        const vlessReality = converted.find(p => p.tag === 'VLESS Reality No Explicit TLS Tag');
        expect(vlessReality.tls).toBeDefined();
        expect(vlessReality.tls.enabled).toBe(true);
        expect(vlessReality.tls.reality.enabled).toBe(true);
    });

    it('SingboxConfigBuilder strips any disabled tls and enforces tls.enabled = true for trojan', async () => {
        const clashYaml = `
proxies:
  - name: "Trojan 01"
    type: trojan
    server: hk01.trojan.com
    port: 443
    password: 12345678

  - name: "VMess No TLS"
    type: vmess
    server: vmess.com
    port: 80
    uuid: 550e8400-e29b-41d4-a716-446655440000
`;
        const builder = new SingboxConfigBuilder(
            clashYaml,
            [],
            [],
            undefined,
            'zh-CN',
            'sing-box/1.15.0-alpha.13',
            false,
            false,
            undefined,
            undefined,
            '1.15'
        );
        const config = await builder.build();
        const trojanNode = config.outbounds.find(o => o.tag === 'Trojan 01');
        expect(trojanNode.tls).toBeDefined();
        expect(trojanNode.tls.enabled).toBe(true);

        const vmessNode = config.outbounds.find(o => o.tag === 'VMess No TLS');
        expect(vmessNode.tls).toBeUndefined();
    });

    it('reconciles rule-sets referenced in dns.rules such as geosite-cn to avoid rule-set not found error', async () => {
        const customTemplate = JSON.stringify({
            dns: {
                servers: [
                    { tag: 'dns-local', address: '223.5.5.5', detour: 'direct' },
                    { tag: 'dns-remote', address: 'tls://8.8.8.8', detour: 'select' }
                ],
                rules: [
                    { outbound: 'any', server: 'dns-local' },
                    { rule_set: 'geosite-cn', server: 'dns-local' },
                    { rule_set: ['geosite-geolocation-!cn'], server: 'dns-remote' }
                ]
            },
            route: {
                rules: []
            }
        });

        const builder = new SingboxConfigBuilder(
            `proxies:\n  - name: "Node 1"\n    type: trojan\n    server: hk.com\n    port: 443\n    password: pw\n`,
            ['Private'],
            [],
            customTemplate,
            'zh-CN',
            'sing-box/1.15.0-alpha.13',
            false,
            false,
            undefined,
            undefined,
            '1.15'
        );

        const config = await builder.build();

        // 1. Verify route.rule_set contains geosite-cn
        const geositeCnRuleSet = config.route.rule_set.find(rs => rs.tag === 'geosite-cn');
        expect(geositeCnRuleSet).toBeDefined();
        expect(geositeCnRuleSet.type).toBe('remote');
        expect(geositeCnRuleSet.format).toBe('binary');
        expect(geositeCnRuleSet.url).toContain('/geosite/cn.srs');

        // 2. Verify route.rule_set contains geosite-geolocation-!cn
        const nonCnRuleSet = config.route.rule_set.find(rs => rs.tag === 'geosite-geolocation-!cn');
        expect(nonCnRuleSet).toBeDefined();
        expect(nonCnRuleSet.url).toContain('/geosite/geolocation-!cn.srs');

        // 3. Verify every rule_set referenced in dns.rules exists in route.rule_set
        const routeRuleSetTags = new Set(config.route.rule_set.map(rs => rs.tag));
        config.dns.rules.forEach((rule, idx) => {
            if (Array.isArray(rule.rule_set)) {
                rule.rule_set.forEach(tag => {
                    expect(routeRuleSetTags.has(tag), `dns rule[${idx}] tag ${tag} must exist in route.rule_set`).toBe(true);
                });
            } else if (typeof rule.rule_set === 'string') {
                expect(routeRuleSetTags.has(rule.rule_set), `dns rule[${idx}] tag ${rule.rule_set} must exist in route.rule_set`).toBe(true);
            }
        });
    });
});
