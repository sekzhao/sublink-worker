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
});
