"use strict";
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
exports.debugInfo = void 0;
exports.initSimplePeer = initSimplePeer;
exports.connectSimplePeer = connectSimplePeer;
exports.sendSimplePeer = sendSimplePeer;
exports.destroySimplePeer = destroySimplePeer;
var simple_peer_1 = require("simple-peer");
var turn_config_1 = require("./turn-config");
var cloudflare_workers_pool_1 = require("./cloudflare-workers-pool");
var ws = null;
var myId = null;
var peer = null;
var remotePeerId = null;
var storedOnMessage = null;
var storedOnConnect = null;
var storedOnDisconnect = undefined;
var p2pEstablished = false; // 跟踪P2P连接是否真正建立过
var heartbeatInterval = null; // 心跳定时器
var reconnectAttempts = 0; // 重连尝试次数
var maxReconnectAttempts = 3; // 最大重连次数
var currentWorkerUrl = ''; // 当前 worker URL
var resolveConnection = null; // 保存连接 resolve 函数用于后台恢复
// 全局调试信息收集器
exports.debugInfo = [];
function addDebug(msg) {
    var timestamp = new Date().toLocaleTimeString();
    exports.debugInfo.push("[".concat(timestamp, "] ").concat(msg));
    if (exports.debugInfo.length > 50)
        exports.debugInfo.shift(); // 只保留最近 50 条
    console.log("[DEBUG] ".concat(msg));
}
// 将调试信息暴露到 window 对象，方便界面访问
if (typeof window !== 'undefined') {
    window.getDebugInfo = function () { return exports.debugInfo; };
    window.printDiagnosticReport = function () { return __awaiter(void 0, void 0, void 0, function () {
        var printDiagnosticReport;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./turn-test'); })];
                case 1:
                    printDiagnosticReport = (_a.sent()).printDiagnosticReport;
                    printDiagnosticReport();
                    return [2 /*return*/];
            }
        });
    }); };
    window.testTURNServers = function () { return __awaiter(void 0, void 0, void 0, function () {
        var getTURNServers, testAllTURNServers, results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./turn-config'); })];
                case 1:
                    getTURNServers = (_a.sent()).getTURNServers;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./turn-test'); })];
                case 2:
                    testAllTURNServers = (_a.sent()).testAllTURNServers;
                    console.log('🧪 开始测试 TURN 服务器...');
                    return [4 /*yield*/, testAllTURNServers(getTURNServers())];
                case 3:
                    results = _a.sent();
                    console.table(results);
                    return [2 /*return*/, results];
            }
        });
    }); };
}
// 保存 ID 到 localStorage，防止后台切换后 ID 丢失
function saveId(id) {
    try {
        localStorage.setItem('ghostchat_peer_id', id);
        localStorage.setItem('ghostchat_peer_id_timestamp', Date.now().toString());
        console.log('[SIMPLEPEER] 💾 ID 已保存到 localStorage:', id);
    }
    catch (e) {
        console.warn('[SIMPLEPEER] 无法保存 ID 到 localStorage:', e);
    }
}
// 从 localStorage 恢复 ID
function getSavedId() {
    try {
        var savedId = localStorage.getItem('ghostchat_peer_id');
        var timestamp = localStorage.getItem('ghostchat_peer_id_timestamp');
        if (savedId && timestamp) {
            var age = Date.now() - parseInt(timestamp);
            var maxAge = 5 * 60 * 1000; // 5分钟有效期
            if (age < maxAge) {
                console.log('[SIMPLEPEER] 📂 从 localStorage 恢复 ID:', savedId, "(\u5E74\u9F84: ".concat(Math.floor(age / 1000), "\u79D2)"));
                return savedId;
            }
            else {
                console.log('[SIMPLEPEER] 📂 保存的 ID 已过期，清除');
                localStorage.removeItem('ghostchat_peer_id');
                localStorage.removeItem('ghostchat_peer_id_timestamp');
            }
        }
    }
    catch (e) {
        console.warn('[SIMPLEPEER] 无法从 localStorage 读取 ID:', e);
    }
    return null;
}
// 启动 WebSocket 心跳，保持连接活跃
function startHeartbeat() {
    stopHeartbeat(); // 先清除之前的心跳
    // 移动端使用更短的心跳间隔（15秒），桌面端使用 20 秒
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var interval = isMobile ? 15000 : 20000;
    console.log('[SIMPLEPEER] Starting heartbeat (interval:', interval / 1000, 's)');
    heartbeatInterval = setInterval(function () {
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({ type: 'PING' }));
                console.log('[SIMPLEPEER] Sent PING to server');
            }
            catch (err) {
                console.error('[SIMPLEPEER] Error sending PING:', err);
                stopHeartbeat();
            }
        }
        else {
            console.log('[SIMPLEPEER] WebSocket not open, stopping heartbeat');
            stopHeartbeat();
        }
    }, interval);
}
// 停止心跳
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        console.log('[SIMPLEPEER] Heartbeat stopped');
    }
}
function tryConnectWorker(workerUrl, onMessage, onConnect, onDisconnect) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            storedOnMessage = onMessage;
            storedOnConnect = onConnect;
            storedOnDisconnect = onDisconnect;
            currentWorkerUrl = workerUrl;
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    // 优先使用保存的 ID，防止后台切换导致 ID 变化
                    var savedId = getSavedId();
                    myId = savedId || Math.random().toString(36).substr(2, 9);
                    if (savedId) {
                        addDebug("\uD83D\uDD04 \u4F7F\u7528\u4FDD\u5B58\u7684 ID: ".concat(myId));
                    }
                    else {
                        addDebug("\uD83C\uDD95 \u751F\u6210\u65B0 ID: ".concat(myId));
                    }
                    addDebug("\u6B63\u5728\u8FDE\u63A5\u4FE1\u4EE4\u670D\u52A1\u5668: ".concat(workerUrl));
                    console.log('[SIMPLEPEER] Trying worker:', workerUrl);
                    ws = new WebSocket("".concat(workerUrl, "?key=peerjs&id=").concat(myId, "&token=token"));
                    ws.onopen = function () {
                        addDebug("\u2705 WebSocket \u5DF2\u8FDE\u63A5\uFF0C\u6211\u7684 ID: ".concat(myId));
                        console.log('[SIMPLEPEER] WebSocket connected, ID:', myId);
                        // 连接成功后保存 ID
                        if (myId) {
                            saveId(myId);
                        }
                        resolve(myId);
                    };
                    ws.onmessage = function (event) {
                        try {
                            var msg = JSON.parse(event.data);
                            console.log('[SIMPLEPEER] Received message type:', msg.type, 'from:', msg.src);
                            if (msg.type === 'OPEN') {
                                console.log('[SIMPLEPEER] Server acknowledged');
                                // 立即发送第一个 PING，保持 WebSocket 连接活跃
                                try {
                                    if (ws && ws.readyState === WebSocket.OPEN) {
                                        ws.send(JSON.stringify({ type: 'PING' }));
                                        console.log('[SIMPLEPEER] Sent initial PING immediately');
                                    }
                                }
                                catch (err) {
                                    console.error('[SIMPLEPEER] Error sending initial PING:', err);
                                }
                                // 启动定期心跳
                                startHeartbeat();
                                return;
                            }
                            if (msg.type === 'PONG') {
                                console.log('[SIMPLEPEER] Received PONG from server');
                                return;
                            }
                            if (msg.type === 'SIGNAL' && msg.signal) {
                                var signalType = msg.signal.type || 'unknown';
                                console.log('[SIMPLEPEER] Signal received from:', msg.src, 'type:', signalType, 'peer exists:', !!peer);
                                addDebug("\uD83D\uDCE5 \u6536\u5230 signal: ".concat(signalType, "\uFF0C\u6765\u6E90: ").concat(msg.src));
                                if (!peer) {
                                    console.log('[SIMPLEPEER] Creating new peer for incoming connection from:', msg.src);
                                    addDebug("\uD83C\uDD95 \u521B\u5EFA\u65B0 peer\uFF08\u54CD\u5E94\u65B9\uFF09");
                                    remotePeerId = msg.src;
                                    // 移动端检测和配置
                                    var isMobile_1 = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                                    console.log('[SIMPLEPEER] Device type:', isMobile_1 ? 'MOBILE' : 'DESKTOP');
                                    var turnServers = (0, turn_config_1.getTURNServers)();
                                    console.log('[SIMPLEPEER] Creating peer (initiator: false)');
                                    console.log('[SIMPLEPEER] ICE transport policy:', isMobile_1 ? 'relay (mobile)' : 'all (desktop)');
                                    console.log('[SIMPLEPEER] ICE candidate pool size:', isMobile_1 ? 10 : 5);
                                    console.log('[SIMPLEPEER] ICE complete timeout:', isMobile_1 ? 60000 : 45000);
                                    console.log('[SIMPLEPEER] TURN servers:', turnServers.length);
                                    peer = new simple_peer_1.default({
                                        initiator: false,
                                        config: {
                                            iceServers: turnServers
                                        },
                                        trickle: true
                                    });
                                    setupPeer(peer, storedOnMessage, storedOnConnect, storedOnDisconnect, msg.src);
                                }
                                try {
                                    peer.signal(msg.signal);
                                    addDebug("\u2705 Signal \u5DF2\u5E94\u7528\u5230 peer");
                                    console.log('[SIMPLEPEER] Signal processed, peer state:', peer.connected ? 'connected' : 'connecting');
                                }
                                catch (signalErr) {
                                    addDebug("\u274C Signal \u5E94\u7528\u5931\u8D25: ".concat(signalErr));
                                    console.error('[SIMPLEPEER] Error applying signal:', signalErr);
                                }
                            }
                        }
                        catch (err) {
                            console.error('[SIMPLEPEER] Error processing message:', err);
                        }
                    };
                    ws.onerror = function (err) {
                        var _a, _b, _c;
                        // 详细的错误日志
                        var event = err;
                        console.error('[SIMPLEPEER] WebSocket error:', {
                            type: event.type,
                            target: (_a = event.target) === null || _a === void 0 ? void 0 : _a.url,
                            readyState: (_b = event.target) === null || _b === void 0 ? void 0 : _b.readyState,
                            bufferedAmount: (_c = event.target) === null || _c === void 0 ? void 0 : _c.bufferedAmount
                        });
                        // 移动端常见问题：网络切换导致 WebSocket 关闭
                        console.error('[SIMPLEPEER] Error details - 可能是移动端网络切换导致的连接断开');
                        reject(err);
                    };
                    ws.onclose = function (event) {
                        console.log('[SIMPLEPEER] WebSocket closed:', {
                            code: event.code,
                            reason: event.reason || 'none',
                            wasClean: event.wasClean,
                            p2pEstablished: p2pEstablished,
                            peerExists: !!peer,
                            peerConnected: (peer === null || peer === void 0 ? void 0 : peer.connected) || false
                        });
                        stopHeartbeat(); // 停止心跳
                        // 只有在 P2P 连接已建立的情况下才调用 disconnect
                        // 如果只是 WebSocket 关闭但 P2P 还没连接，不要触发 disconnect
                        if (p2pEstablished) {
                            console.log('[SIMPLEPEER] P2P was established, calling disconnect');
                            if (peer)
                                peer.destroy();
                            if (storedOnDisconnect)
                                storedOnDisconnect('peer-left');
                        }
                        else if (peer) {
                            // 如果 peer 存在但 P2P 未建立，说明连接尝试失败了
                            console.error('[SIMPLEPEER] WebSocket closed before P2P connection established');
                            peer.destroy();
                            if (storedOnDisconnect)
                                storedOnDisconnect('connection-failed');
                        }
                        else {
                            // 移动端自动重连：如果 WebSocket 关闭但 P2P 未建立，尝试重连
                            var isMobile_2 = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                            if (isMobile_2 && reconnectAttempts < maxReconnectAttempts) {
                                reconnectAttempts++;
                                console.log("[SIMPLEPEER] \u79FB\u52A8\u7AEF\u81EA\u52A8\u91CD\u8FDE (".concat(reconnectAttempts, "/").concat(maxReconnectAttempts, ")..."));
                                // 延迟后重连
                                setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var newId, err_1;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                _a.trys.push([0, 2, , 3]);
                                                console.log('[SIMPLEPEER] 尝试重新连接...');
                                                return [4 /*yield*/, tryConnectWorker(currentWorkerUrl, storedOnMessage, storedOnConnect, storedOnDisconnect)];
                                            case 1:
                                                newId = _a.sent();
                                                if (newId) {
                                                    console.log('[SIMPLEPEER] 重连成功!');
                                                    reconnectAttempts = 0; // 重置重连计数
                                                }
                                                return [3 /*break*/, 3];
                                            case 2:
                                                err_1 = _a.sent();
                                                console.error('[SIMPLEPEER] 重连失败:', err_1);
                                                return [3 /*break*/, 3];
                                            case 3: return [2 /*return*/];
                                        }
                                    });
                                }); }, 2000); // 2秒后重连
                            }
                            else if (!isMobile_2) {
                                console.log('[SIMPLEPEER] WebSocket closed but no peer created yet (desktop)');
                            }
                            else {
                                console.error('[SIMPLEPEER] 移动端重连已达最大次数，放弃重连');
                            }
                        }
                    };
                    // 移动端网络可能较慢，增加超时时间到 45 秒
                    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    var timeout = isMobile ? 45000 : 20000;
                    setTimeout(function () {
                        if ((ws === null || ws === void 0 ? void 0 : ws.readyState) !== WebSocket.OPEN) {
                            reject(new Error('Worker timeout'));
                        }
                    }, timeout);
                })];
        });
    });
}
function initSimplePeer(onMessage, onConnect, onDisconnect) {
    return __awaiter(this, void 0, void 0, function () {
        var currentWorker, id, err_2, nextWorker;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    (0, cloudflare_workers_pool_1.resetWorkerPool)();
                    reconnectAttempts = 0; // 重置重连计数
                    currentWorker = (0, cloudflare_workers_pool_1.getCurrentWorker)();
                    _a.label = 1;
                case 1:
                    if (!currentWorker) return [3 /*break*/, 6];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, tryConnectWorker(currentWorker, onMessage, onConnect, onDisconnect)];
                case 3:
                    id = _a.sent();
                    console.log('[SIMPLEPEER] Connected to worker:', currentWorker);
                    return [2 /*return*/, id];
                case 4:
                    err_2 = _a.sent();
                    console.warn('[SIMPLEPEER] Worker failed:', currentWorker, err_2);
                    // 标记当前 worker 为失败
                    (0, cloudflare_workers_pool_1.markWorkerFailed)();
                    nextWorker = (0, cloudflare_workers_pool_1.getNextWorker)();
                    if (!nextWorker) {
                        throw new Error('All Cloudflare Workers failed');
                    }
                    currentWorker = nextWorker;
                    return [3 /*break*/, 5];
                case 5: return [3 /*break*/, 1];
                case 6: throw new Error('No workers available');
            }
        });
    });
}
function setupPeer(p, onMessage, onConnect, onDisconnect, targetPeerId) {
    var disconnectCalled = false;
    var iceTimeout = null;
    var connectionTimeout = null;
    var eventLog = [];
    addDebug("\u23F3 setupPeer \u5DF2\u8C03\u7528");
    addDebug("\uD83D\uDCCB \u5F00\u59CB\u6CE8\u518C\u4E8B\u4EF6\u76D1\u542C\u5668...");
    var logEvent = function (eventName) {
        eventLog.push("".concat(eventName, " (").concat(new Date().toLocaleTimeString(), ")"));
        addDebug("\uD83D\uDCE8 \u4E8B\u4EF6: ".concat(eventName));
    };
    var callDisconnect = function (reason) {
        if (!disconnectCalled && onDisconnect) {
            disconnectCalled = true;
            addDebug("\u274C \u8FDE\u63A5\u65AD\u5F00: ".concat(reason));
            addDebug("\uD83D\uDCCA \u5DF2\u89E6\u53D1\u4E8B\u4EF6: ".concat(eventLog.join(', ')));
            if (iceTimeout)
                clearTimeout(iceTimeout);
            if (connectionTimeout)
                clearTimeout(connectionTimeout);
            onDisconnect(reason);
        }
    };
    // 注册所有可能的事件
    var events = ['signal', 'connect', 'close', 'error', 'data', 'pause', 'resume', 'iceStateChange', 'iceCandidate', 'negotiationNeeded'];
    events.forEach(function (eventName) {
        try {
            p.on(eventName, function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                if (eventName === 'signal') {
                    // signal 事件单独处理
                    return;
                }
                logEvent(eventName);
            });
        }
        catch (e) {
            addDebug("\u274C \u65E0\u6CD5\u6CE8\u518C\u4E8B\u4EF6 ".concat(eventName, ": ").concat(e));
        }
    });
    p.on('signal', function (signal) {
        logEvent('signal');
        var signalType = signal.type || 'unknown';
        addDebug("\uD83D\uDCE1 Signal \u4E8B\u4EF6\u89E6\u53D1: ".concat(signalType));
        if (signalType === 'offer') {
            var signalStr = JSON.stringify(signal);
            addDebug("\uD83D\uDCE4 \u53D1\u9001 offer (\u5927\u5C0F: ".concat(signalStr.length, " \u5B57\u8282)"));
        }
        else if (signalType === 'answer') {
            var signalStr = JSON.stringify(signal);
            addDebug("\uD83D\uDCE5 \u6536\u5230 answer (\u5927\u5C0F: ".concat(signalStr.length, " \u5B57\u8282)"));
        }
        else if (signalType === 'candidate') {
            var candidate = signal.candidate;
            if (candidate) {
                // 解析 candidate 获取详细信息
                addDebug("\uD83E\uDDCA ICE candidate \u539F\u59CB\u6570\u636E: ".concat(candidate.substring(0, 150), "..."));
            }
            else {
                addDebug("\uD83E\uDDCA ICE candidate: null (\u6536\u96C6\u5B8C\u6210)");
            }
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
            var dst = targetPeerId || remotePeerId || 'unknown';
            console.log('[SIMPLEPEER] Sending signal to:', dst, 'type:', signal.type || 'candidate', 'myId:', myId);
            var message = JSON.stringify({
                type: 'SIGNAL',
                src: myId,
                dst: dst,
                signal: signal
            });
            console.log('[SIMPLEPEER] Message payload:', message);
            ws.send(message);
        }
        else {
            console.error('[SIMPLEPEER] Cannot send signal - WebSocket not ready. State:', ws === null || ws === void 0 ? void 0 : ws.readyState);
        }
    });
    // 重新注册具体的事件处理器（覆盖上面的通用注册）
    p.on('connect', function () {
        logEvent('connect');
        addDebug("\uD83C\uDF89 P2P \u8FDE\u63A5\u6210\u529F\uFF01");
        console.log('[SIMPLEPEER] P2P connected successfully');
        p2pEstablished = true; // 标记P2P连接已建立
        if (iceTimeout)
            clearTimeout(iceTimeout);
        if (connectionTimeout)
            clearTimeout(connectionTimeout);
        onConnect(targetPeerId || remotePeerId || undefined);
        var pc = p._pc;
        if (pc) {
            pc.oniceconnectionstatechange = function () {
                var state = pc.iceConnectionState;
                console.log('[SIMPLEPEER] ICE connection state:', state);
                addDebug("\uD83E\uDDCA ICE \u72B6\u6001\u53D8\u5316: ".concat(state));
                if (state === 'disconnected' || state === 'failed') {
                    console.error('[SIMPLEPEER] ICE failed or disconnected');
                    console.error('[SIMPLEPEER] This usually means:');
                    console.error('[SIMPLEPEER] - Both devices are behind VPNs/NAT');
                    console.error('[SIMPLEPEER] - TURN servers are unreachable');
                    console.error('[SIMPLEPEER] - Firewall is blocking UDP/TCP ports');
                    callDisconnect('peer-left');
                }
                else if (state === 'connected') {
                    console.log('[SIMPLEPEER] ICE connected successfully!');
                    addDebug("\u2705 ICE \u8FDE\u63A5\u6210\u529F\uFF01");
                    // 获取选中的 ICE 候选
                    var stats = pc.getStats();
                    stats.then(function (statsReport) {
                        statsReport.forEach(function (report) {
                            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                                console.log('[SIMPLEPEER] Selected candidate pair:', report);
                            }
                            if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
                                console.log('[SIMPLEPEER]', report.type, ':', report.candidateType, report.protocol, report.address);
                            }
                        });
                    }).catch(function (e) { return console.log('[SIMPLEPEER] Could not get stats:', e); });
                }
            };
            pc.onicegatheringstatechange = function () {
                var state = pc.iceGatheringState;
                console.log('[SIMPLEPEER] ICE gathering state:', state);
                addDebug("\uD83D\uDD04 ICE \u6536\u96C6\u72B6\u6001: ".concat(state));
            };
            pc.onconnectionstatechange = function () {
                var state = pc.connectionState;
                console.log('[SIMPLEPEER] Connection state:', state);
                addDebug("\uD83D\uDD17 WebRTC \u8FDE\u63A5\u72B6\u6001: ".concat(state));
                if (state === 'failed') {
                    console.error('[SIMPLEPEER] Connection failed - check browser console for ICE errors');
                }
            };
            // 添加详细的 ICE 候选收集日志
            var candidateCount_1 = 0;
            var candidateTypes_1 = { host: 0, srflx: 0, relay: 0, prflx: 0 };
            var iceGatheringTimeout_1 = null;
            addDebug("\uD83D\uDCCD \u5F00\u59CB ICE \u5019\u9009\u6536\u96C6...");
            // ICE 收集超时检测（移动端可能需要很长时间）
            var isMobile_3 = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            iceGatheringTimeout_1 = setTimeout(function () {
                var _a, _b, _c, _d;
                if (candidateCount_1 === 0) {
                    addDebug("\u26A0\uFE0F ICE \u6536\u96C6\u8D85\u65F6\uFF08".concat(isMobile_3 ? 60 : 30, "\u79D2\uFF09\uFF0C\u672A\u6536\u96C6\u5230\u4EFB\u4F55\u5019\u9009"));
                    console.warn('[SIMPLEPEER] ICE gathering timeout - no candidates collected');
                    addDebug("\uD83D\uDD0D \u8BCA\u65AD\u4FE1\u606F\uFF1A");
                    addDebug("  - \u79FB\u52A8\u7AEF: ".concat(isMobile_3));
                    addDebug("  - ICE \u670D\u52A1\u5668\u6570\u91CF: ".concat(((_c = (_b = (_a = p._pc) === null || _a === void 0 ? void 0 : _a.config) === null || _b === void 0 ? void 0 : _b.iceServers) === null || _c === void 0 ? void 0 : _c.length) || 'unknown'));
                    addDebug("  - \u7F51\u7EDC\u7C7B\u578B: ".concat(((_d = (navigator.connection)) === null || _d === void 0 ? void 0 : _d.effectiveType) || 'unknown'));
                }
            }, isMobile_3 ? 60000 : 30000);
            pc.onicecandidate = function (event) {
                if (event.candidate) {
                    candidateCount_1++;
                    var type = event.candidate.candidateType || 'unknown';
                    var protocol = event.candidate.protocol || 'unknown';
                    var address = event.candidate.address || 'unknown';
                    var port = event.candidate.port || 'unknown';
                    console.log("[SIMPLEPEER] ICE candidate #".concat(candidateCount_1, ":"), type, protocol, "".concat(address, ":").concat(port));
                    addDebug("\uD83E\uDDCA ICE \u5019\u9009 #".concat(candidateCount_1, ": ").concat(type, " ").concat(protocol, " ").concat(address, ":").concat(port));
                    if (type === 'relay') {
                        candidateTypes_1.relay++;
                        console.log('[SIMPLEPEER] ✓ Using TURN relay (good for VPN!)');
                        addDebug("\u2713 \u4F7F\u7528 TURN \u4E2D\u7EE7\uFF01");
                    }
                    else if (type === 'srflx') {
                        candidateTypes_1.srflx++;
                        console.log('[SIMPLEPEER] ✓ Server reflexive (STUN succeeded)');
                        addDebug("\u2713 STUN \u6210\u529F");
                    }
                    else if (type === 'host') {
                        candidateTypes_1.host++;
                        console.log('[SIMPLEPEER] ℹ Host candidate (local IP)');
                        addDebug("\u2139 \u4E3B\u673A\u5019\u9009");
                    }
                    else if (type === 'prflx') {
                        candidateTypes_1.prflx++;
                        console.log('[SIMPLEPEER] ℹ Peer reflexive');
                        addDebug("\u2139 \u5BF9\u7B49\u53CD\u5C04");
                    }
                }
                else {
                    // 收集完成
                    if (iceGatheringTimeout_1)
                        clearTimeout(iceGatheringTimeout_1);
                    console.log("[SIMPLEPEER] ICE gathering complete (total: ".concat(candidateCount_1, " candidates)"));
                    addDebug("\u2705 ICE \u6536\u96C6\u5B8C\u6210\uFF0C\u5171 ".concat(candidateCount_1, " \u4E2A\u5019\u9009"));
                    addDebug("\uD83D\uDCCA \u5019\u9009\u7C7B\u578B\u7EDF\u8BA1\uFF1A");
                    addDebug("  - host (\u672C\u5730): ".concat(candidateTypes_1.host));
                    addDebug("  - srflx (STUN): ".concat(candidateTypes_1.srflx));
                    addDebug("  - relay (TURN): ".concat(candidateTypes_1.relay));
                    addDebug("  - prflx (\u5BF9\u7B49\u53CD\u5C04): ".concat(candidateTypes_1.prflx));
                    if (candidateCount_1 === 0) {
                        console.error('[SIMPLEPEER] No ICE candidates gathered - check network!');
                        addDebug("\u274C \u672A\u6536\u96C6\u5230\u4EFB\u4F55 ICE \u5019\u9009\uFF01");
                    }
                    else if (candidateTypes_1.relay === 0 && candidateTypes_1.srflx === 0) {
                        addDebug("\u26A0\uFE0F \u53EA\u6709\u672C\u5730\u5019\u9009\uFF08host\uFF09\uFF0C\u65E0\u6CD5\u7A7F\u900F NAT\uFF01");
                        addDebug("\uD83D\uDCA1 \u5EFA\u8BAE\uFF1A\u68C0\u67E5 TURN \u670D\u52A1\u5668\u6216\u5173\u95ED VPN");
                    }
                    else if (candidateTypes_1.relay > 0) {
                        addDebug("\u2705 \u6709 TURN \u5019\u9009\uFF0C\u5373\u4F7F P2P \u5931\u8D25\u4E5F\u80FD\u901A\u8FC7\u4E2D\u7EE7\u8FDE\u63A5");
                    }
                }
            };
        }
    });
    p.on('data', function (data) {
        logEvent('data');
        onMessage('remote', data.toString());
    });
    p.on('close', function () {
        logEvent('close');
        console.log('[SIMPLEPEER] P2P closed gracefully');
        callDisconnect('peer-left');
    });
    p.on('error', function (err) {
        logEvent('error');
        var errMsg = (err === null || err === void 0 ? void 0 : err.message) || (err === null || err === void 0 ? void 0 : err.toString()) || '';
        addDebug("\u274C Peer \u9519\u8BEF: ".concat(errMsg));
        addDebug("\uD83D\uDCCB \u9519\u8BEF\u5806\u6808: ".concat((err === null || err === void 0 ? void 0 : err.stack) || '无堆栈'));
        console.error('[SIMPLEPEER] P2P error:', err);
        if (errMsg.includes('Ice connection failed')) {
            callDisconnect('peer-left');
        }
        else {
            callDisconnect('network-error');
        }
    });
    // 设置 ICE 连接超时（移动端需要更长时间）
    // GitHub 研究显示移动端 + VPN 需要 60-120 秒才能完成 ICE 收集
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var timeoutMs = isMobile ? 120000 : 45000; // 移动端 120 秒，桌面 45 秒
    addDebug("\u23F1\uFE0F \u8FDE\u63A5\u8D85\u65F6\u8BBE\u7F6E: ".concat(timeoutMs / 1000, " \u79D2 (\u79FB\u52A8\u7AEF: ").concat(isMobile, ")"));
    connectionTimeout = setTimeout(function () {
        if (!p.connected) {
            console.error('[SIMPLEPEER] Connection timeout after', timeoutMs / 1000, 'seconds');
            callDisconnect('connection-timeout');
        }
    }, timeoutMs);
}
function connectSimplePeer(targetPeerId, onMessage, onConnect, onDisconnect) {
    addDebug("\uD83D\uDD17 \u5F00\u59CB P2P \u8FDE\u63A5\uFF0C\u76EE\u6807 ID: ".concat(targetPeerId));
    console.log('[SIMPLEPEER] Connecting to:', targetPeerId);
    console.log('[SIMPLEPEER] WebSocket state:', ws === null || ws === void 0 ? void 0 : ws.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)');
    // 检查 WebSocket 是否已连接
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        addDebug("\u274C WebSocket \u672A\u5C31\u7EEA! State: ".concat(ws === null || ws === void 0 ? void 0 : ws.readyState));
        console.error('[SIMPLEPEER] WebSocket not ready! State:', ws === null || ws === void 0 ? void 0 : ws.readyState);
        if (onDisconnect) {
            onDisconnect('network-error');
        }
        return;
    }
    remotePeerId = targetPeerId;
    // 移动端检测和配置
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('[SIMPLEPEER] Device type:', isMobile ? 'MOBILE' : 'DESKTOP');
    console.log('[SIMPLEPEER] My ID:', myId);
    console.log('[SIMPLEPEER] Target ID:', targetPeerId);
    var turnServers = (0, turn_config_1.getTURNServers)();
    addDebug("\uD83D\uDCE1 \u521B\u5EFA P2P \u8FDE\u63A5 (initiator: true)");
    addDebug("\uD83D\uDD04 ICE \u7B56\u7565: ".concat(isMobile ? 'relay (mobile)' : 'all (desktop)'));
    addDebug("\uD83C\uDF10 TURN \u670D\u52A1\u5668\u6570\u91CF: ".concat(turnServers.length));
    addDebug("\uD83D\uDCE6 ICE \u5019\u9009\u6C60\u5927\u5C0F: ".concat(isMobile ? 10 : 5));
    addDebug("\u23F1\uFE0F ICE \u8D85\u65F6: ".concat(isMobile ? 60000 : 45000, "ms"));
    console.log('[SIMPLEPEER] Creating peer (initiator: true)');
    console.log('[SIMPLEPEER] ICE transport policy:', isMobile ? 'relay (mobile)' : 'all (desktop)');
    console.log('[SIMPLEPEER] ICE candidate pool size:', isMobile ? 10 : 5);
    console.log('[SIMPLEPEER] ICE complete timeout:', isMobile ? 60000 : 45000);
    console.log('[SIMPLEPEER] TURN servers:', turnServers.length);
    turnServers.forEach(function (server, i) {
        var url = Array.isArray(server.urls) ? server.urls.join(', ') : server.urls;
        console.log("[SIMPLEPEER]   ".concat(i + 1, ". ").concat(url));
    });
    peer = new simple_peer_1.default({
        initiator: true,
        iceCompleteTimeout: isMobile ? 60000 : 45000, // 移动端 60 秒超时
        config: {
            iceServers: turnServers,
            iceCandidatePoolSize: isMobile ? 10 : 5, // 移动端收集更多候选
            iceTransportPolicy: isMobile ? 'relay' : 'all', // 移动端强制中继
            bundlePolicy: 'max-bundle', // 优化带宽
            rtcpMuxPolicy: 'require', // 优化连接
        },
        // 添加更多调试选项
        channelConfig: {},
        channelName: 'ghostchat',
        offerOptions: {
            offerToReceiveAudio: false,
            offerToReceiveVideo: false
        },
        // 移动端优化 - 合并 sdpTransform
        sdpTransform: function (sdp) {
            addDebug("\uD83D\uDCDC SDP Transform \u89E6\u53D1 (\u957F\u5EA6: ".concat(sdp.length, ")"));
            // 移除带宽限制
            return sdp.replace(/b=AS:\d+/g, '');
        }
    });
    addDebug("\u2705 Peer \u5BF9\u8C61\u5DF2\u521B\u5EFA");
    addDebug("\uD83D\uDCE6 Peer \u7C7B\u578B: SimplePeer");
    addDebug("\uD83D\uDD0D \u68C0\u67E5\u5185\u90E8 _pc \u5BF9\u8C61...");
    // 延迟检查 peer 内部状态
    setTimeout(function () {
        try {
            var internalPc_1 = peer._pc;
            if (internalPc_1) {
                addDebug("\u2705 \u5185\u90E8 RTCPeerConnection \u5B58\u5728");
                addDebug("\uD83D\uDD27 RTCPeerConnection \u72B6\u6001: ".concat(internalPc_1.connectionState || 'unknown'));
                addDebug("\uD83E\uDDCA ICE \u72B6\u6001: ".concat(internalPc_1.iceConnectionState || 'unknown'));
                addDebug("\uD83D\uDCE6 ICE \u6536\u96C6\u72B6\u6001: ".concat(internalPc_1.iceGatheringState || 'unknown'));
                // 检查所有属性
                var properties = ['localDescription', 'remoteDescription', 'currentLocalDescription', 'currentRemoteDescription'];
                properties.forEach(function (prop) {
                    var value = internalPc_1[prop];
                    var hasValue = value ? '✓' : '✗';
                    addDebug("  ".concat(hasValue, " ").concat(prop, ": ").concat(value ? '已设置' : '未设置'));
                });
            }
            else {
                addDebug("\u274C \u5185\u90E8 RTCPeerConnection \u4E0D\u5B58\u5728\uFF01");
            }
        }
        catch (e) {
            addDebug("\u274C \u68C0\u67E5 peer \u5185\u90E8\u72B6\u6001\u51FA\u9519: ".concat(e));
        }
    }, 500);
    setupPeer(peer, onMessage, onConnect, onDisconnect, targetPeerId);
}
function sendSimplePeer(data) {
    if (peer) {
        peer.send(data);
    }
}
function destroySimplePeer() {
    stopHeartbeat(); // 停止心跳
    peer === null || peer === void 0 ? void 0 : peer.destroy();
    ws === null || ws === void 0 ? void 0 : ws.close();
    peer = null;
    ws = null;
    myId = null;
    remotePeerId = null;
    storedOnMessage = null;
    storedOnConnect = null;
    storedOnDisconnect = undefined;
    p2pEstablished = false; // 重置P2P连接标志
    reconnectAttempts = 0; // 重置重连计数
    currentWorkerUrl = ''; // 清空 worker URL
    // 清除保存的 ID（用户主动退出时）
    try {
        localStorage.removeItem('ghostchat_peer_id');
        localStorage.removeItem('ghostchat_peer_id_timestamp');
        console.log('[SIMPLEPEER] 🗑️ 已清除保存的 ID');
    }
    catch (e) {
        // ignore
    }
}
// 页面可见性检测 - 当从后台恢复时检查连接状态
if (typeof document !== 'undefined') {
    var wasHidden_1 = false;
    document.addEventListener('visibilitychange', function () {
        var isHidden = document.hidden;
        if (isHidden) {
            // 页面进入后台
            wasHidden_1 = true;
            addDebug("\uD83C\uDF11 \u9875\u9762\u8FDB\u5165\u540E\u53F0");
            console.log('[SIMPLEPEER] Page hidden, connection may be suspended');
        }
        else if (wasHidden_1) {
            // 页面从后台恢复
            wasHidden_1 = false;
            addDebug("\u2600\uFE0F \u9875\u9762\u4ECE\u540E\u53F0\u6062\u590D");
            console.log('[SIMPLEPEER] Page visible again, checking connection...');
            // 检查 WebSocket 状态
            if (!ws || ws.readyState === WebSocket.CLOSED) {
                addDebug("\u274C WebSocket \u5DF2\u65AD\u5F00\uFF0C\u5C1D\u8BD5\u91CD\u8FDE...");
                console.log('[SIMPLEPEER] WebSocket closed, attempting to reconnect with saved ID...');
                // 尝试使用保存的 ID 重连
                var savedId = getSavedId();
                if (savedId && storedOnMessage && storedOnConnect && storedOnDisconnect) {
                    // 使用当前 worker URL 重连
                    tryConnectWorker(currentWorkerUrl, storedOnMessage, storedOnConnect, storedOnDisconnect)
                        .then(function (newId) {
                        addDebug("\u2705 \u91CD\u8FDE\u6210\u529F\uFF0CID: ".concat(newId));
                        console.log('[SIMPLEPEER] Reconnected with ID:', newId);
                    })
                        .catch(function (err) {
                        addDebug("\u274C \u91CD\u8FDE\u5931\u8D25: ".concat(err));
                        console.error('[SIMPLEPEER] Reconnect failed:', err);
                    });
                }
            }
            else if (ws && ws.readyState === WebSocket.OPEN) {
                addDebug("\u2705 WebSocket \u4ECD\u7136\u8FDE\u63A5\u6B63\u5E38");
                console.log('[SIMPLEPEER] WebSocket still connected');
            }
        }
    });
    console.log('[SIMPLEPEER] ✅ Page Visibility API 已启用');
}
