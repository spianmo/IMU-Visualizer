const WebSocket = require('ws');
const url = require('url');

// 创建 WebSocket 服务器，监听 8081 端口
const wss = new WebSocket.Server({ port: 8080 });

console.log('IMU 数据转发服务器已启动，监听端口 8080');

// 创建peer连接池
const peerPool = {
  // 格式: { id: { id: string, sender: ws, receivers: [ws1, ws2, ...] } }
};

// 当客户端连接时
wss.on('connection', (ws, req) => {
  // 解析URL参数
  const parsedUrl = url.parse(req.url, true);
  const { source, id } = parsedUrl.query;
  
  if (!source || !id) {
    console.log('客户端连接缺少必要参数，关闭连接');
    ws.close(1008, '缺少必要参数 source 或 id');
    return;
  }
  
  console.log(`客户端已连接: source=${source}, id=${id}`);
  
  // 根据source类型处理连接
  if (source === 'imu_sender') {
    // 处理发送者连接
    handleSenderConnection(ws, id);
  } else if (source === 'imu_visualizer') {
    // 处理接收者连接
    handleReceiverConnection(ws, id);
  } else {
    console.log(`未知的source类型: ${source}`);
    ws.close(1008, '未知的source类型');
    return;
  }
  
  // 发送欢迎消息
//   ws.send(JSON.stringify({
//     type: 'info',
//     message: `已连接到IMU数据转发服务器，角色: ${source}, ID: ${id}`
//   }));
  
  // 当客户端断开连接时
  ws.on('close', () => {
    console.log(`客户端断开连接: source=${source}, id=${id}`);
    
    // 从连接池中移除
    if (source === 'imu_sender') {
      removeSender(id);
    } else if (source === 'imu_visualizer') {
      removeReceiver(ws, id);
    }
  });
  
  // 处理客户端消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // 检查是否为上传动作
      if (source === 'imu_sender') {
        console.log(`收到ID=${id}的上传数据:`, data.timestamp);
        
        // 转发数据给所有对应ID的接收者
        forwardToReceivers(id, message.toString());
      }
    } catch (error) {
      console.error('处理消息时出错:', error);
    }
  });
});

// 处理发送者连接
function handleSenderConnection(ws, id) {
  // 检查是否已存在该ID的发送者
  if (peerPool[id] && peerPool[id].sender) {
    console.log(`ID=${id}的发送者已存在，替换旧连接`);
    // 关闭旧连接
    peerPool[id].sender.close(1008, '被新连接替换');
  }
  
  // 创建或更新peer对象
  if (!peerPool[id]) {
    peerPool[id] = {
      id,
      sender: ws,
      receivers: []
    };
  } else {
    peerPool[id].sender = ws;
  }
  
  console.log(`ID=${id}的发送者已添加到连接池`);
}

// 处理接收者连接
function handleReceiverConnection(ws, id) {
  // 创建或更新peer对象
  if (!peerPool[id]) {
    peerPool[id] = {
      id,
      sender: null,
      receivers: [ws]
    };
  } else {
    // 添加到接收者列表
    peerPool[id].receivers.push(ws);
  }
  
  console.log(`ID=${id}的接收者已添加到连接池，当前接收者数量: ${peerPool[id].receivers.length}`);
}

// 移除发送者
function removeSender(id) {
  if (peerPool[id]) {
    peerPool[id].sender = null;
    
    // 如果没有接收者，则完全移除该ID
    if (peerPool[id].receivers.length === 0) {
      delete peerPool[id];
      console.log(`ID=${id}的peer对象已从连接池中移除`);
    } else {
      console.log(`ID=${id}的发送者已从连接池中移除，保留${peerPool[id].receivers.length}个接收者`);
    }
  }
}

// 移除接收者
function removeReceiver(ws, id) {
  if (peerPool[id]) {
    // 从接收者列表中移除
    const index = peerPool[id].receivers.indexOf(ws);
    if (index !== -1) {
      peerPool[id].receivers.splice(index, 1);
      console.log(`ID=${id}的一个接收者已从连接池中移除，剩余接收者: ${peerPool[id].receivers.length}`);
    }
    
    // 如果没有发送者和接收者，则完全移除该ID
    if (!peerPool[id].sender && peerPool[id].receivers.length === 0) {
      delete peerPool[id];
      console.log(`ID=${id}的peer对象已从连接池中移除`);
    }
  }
}

// 转发数据给接收者
function forwardToReceivers(id, message) {
  if (peerPool[id] && peerPool[id].receivers.length > 0) {
    let activeReceivers = 0;
    
    peerPool[id].receivers.forEach(receiver => {
      if (receiver.readyState === WebSocket.OPEN) {
        receiver.send(message);
        activeReceivers++;
      }
    });
    
    console.log(`数据已转发给ID=${id}的${activeReceivers}个接收者`);
  } else {
    console.log(`ID=${id}没有活跃的接收者，数据未转发`);
  }
}

// 定期清理断开的连接和空的peer对象
setInterval(() => {
  // 遍历所有peer对象
  Object.keys(peerPool).forEach(id => {
    const peer = peerPool[id];
    
    // 检查发送者连接状态
    if (peer.sender && peer.sender.readyState === WebSocket.CLOSED) {
      peer.sender = null;
    }
    
    // 过滤掉已关闭的接收者连接
    peer.receivers = peer.receivers.filter(receiver => 
      receiver.readyState !== WebSocket.CLOSED
    );
    
    // 如果没有发送者和接收者，则移除该peer对象
    if (!peer.sender && peer.receivers.length === 0) {
      delete peerPool[id];
      console.log(`清理: ID=${id}的peer对象已从连接池中移除`);
    }
  });
  
  // 输出当前连接池状态
  console.log(`连接池状态: ${Object.keys(peerPool).length}个peer对象`);
}, 30000);

// 处理服务器错误
wss.on('error', (error) => {
  console.error('WebSocket服务器错误:', error);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('正在关闭服务器...');
  wss.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});