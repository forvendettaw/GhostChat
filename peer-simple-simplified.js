// 临时简化版本的 peer-simplepeer.ts 响应方部分
// 将此内容替换到原文件中对应的位置

            peer = new SimplePeer({
              initiator: false,
              config: {
                iceServers: turnServers
              },
              trickle: true
            });