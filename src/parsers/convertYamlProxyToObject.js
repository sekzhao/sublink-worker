export function convertYamlProxyToObject(p) {
    if (!p || typeof p !== 'object' || !p.type) return null;
    const type = String(p.type).toLowerCase();
    const name = p.name || p.tag || 'proxy';
    const toArray = (value) => {
        if (value === undefined || value === null) return undefined;
        return Array.isArray(value) ? value : [value];
    };
    const toSinglePath = (value) => {
        if (value === undefined || value === null) return undefined;
        if (Array.isArray(value)) {
            return value.length > 0 ? String(value[0]) : '/';
        }
        return String(value);
    };
    const toStringSafe = (value) => {
        if (value === undefined || value === null) return undefined;
        return String(value);
    };
    const isIp = (str) => typeof str === 'string' && (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(str) || str.includes(':'));
    const resolveServerName = (explicitSni, server) => {
        if (explicitSni !== undefined && explicitSni !== null && String(explicitSni).trim() !== '') {
            return String(explicitSni).trim();
        }
        if (server && !isIp(String(server).trim())) {
            return String(server).trim();
        }
        return undefined;
    };
    switch (type) {
        case 'ss':
        case 'shadowsocks':
            return {
                tag: name,
                type: 'shadowsocks',
                server: p.server,
                server_port: parseInt(p.port),
                method: p.cipher || p.method,
                password: toStringSafe(p.password),
                network: 'tcp',
                tcp_fast_open: !!p['fast-open'],
                udp: typeof p.udp !== 'undefined' ? !!p.udp : undefined,
                plugin: p.plugin,
                plugin_opts: p['plugin-opts']
            };
        case 'vmess': {
            const tlsEnabled = typeof p.tls !== 'undefined'
                ? !!p.tls
                : (p.network === 'h2' || p.security === 'tls');
            const serverName = resolveServerName(p.servername || p.sni, p.server);
            const tls = tlsEnabled
                ? {
                    enabled: true,
                    ...(serverName ? { server_name: serverName } : {}),
                    insecure: !!p['skip-cert-verify']
                }
                : undefined;
            const transport = (() => {
                const net = p.network || p['network-type'];
                if (net === 'ws') {
                    const w = p['ws-opts'] || {};
                    return { type: 'ws', path: toSinglePath(w.path), headers: w.headers };
                }
                if (net === 'grpc') {
                    const g = p['grpc-opts'] || {};
                    return { type: 'grpc', service_name: g['grpc-service-name'] };
                }
                if (net === 'http') {
                    const h = p['http-opts'] || {};
                    return { type: 'http', method: h.method || 'GET', path: toSinglePath(h.path), headers: h.headers };
                }
                if (net === 'h2') {
                    const h2 = p['h2-opts'] || {};
                    return { type: 'h2', path: toSinglePath(h2.path), host: h2.host };
                }
                return undefined;
            })();
            return {
                tag: name,
                type: 'vmess',
                server: p.server,
                server_port: parseInt(p.port),
                uuid: toStringSafe(p.uuid),
                alter_id: typeof p.alterId !== 'undefined' ? parseInt(p.alterId) : 0,
                security: p.cipher || p.security || 'auto',
                network: transport?.type || p.network || 'tcp',
                tcp_fast_open: typeof p['fast-open'] !== 'undefined' ? !!p['fast-open'] : false,
                transport,
                tls,
                udp: typeof p.udp !== 'undefined' ? !!p.udp : undefined,
                packet_encoding: p['packet-encoding'],
                alpn: toArray(p.alpn)
            };
        }
        case 'vless': {
            const reality = p['reality-opts'];
            const tlsEnabled = typeof p.tls !== 'undefined'
                ? !!p.tls
                : (!!reality || p.security === 'tls' || p.security === 'reality');
            const serverName = resolveServerName(p.servername || p.sni, p.server);
            const tls = tlsEnabled
                ? {
                    enabled: true,
                    ...(serverName ? { server_name: serverName } : {}),
                    insecure: !!p['skip-cert-verify'],
                    ...(reality
                        ? { reality: { enabled: true, public_key: reality['public-key'], short_id: reality['short-id'] } }
                        : {})
                }
                : undefined;
            if (tls && p['client-fingerprint']) {
                tls.utls = {
                    enabled: true,
                    fingerprint: p['client-fingerprint']
                };
            }
            const transport = (() => {
                const net = p.network;
                if (net === 'ws') {
                    const w = p['ws-opts'] || {};
                    return { type: 'ws', path: toSinglePath(w.path), headers: w.headers };
                }
                if (net === 'grpc') {
                    const g = p['grpc-opts'] || {};
                    return { type: 'grpc', service_name: g['grpc-service-name'] };
                }
                if (net === 'http') {
                    const h = p['http-opts'] || {};
                    return { type: 'http', method: h.method || 'GET', path: toSinglePath(h.path), headers: h.headers };
                }
                if (net === 'h2') {
                    const h2 = p['h2-opts'] || {};
                    return { type: 'h2', path: toSinglePath(h2.path), host: h2.host };
                }
                return undefined;
            })();
            return {
                tag: name,
                type: 'vless',
                server: p.server,
                server_port: parseInt(p.port),
                uuid: toStringSafe(p.uuid),
                tcp_fast_open: typeof p['fast-open'] !== 'undefined' ? !!p['fast-open'] : false,
                tls,
                transport,
                network: transport?.type || 'tcp',
                flow: p.flow ?? undefined,
                udp: typeof p.udp !== 'undefined' ? !!p.udp : undefined,
                packet_encoding: p['packet-encoding'],
                alpn: toArray(p.alpn)
            };
        }
        case 'trojan': {
            const reality = p['reality-opts'];
            const serverName = resolveServerName(p.servername || p.sni, p.server);
            const tls = {
                enabled: true,
                ...(serverName ? { server_name: serverName } : {}),
                insecure: !!p['skip-cert-verify'],
                ...(reality
                    ? { reality: { enabled: true, public_key: reality['public-key'], short_id: reality['short-id'] } }
                    : {})
            };
            if (p['client-fingerprint']) {
                tls.utls = {
                    enabled: true,
                    fingerprint: p['client-fingerprint']
                };
            }
            if (p.alpn) {
                tls.alpn = toArray(p.alpn);
            }
            const transport = (() => {
                const net = p.network;
                if (net === 'ws') {
                    const w = p['ws-opts'] || {};
                    return { type: 'ws', path: toSinglePath(w.path), headers: w.headers };
                }
                if (net === 'grpc') {
                    const g = p['grpc-opts'] || {};
                    return { type: 'grpc', service_name: g['grpc-service-name'] };
                }
                if (net === 'http') {
                    const h = p['http-opts'] || {};
                    return { type: 'http', method: h.method || 'GET', path: toSinglePath(h.path), headers: h.headers };
                }
                if (net === 'h2') {
                    const h2 = p['h2-opts'] || {};
                    return { type: 'h2', path: toSinglePath(h2.path), host: h2.host };
                }
                return undefined;
            })();
            return {
                type: 'trojan',
                tag: name,
                server: p.server,
                server_port: parseInt(p.port),
                password: toStringSafe(p.password),
                network: transport?.type || p.network || 'tcp',
                tcp_fast_open: typeof p['fast-open'] !== 'undefined' ? !!p['fast-open'] : false,
                tls,
                transport,
                flow: p.flow ?? undefined,
                alpn: toArray(p.alpn)
            };
        }
        case 'hysteria2':
        case 'hysteria':
        case 'hy2': {
            const serverName = resolveServerName(p.sni || p.servername, p.server);
            const tls = {
                enabled: true,
                ...(serverName ? { server_name: serverName } : {}),
                insecure: !!p['skip-cert-verify']
            };
            const obfs = {};
            if (p.obfs) {
                obfs.type = p.obfs;
                obfs.password = p['obfs-password'];
            }
            const hopIntervalRaw = p['hop-interval'];
            const hopInterval = Number(hopIntervalRaw);
            return {
                tag: name,
                type: 'hysteria2',
                server: p.server,
                server_port: parseInt(p.port),
                password: toStringSafe(p.password),
                tls,
                obfs: Object.keys(obfs).length > 0 ? obfs : undefined,
                auth: p.auth,
                recv_window_conn: p['recv-window-conn'],
                up: p.up,
                down: p.down,
                ports: p.mport || p.ports,
                hop_interval: Number.isNaN(hopInterval) ? hopIntervalRaw : hopInterval,
                alpn: toArray(p.alpn),
                fast_open: typeof p['fast-open'] !== 'undefined' ? !!p['fast-open'] : undefined
            };
        }
        case 'tuic': {
            const serverName = resolveServerName(p.sni || p.servername, p.server);
            return {
                tag: name,
                type: 'tuic',
                server: p.server,
                server_port: parseInt(p.port),
                uuid: toStringSafe(p.uuid),
                password: toStringSafe(p.password),
                congestion_control: p['congestion-controller'] || p.congestion_control,
                tls: {
                    enabled: true,
                    ...(serverName ? { server_name: serverName } : {}),
                    alpn: toArray(p.alpn),
                    insecure: !!p['skip-cert-verify']
                },
                flow: p.flow ?? undefined,
                udp_relay_mode: p['udp-relay-mode'],
                zero_rtt: typeof p['zero-rtt'] !== 'undefined' ? !!p['zero-rtt'] : undefined,
                reduce_rtt: typeof p['reduce-rtt'] !== 'undefined' ? !!p['reduce-rtt'] : undefined,
                fast_open: typeof p['fast-open'] !== 'undefined' ? !!p['fast-open'] : undefined,
                disable_sni: typeof p['disable-sni'] !== 'undefined' ? !!p['disable-sni'] : undefined
            };
        }
        case 'anytls': {
            const serverName = resolveServerName(p.sni || p.servername, p.server);
            const tls = {
                enabled: true,
                ...(serverName ? { server_name: serverName } : {}),
                insecure: !!p['skip-cert-verify'],
                alpn: toArray(p.alpn)
            };
            if (p['client-fingerprint']) {
                tls.utls = {
                    enabled: true,
                    fingerprint: p['client-fingerprint']
                };
            }
            return {
                tag: name,
                type: 'anytls',
                server: p.server,
                server_port: parseInt(p.port),
                password: toStringSafe(p.password),
                udp: !!p.udp,
                'idle-session-check-interval': p['idle-session-check-interval'],
                'idle-session-timeout': p['idle-session-timeout'],
                'min-idle-session': p['min-idle-session'],
                tls
            };
        }
        default:
            return null;
    }
}
