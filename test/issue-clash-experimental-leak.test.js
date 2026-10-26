import { describe, it, expect } from 'vitest';
import { SingboxConfigBuilder } from '../src/builders/SingboxConfigBuilder.js';

describe('Clash experimental options leak prevention (issue unknown field quic-go-disable-gso)', () => {
    it('completely strips Clash Meta experimental fields like quic-go-disable-gso when converting to sing-box', async () => {
        const clashYamlWithMetaExperimental = `
port: 7890
socks-port: 7891
mixed-port: 7890
allow-lan: true
mode: rule
log-level: info
ipv6: false
external-controller: 0.0.0.0:9090
secret: "test-secret"
tun:
  enable: true
  stack: system
experimental:
  quic-go-disable-gso: true
  quic-go-disable-ecn: true
  sniff-tls-sni: true
  dialer-proxy: true
  fingerprint: chrome
dns:
  enable: true
  listen: 0.0.0.0:1053
  enhanced-mode: fake-ip
  nameserver:
    - 223.5.5.5
  fallback:
    - 8.8.8.8
proxies:
  - name: "HK Trojan Node"
    type: trojan
    server: hk.example.com
    port: 443
    password: "mypassword"
    skip-cert-verify: true
`;

        const builder = new SingboxConfigBuilder(
            clashYamlWithMetaExperimental,
            ['Private'],
            [],
            null,
            'zh-CN',
            'sing-box/1.15.0-alpha.13',
            false,
            false,
            undefined,
            undefined,
            '1.15'
        );

        const config = await builder.build();

        // 1. Verify Clash root fields are stripped
        expect(config['mixed-port']).toBeUndefined();
        expect(config.port).toBeUndefined();
        expect(config.mode).toBeUndefined();
        expect(config.tun).toBeUndefined();

        // 2. Verify Clash DNS fields are stripped
        expect(config.dns.enable).toBeUndefined();
        expect(config.dns['enhanced-mode']).toBeUndefined();
        expect(config.dns.nameserver).toBeUndefined();
        expect(config.dns.fallback).toBeUndefined();

        // 3. Verify Clash experimental fields are completely removed
        expect(config.experimental).toBeDefined();
        expect(config.experimental['quic-go-disable-gso']).toBeUndefined();
        expect(config.experimental['quic-go-disable-ecn']).toBeUndefined();
        expect(config.experimental['sniff-tls-sni']).toBeUndefined();
        expect(config.experimental['dialer-proxy']).toBeUndefined();
        expect(config.experimental.fingerprint).toBeUndefined();

        // 4. Verify cache_file is preserved or restored for Sing-box fakeip support
        expect(config.experimental.cache_file).toBeDefined();
        expect(config.experimental.cache_file.enabled).toBe(true);
        expect(config.experimental.cache_file.store_fakeip).toBe(true);

        // 5. Verify every key in config.experimental is strictly valid in Sing-box
        const validExperimentalKeys = ['cache_file', 'clash_api', 'v2ray_api', 'debug'];
        Object.keys(config.experimental).forEach(key => {
            expect(validExperimentalKeys.includes(key)).toBe(true);
        });

        // 6. Verify Trojan proxy was correctly converted
        const trojanOutbound = config.outbounds.find(o => o.tag === 'HK Trojan Node');
        expect(trojanOutbound).toBeDefined();
        expect(trojanOutbound.type).toBe('trojan');
        expect(trojanOutbound.tls.enabled).toBe(true);
    });

    it('sanitizes experimental.clash_api when Clash UI is enabled', async () => {
        const clashYaml = `
experimental:
  quic-go-disable-gso: true
  invalid_key: 123
proxies:
  - name: "HK Node"
    type: trojan
    server: hk.example.com
    port: 443
    password: "pw"
`;

        const builder = new SingboxConfigBuilder(
            clashYaml,
            ['Private'],
            [],
            null,
            'zh-CN',
            'sing-box/1.15.0-alpha.13',
            false,
            true, // enableClashUI
            '127.0.0.1:9090',
            undefined,
            '1.15'
        );

        const config = await builder.build();

        expect(config.experimental['quic-go-disable-gso']).toBeUndefined();
        expect(config.experimental.invalid_key).toBeUndefined();
        expect(config.experimental.clash_api).toBeDefined();
        expect(config.experimental.clash_api.external_controller).toBe('127.0.0.1:9090');
    });
});
