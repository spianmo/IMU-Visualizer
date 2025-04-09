# IMU 可视化工具 (IMU Visualizer)

通过WebSocket接收IMU数据，用于实时显示和分析惯性测量单元(IMU)数据的强大可视化工具，包含Web可视化界面和Android数据采集上传客户端。

![image-20250409140959518](https://ai-1258209752.cos.ap-shanghai.myqcloud.com/blog/image-20250409140959518.png)

## 功能特性

- **实时数据可视化**：直观地展示来自IMU传感器的实时数据
- **多维数据展示**：同时显示加速度、角速度、磁力计等多种传感器数据
- **3D姿态可视化**：通过三维模型直观展示设备的空间姿态
- **数据记录与回放**：支持记录传感器数据并进行时序轨迹分析
- **跨平台支持**：提供Web可视化界面和Android数据采集客户端

## 系统组件

### Web可视化端

Web端提供了丰富的IMU数据可视化功能，基于React和Three.js构建：

- **6DOF IMU可视化**：实时显示设备的六自由度姿态和位置
- **3D模型渲染**：使用Three.js和React Three Fiber进行高性能3D渲染
- **轨迹显示**：支持显示IMU设备的历史运动轨迹
- **参数调整面板**：通过Leva控制面板，支持手动调整IMU姿态和位置参数
- **WebSocket通信**：实时接收来自IMU数据服务器的数据流
- **多设备管理**：支持同时连接和显示多个IMU设备的数据
- **自适应布局**：响应式设计，适配不同屏幕尺寸

#### 技术栈
- React.js
- Three.js 和 React Three Fiber
- WebSocket
- Leva (参数控制面板)
- D3.js (数据图表)

### Android数据采集客户端

Android客户端用于采集设备IMU传感器数据并实时上传到服务器：

- **实时数据采集**：采集设备的旋转矢量、加速度计和陀螺仪数据
- **WebSocket数据上传**：通过WebSocket协议实时上传IMU数据
- **四元数和位置显示**：在界面上实时显示当前的四元数和位置信息
- **设备配置**：支持自定义设备ID和服务器URL
- **连接状态指示**：直观显示与服务器的连接状态
- **低功耗运行**：优化的传感器采样策略，减少电池消耗

#### 技术栈
- Kotlin
- Android Jetpack (ViewModel, LiveData)
- DataBinding
- Android传感器API
- WebSocket实现
- 低通滤波器和积分算法

## 项目灵感

https://github.com/xioTechnologies/Gait-Tracking-With-x-IMU

https://github.com/andrewadare/imu-visualizer

[![3D Tracking with IMU](https://res.cloudinary.com/marcomontalbano/image/upload/v1744180918/video_to_markdown/images/youtube--6ijArKE8vKU-c05b58ac6eb4c4700831b2b3070cd403.jpg)](https://youtu.be/6ijArKE8vKU?si=AluGdJcCo6ELs7p6 "3D Tracking with IMU")

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

## 安装与使用

### Web可视化端

1. 克隆仓库并安装依赖
```bash
git clone https://github.com/yourusername/imu-visualizer.git
cd imu-visualizer
npm install
```

2. 启动Web服务
```bash
npm start
```

3. 启动数据转发服务器
```bash
node server_transport.js
```
4. 在浏览器中访问 `http://localhost:3000`

### Android客户端

1. 使用Android Studio打开 `IMU_Upload_Android` 目录
2. 构建并安装应用到Android设备
3. 在应用中配置服务器URL和设备ID
4. 点击"连接"按钮开始上传IMU数据


### 演示视频

<video src="https://ai-1258209752.cos.ap-shanghai.myqcloud.com/blog/%E5%BD%95%E5%B1%8F2025-04-09%2014.07.11.mov"></video>

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

本项目采用 AGPL-3.0 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件
