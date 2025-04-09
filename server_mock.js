const WebSocket = require('ws');
const url = require('url');

// 创建 WebSocket 服务器，监听 8080 端口
const wss = new WebSocket.Server({ port: 8080 });

console.log('IMU 模拟 WebSocket 服务器已启动，监听端口 8080');

// 生成随机四元数
function generateRandomQuaternion() {
  // 生成随机欧拉角 (弧度)
  const roll = (Math.random() * 2 - 1) * Math.PI;
  const pitch = (Math.random() * 2 - 1) * Math.PI;
  const yaw = (Math.random() * 2 - 1) * Math.PI;
  
  // 欧拉角转四元数 (使用 ZYX 顺序)
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  
  const w = cr * cp * cy + sr * sp * sy;
  const x = sr * cp * cy - cr * sp * sy;
  const y = cr * sp * cy + sr * cp * sy;
  const z = cr * cp * sy - sr * sp * cy;
  
  return { x, y, z, w };
}

// 生成平滑变化的四元数
function generateSmoothQuaternion(prevQuaternion) {
  if (!prevQuaternion) {
    return generateRandomQuaternion();
  }
  
  // 添加小的随机变化
  const smoothFactor = 0.05; // 控制变化速度
  
  const deltaX = (Math.random() * 2 - 1) * smoothFactor;
  const deltaY = (Math.random() * 2 - 1) * smoothFactor;
  const deltaZ = (Math.random() * 2 - 1) * smoothFactor;
  
  let x = prevQuaternion.x + deltaX;
  let y = prevQuaternion.y + deltaY;
  let z = prevQuaternion.z + deltaZ;
  
  // 确保四元数是单位四元数
  const magnitude = Math.sqrt(x*x + y*y + z*z);
  if (magnitude > 0.9) { // 防止 w 变成虚数
    x /= magnitude / 0.9;
    y /= magnitude / 0.9;
    z /= magnitude / 0.9;
  }
  
  const w = Math.sqrt(1 - x*x - y*y - z*z);
  
  return { x, y, z, w };
}

// 生成随机位置
function generateRandomPosition() {
  return {
    x: (Math.random() * 2 - 1) * 5, // 范围 -5 到 5 米
    y: (Math.random() * 2 - 1) * 5,
    z: (Math.random() * 2 - 1) * 5
  };
}

// 生成平滑变化的位置
function generateSmoothPosition(prevPosition) {
  if (!prevPosition) {
    return generateRandomPosition();
  }
  
  // 添加小的随机变化
  const smoothFactor = 0.1; // 控制位置变化速度
  
  const deltaX = (Math.random() * 2 - 1) * smoothFactor;
  const deltaY = (Math.random() * 2 - 1) * smoothFactor;
  const deltaZ = (Math.random() * 2 - 1) * smoothFactor;
  
  // 边界检查，保持在 -5 到 5 的范围内
  let x = Math.max(-5, Math.min(5, prevPosition.x + deltaX));
  let y = Math.max(-5, Math.min(5, prevPosition.y + deltaY));
  let z = Math.max(-5, Math.min(5, prevPosition.z + deltaZ));
  
  return { x, y, z };
}

// 生成平滑变化的加速度计数据
function generateSmoothAccelerometer(prevAccel) {
  if (!prevAccel) {
    return {
      x: (Math.random() * 2 - 1) * 9.8, // 模拟重力加速度范围
      y: (Math.random() * 2 - 1) * 9.8,
      z: (Math.random() * 2 - 1) * 9.8
    };
  }
  
  // 添加小的随机变化
  const smoothFactor = 0.5; // 控制变化速度
  
  const deltaX = (Math.random() * 2 - 1) * smoothFactor;
  const deltaY = (Math.random() * 2 - 1) * smoothFactor;
  const deltaZ = (Math.random() * 2 - 1) * smoothFactor;
  
  // 边界检查，保持在合理范围内
  let x = Math.max(-20, Math.min(20, prevAccel.x + deltaX));
  let y = Math.max(-20, Math.min(20, prevAccel.y + deltaY));
  let z = Math.max(-20, Math.min(20, prevAccel.z + deltaZ));
  
  return { x, y, z };
}

// 生成平滑变化的陀螺仪数据
function generateSmoothGyroscope(prevGyro) {
  if (!prevGyro) {
    return {
      x: (Math.random() * 2 - 1) * 2, // 模拟角速度范围 (rad/s)
      y: (Math.random() * 2 - 1) * 2,
      z: (Math.random() * 2 - 1) * 2
    };
  }
  
  // 添加小的随机变化
  const smoothFactor = 0.2; // 控制变化速度
  
  const deltaX = (Math.random() * 2 - 1) * smoothFactor;
  const deltaY = (Math.random() * 2 - 1) * smoothFactor;
  const deltaZ = (Math.random() * 2 - 1) * smoothFactor;
  
  // 边界检查，保持在合理范围内
  let x = Math.max(-5, Math.min(5, prevGyro.x + deltaX));
  let y = Math.max(-5, Math.min(5, prevGyro.y + deltaY));
  let z = Math.max(-5, Math.min(5, prevGyro.z + deltaZ));
  
  return { x, y, z };
}

// 存储客户端连接
const clients = new Map();

// 当客户端连接时
wss.on('connection', (ws, req) => {
  // 解析URL参数
  const parsedUrl = url.parse(req.url, true);
  const { source, id } = parsedUrl.query;
  
  // 记录客户端信息
  const clientInfo = {
    id: id || 'unknown',
    source: source || 'unknown',
    ws: ws,
    interval: null,
    data: {
      quaternion: null,
      position: null,
      accelerometer: null,
      gyroscope: null
    }
  };
  
  // 将客户端添加到Map中
  const clientKey = `${clientInfo.source}_${clientInfo.id}`;
  clients.set(clientKey, clientInfo);
  
  console.log(`客户端已连接: source=${clientInfo.source}, id=${clientInfo.id}`);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'info',
    message: `已连接到IMU模拟服务器，ID: ${clientInfo.id}`
  }));
  
  // 如果是可视化客户端，开始发送模拟数据
  if (source === 'imu_visualizer') {
    // 每 100ms 发送一次数据
    clientInfo.interval = setInterval(() => {
      // 更新模拟数据
      clientInfo.data.quaternion = generateSmoothQuaternion(clientInfo.data.quaternion);
      clientInfo.data.position = generateSmoothPosition(clientInfo.data.position);
      clientInfo.data.accelerometer = generateSmoothAccelerometer(clientInfo.data.accelerometer);
      clientInfo.data.gyroscope = generateSmoothGyroscope(clientInfo.data.gyroscope);
      
      // 创建 IMU 数据包
      const imuData = {
        timestamp: Date.now(),
        quaternion: clientInfo.data.quaternion,
        position: clientInfo.data.position,
        accelerometer: clientInfo.data.accelerometer,
        gyroscope: clientInfo.data.gyroscope,
      };
      
      // 发送数据给客户端
      ws.send(JSON.stringify(imuData));
    }, 100);
  }
  
  // 当客户端断开连接时
  ws.on('close', () => {
    console.log(`客户端已断开连接: source=${clientInfo.source}, id=${clientInfo.id}`);
    
    // 清除定时器
    if (clientInfo.interval) {
      clearInterval(clientInfo.interval);
    }
    
    // 从Map中移除客户端
    clients.delete(clientKey);
  });
  
  // 处理客户端消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`收到客户端消息 [${clientInfo.source}:${clientInfo.id}]:`, data);
    } catch (error) {
      console.error('处理消息时出错:', error);
    }
  });
});

// 处理服务器错误
wss.on('error', (error) => {
  console.error('WebSocket服务器错误:', error);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('正在关闭服务器...');
  
  // 关闭所有客户端连接
  for (const [key, client] of clients.entries()) {
    if (client.interval) {
      clearInterval(client.interval);
    }
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.close();
    }
  }
  
  wss.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});