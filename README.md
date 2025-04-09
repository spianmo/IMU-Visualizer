# IMU 可视化工具 (IMU Visualizer)

通过WebSocket接收IMU数据，用于实时显示和分析惯性测量单元(IMU)数据的强大可视化工具。

![image-20250409140959518](https://ai-1258209752.cos.ap-shanghai.myqcloud.com/blog/image-20250409140959518.png)

## 功能特性

- **实时数据可视化**：直观地展示来自IMU传感器的实时数据
- **多维数据展示**：同时显示加速度、角速度、磁力计等多种传感器数据
- **3D姿态可视化**：通过三维模型直观展示设备的空间姿态
- **数据记录与回放**：支持记录传感器数据并进行时序轨迹分析

## 安装指南

### 前提条件
- Node.js (v18.0+)
- npm 或 yarn

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/yourusername/imu-visualizer.git
cd imu-visualizer
```

2. 安装依赖
```bash
npm install
# 或
yarn install
```

3. 启动应用
```bash
npm start
# 或
yarn start
```

### 演示视频

<video src="https://ai-1258209752.cos.ap-shanghai.myqcloud.com/blog/%E5%BD%95%E5%B1%8F2025-04-09%2014.07.11.mov"></video>

## IMU 数据格式规范

为便于第三方设备对接，本系统接收以下JSON格式的IMU数据：

```json
{
  "quaternion": {
    "x": -0.003953070845454931,
    "y": -0.021748308092355728,
    "z": -0.4098638892173767,
    "w": 0.9118788242340088
  },
  "position": {
    "x": -0.011915847659111023,
    "y": -0.31706252694129944,
    "z": 2.5383763313293457
  },
  "timestamp": 1744179182819
}
```

### 数据字段说明

- **quaternion**: 四元数表示的旋转姿态
  - `x`, `y`, `z`, `w`: 四元数的四个分量
- **position**: 三维空间中的位置信息
  - `x`, `y`, `z`: 三维坐标值，单位为米
- **timestamp**: 时间戳，表示数据采集时间，单位为毫秒(Unix时间戳)

## 数据传输与连接

本项目提供了WebSocket服务器用于IMU数据的实时传输，支持多设备连接和数据转发。

### 连接角色

系统支持两种连接角色：

1. **imu_sender**: IMU数据发送方，负责上传IMU传感器数据
2. **imu_visualizer**: 数据可视化方，接收并显示IMU数据

### 连接方式

WebSocket服务器默认运行在`ws://localhost:8080`，连接时需要提供以下查询参数：

- `source`: 连接角色，可选值为`imu_sender`或`imu_visualizer`
- `id`: 设备唯一标识符，用于关联发送方和接收方

#### 连接示例

```javascript
// IMU数据发送方
const ws = new WebSocket('ws://localhost:8080?source=imu_sender&id=device001');

// 数据可视化方
const ws = new WebSocket('ws://localhost:8080?source=imu_visualizer&id=device001');
```

### 数据发送示例

```javascript
// 发送IMU数据
ws.send(JSON.stringify({
  quaternion: {x: -0.003, y: -0.021, z: -0.409, w: 0.911},
  position: {x: -0.011, y: -0.317, z: 2.538},
  timestamp: Date.now()
}));
```

## 模拟工具

项目提供了两个辅助工具脚本：

1. **server_mock.js**: 用于模拟IMU数据，可以生成测试用的IMU数据流
2. **server_transport.js**: 维护WebSocket连接池，处理数据转发

### 启动模拟服务器

```bash
# 启动数据转发服务器
node server_transport.js

# 启动IMU数据模拟器
node server_mock.js
```


## 贡献指南

欢迎提交问题报告和功能请求！如果您想贡献代码：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件