#!/bin/bash

# SimplePeer 配置简化脚本

cd /Users/scott/GhostChat/GhostChat

echo "📝 开始简化 SimplePeer 配置..."

# 1. 备份当前文件
cp lib/peer-simplepeer.ts lib/peer-simplepeer.ts.backup

# 2. 简化发起方配置（第 620 行）
echo "🔧 简化发起方配置..."
sed -i '' '
  /addDebug(`📡 创建 P2P 连接 (initiator: true)`);/,/addDebug(`📡 创建 P2P 连接 (initiator: true)`);\
  /addDebug(`🔄 ICE 策略: ${isMobile ? '\''relay (mobile)'\' : '\''all (desktop)'\'' }`);/,/addDebug(`🌐 TURN 服务器数量: ${turnServers.length}`);\
  /addDebug(`📦 ICE 候选池大小: ${isMobile ? 10 : 5}`);/,/addDebug(`⏱️ ICE 超时: ${isMobile ? 60000 : 45000}ms`);\
  /console.log('\''[SIMPLEPEER] Device type:'\'',isMobile ? '\''MOBILE'\'' : '\''DESKTOP'\''/);/,/console.log('\''[SIMPLEPEER] ICE transport policy:'\'',isMobile ? '\''relay (mobile)'\'' : '\''all (desktop)'\''/);/,/console.log('\''[SIMPLEPEER] ICE candidate pool size:'\'',isMobile ? 10 : 5/);/,/console.log('\''[SIMPLEPEER] ICE complete timeout:'\'',isMobile ? 60000 : 45000/);\
  /console.log('\''[SIMPLEPEER] TURN servers:'\'',turnServers.length/);\
  /turnServers.forEach((server, i) => {/,/turnServers.forEach((server, i) => {/a\
  console.log(`[SIMPLEPEER]   ${i + 1}. ${url}`);\
  }/,/);\
/a\
  console.log(`[SIMPLEPEER]   ${i + 1}. ${url}`);\
  });/;\
/a\
  });
  peer = new SimplePeer({\
    initiator: true,\
    iceCompleteTimeout: isMobile ? 60000 : 45000,\
    config: {\
      iceServers: turnServers,\
      iceCandidatePoolSize: isMobile ? 10 : 5,\
      iceTransportPolicy: isMobile ? '\''relay'\'' : '\''all'\'',\
      bundlePolicy: '\''max-bundle'\'',\
      rtcpMuxPolicy: '\''require'\'',\
    },\
    channelConfig: {},\
    channelName: '\''ghostchat'\'',\
    offerOptions: {\
      offerToReceiveAudio: false,\
      offerToReceiveVideo: false\
    },\
    sdpTransform: (sdp) => {\
      addDebug(`📜 SDP Transform 触发（长度: ${sdp.length})`);\
      return sdp.replace(/b=AS:\\d+/g, '\'\'');\
    }\
  });
/a\
  peer = new SimplePeer({\
    initiator: true,\
    config: {\
      iceServers: turnServers\
    },\
    trickle: true\
  });
' lib/peer-simplepeer.ts

echo "✅ 发起方配置简化完成"

# 3. 简化响应方配置（第 199 行）
echo "🔧 简化响应方配置..."
sed -i '' '
  /peer = new SimplePeer({/,/peer = new SimplePeer({/a\
  initiator: false,\
  iceCompleteTimeout: isMobile ? 60000 : 45000,\
  config: {\
    iceServers: turnServers,\
    iceCandidatePoolSize: isMobile ? 10 : 5,\
    iceTransportPolicy: isMobile ? '\''relay'\'' : '\''all'\'',\
    bundlePolicy: '\''max-bundle'\'',\
    rtcpMuxPolicy: '\''require'\'',\
  },\
  sdpTransform: (sdp) => {\
    return sdp.replace(/b=AS:\\d+/g, '\'\'');\
  }\
});
/a\
  peer = new SimplePeer({\
    initiator: false,\
    config: {\
      iceServers: turnServers\
    },\
    trickle: true\
  });
' lib/peer-simplepeer.ts

echo "✅ 响应方配置简化完成"

# 4. 重新构建
echo "🔨 重新构建..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ 构建成功！"
  echo "📤 部署到 Cloudflare Pages..."
  npx wrangler pages deploy out --project-name=ghostchat --commit-dirty=true
  
  if [ $? -eq 0 ]; then
    echo "🎉 部署成功！"
    echo "🌐 访问: https://ghostchat-24o.pages.dev"
  else
    echo "❌ 部署失败"
    exit 1
  fi
else
  echo "❌ 构建失败"
  exit 1
fi
