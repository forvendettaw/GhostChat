"use strict";
/**
 * TURN 服务器连接测试工具
 * 用于诊断 TURN 服务器是否可达
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAllTURNServers = testAllTURNServers;
exports.detectNetworkEnvironment = detectNetworkEnvironment;
exports.printDiagnosticReport = printDiagnosticReport;
/**
 * 测试单个 TURN 服务器的可达性
 */
function testTURNServer(url_1) {
    return __awaiter(this, arguments, void 0, function (url, timeout) {
        var startTime;
        if (timeout === void 0) { timeout = 5000; }
        return __generator(this, function (_a) {
            startTime = Date.now();
            return [2 /*return*/, new Promise(function (resolve) {
                    var timer = setTimeout(function () {
                        resolve({
                            url: url,
                            reachable: false,
                            error: "Timeout after ".concat(timeout, "ms")
                        });
                    }, timeout);
                    // 创建一个测试 RTCPeerConnection
                    var pc = new RTCPeerConnection({
                        iceServers: [{ urls: url }]
                    });
                    // 监听 ICE 候选收集
                    var candidateFound = false;
                    pc.onicecandidate = function (event) {
                        if (event.candidate) {
                            var type = event.candidate.candidateType;
                            var candidateUrl = event.candidate.url || event.candidate.address || '';
                            console.log("[TURN-TEST] Candidate for ".concat(url, ":"), type, candidateUrl);
                            if (type === 'relay' || (candidateUrl.includes(url) && type !== 'host')) {
                                candidateFound = true;
                                clearTimeout(timer);
                                pc.close();
                                resolve({
                                    url: url,
                                    reachable: true,
                                    latency: Date.now() - startTime
                                });
                            }
                        }
                        else {
                            // 收集完成
                            clearTimeout(timer);
                            pc.close();
                            if (!candidateFound) {
                                resolve({
                                    url: url,
                                    reachable: false,
                                    error: 'No relay candidate gathered (TURN may be unreachable)'
                                });
                            }
                        }
                    };
                    // 创建 offer 触发 ICE 收集
                    pc.createOffer()
                        .then(function (offer) { return pc.setLocalDescription(offer); })
                        .catch(function (err) {
                        clearTimeout(timer);
                        pc.close();
                        resolve({
                            url: url,
                            reachable: false,
                            error: (err === null || err === void 0 ? void 0 : err.message) || 'Failed to create offer'
                        });
                    });
                    // 错误处理
                    pc.oniceconnectionstatechange = function () {
                        if (pc.iceConnectionState === 'failed') {
                            clearTimeout(timer);
                            pc.close();
                            resolve({
                                url: url,
                                reachable: false,
                                error: 'ICE connection failed'
                            });
                        }
                    };
                })];
        });
    });
}
/**
 * 测试所有 TURN 服务器
 */
function testAllTURNServers(servers) {
    return __awaiter(this, void 0, void 0, function () {
        var results, _i, servers_1, server, urls, _a, urls_1, url, result, status_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('[TURN-TEST] 开始测试 TURN 服务器...');
                    results = [];
                    _i = 0, servers_1 = servers;
                    _b.label = 1;
                case 1:
                    if (!(_i < servers_1.length)) return [3 /*break*/, 6];
                    server = servers_1[_i];
                    urls = Array.isArray(server.urls) ? server.urls : [server.urls];
                    _a = 0, urls_1 = urls;
                    _b.label = 2;
                case 2:
                    if (!(_a < urls_1.length)) return [3 /*break*/, 5];
                    url = urls_1[_a];
                    if (url.includes('stun:')) {
                        // 跳过 STUN 服务器（仅用于发现，不中继流量）
                        return [3 /*break*/, 4];
                    }
                    console.log("[TURN-TEST] \u6D4B\u8BD5 ".concat(url, "..."));
                    return [4 /*yield*/, testTURNServer(url)];
                case 3:
                    result = _b.sent();
                    results.push(result);
                    status_1 = result.reachable ? "\u2705 ".concat(result.latency, "ms") : "\u274C ".concat(result.error);
                    console.log("[TURN-TEST] ".concat(url, ": ").concat(status_1));
                    _b.label = 4;
                case 4:
                    _a++;
                    return [3 /*break*/, 2];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    console.log('[TURN-TEST] 测试完成');
                    return [2 /*return*/, results];
            }
        });
    });
}
/**
 * 检测网络环境
 */
function detectNetworkEnvironment() {
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return {
        isMobile: isMobile,
        connectionType: (conn === null || conn === void 0 ? void 0 : conn.type) || 'unknown',
        effectiveType: (conn === null || conn === void 0 ? void 0 : conn.effectiveType) || 'unknown',
        saveData: (conn === null || conn === void 0 ? void 0 : conn.saveData) || false,
        rtt: conn === null || conn === void 0 ? void 0 : conn.rtt,
        downlink: conn === null || conn === void 0 ? void 0 : conn.downlink
    };
}
/**
 * 在浏览器控制台打印诊断报告
 */
function printDiagnosticReport() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║         GhostChat 网络诊断报告                ║');
    console.log('╚════════════════════════════════════════════════╝');
    var netInfo = detectNetworkEnvironment();
    console.log('\n📱 网络环境：');
    console.log("   - \u8BBE\u5907\u7C7B\u578B: ".concat(netInfo.isMobile ? '移动端' : '桌面端'));
    console.log("   - \u8FDE\u63A5\u7C7B\u578B: ".concat(netInfo.connectionType));
    console.log("   - \u6709\u6548\u5E26\u5BBD: ".concat(netInfo.effectiveType));
    console.log("   - \u8282\u7701\u6570\u636E: ".concat(netInfo.saveData ? '是' : '否'));
    if (netInfo.rtt)
        console.log("   - \u5F80\u8FD4\u65F6\u5EF6: ".concat(netInfo.rtt, "ms"));
    if (netInfo.downlink)
        console.log("   - \u4E0B\u884C\u5E26\u5BBD: ".concat(netInfo.downlink, "Mbps"));
    console.log('\n🌐 WebRTC 支持：');
    console.log("   - RTCPeerConnection: ".concat(typeof RTCPeerConnection !== 'undefined' ? '✅' : '❌'));
    console.log("   - WebSocket: ".concat(typeof WebSocket !== 'undefined' ? '✅' : '❌'));
    console.log('\n💡 常见问题：');
    console.log('   1. 双方都开 VPN → 关闭至少一方的 VPN');
    console.log('   2. 防火墙阻止 → 关闭防火墙或使用移动热点');
    console.log('   3. TURN 服务器故障 → 使用内置 TURN 测试工具');
    console.log('   4. 移动网络不稳定 → 改用 WiFi');
    console.log('\n🔧 快速修复：');
    console.log('   - 双方都关闭 VPN');
    console.log('   - 双方都使用 WiFi');
    console.log('   - 刷新页面重试');
    console.log('   - 等待 2 分钟让 ICE 收集完成');
}
