import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Cone, Line } from '@react-three/drei';
import useWebSocket from 'react-use-websocket';
import { AxesHelper, Vector3, Euler, Quaternion } from 'three';
import { Leva, useControls, button } from 'leva';
import TrajectoryCard from './TrajectoryCard';
import Stats from 'stats.js';

// 扩展 Three.js 的 AxesHelper 到 R3F
extend({ AxesHelper });

// Stats性能监测组件
const StatsPanel = () => {
  const { gl } = useThree();
  
  useEffect(() => {
    const stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    
    // 设置样式，放在左下角
    stats.dom.style.cssText = 'position:absolute;bottom:0;left:0;';
    document.body.appendChild(stats.dom);
    
    // 添加到渲染循环
    const originalRender = gl.render;
    gl.render = function() {
      stats.begin();
      originalRender.apply(this, arguments);
      stats.end();
    };
    
    return () => {
      document.body.removeChild(stats.dom);
      gl.render = originalRender;
    };
  }, [gl]);
  
  return null;
};

// 坐标轴组件
const Axes = ({ length = 2 }) => {
  // 使用 Leva 创建控制面板
  const { axisWidth, coneSize } = useControls('坐标轴设置', {
    axisWidth: { value: 3, min: 1, max: 10, step: 1, label: '轴线粗细' },
    coneSize: { value: 0.1, min: 0.1, max: 0.5, step: 0.05, label: '箭头大小' }
  });

  return (
    <group>
      {/* X轴 - 红色 */}
      <Line 
        points={[[0, 0, 0], [length - coneSize, 0, 0]]} 
        color="red" 
        lineWidth={axisWidth} 
      />
      <Cone 
        args={[coneSize, coneSize * 2, 8]} 
        position={[length - coneSize/2, 0, 0]} 
        rotation={[0, 0, -Math.PI/2]}
      >
        <meshStandardMaterial attach="material" color="red" />
      </Cone>
      <Text position={[length + 0.2, 0, 0]} fontSize={0.2} color="red" fontWeight="bold">
        X
      </Text>

      {/* Y轴 - 绿色 */}
      <Line 
        points={[[0, 0, 0], [0, length - coneSize, 0]]} 
        color="green" 
        lineWidth={axisWidth} 
      />
      <Cone 
        args={[coneSize, coneSize * 2, 8]} 
        position={[0, length - coneSize/2, 0]} 
        rotation={[0, 0, 0]}
      >
        <meshStandardMaterial attach="material" color="green" />
      </Cone>
      <Text position={[0, length + 0.2, 0]} fontSize={0.2} color="green" fontWeight="bold">
        Y
      </Text>

      {/* Z轴 - 蓝色 */}
      <Line 
        points={[[0, 0, 0], [0, 0, length - coneSize]]} 
        color="blue" 
        lineWidth={axisWidth} 
      />
      <Cone 
        args={[coneSize, coneSize * 2, 8]} 
        position={[0, 0, length - coneSize/2]} 
        rotation={[Math.PI/2, 0, 0]}
      >
        <meshStandardMaterial attach="material" color="blue" />
      </Cone>
      <Text position={[0, 0, length + 0.2]} fontSize={0.2} color="blue" fontWeight="bold">
        Z
      </Text>
    </group>
  );
};

// 坐标轴指示器组件
const AxesIndicator = ({ size = 1, position = [0, 0, 0] }) => {
  return (
    <group position={position}>
      <axesHelper args={[size]} />
    </group>
  );
};

// IMU盒子组件
const IMUBox = ({ quaternion, position }) => {
  const boxRef = useRef();

  useEffect(() => {
    if (boxRef.current && quaternion) {
      boxRef.current.quaternion.set(
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      );
    }
  }, [quaternion]);

  return (
    <group ref={boxRef} position={[position?.x || 0, position?.y || 0, position?.z || 0]}>
      <mesh>
        <boxGeometry args={[1, 0.5, 2]} />
        <meshStandardMaterial 
          color="#808080" 
          roughness={0.3} 
          metalness={0.5} 
          transparent={false} 
        />
      </mesh>
      
      {/* 标签 - 六个面 */}
      <Text position={[0, 0, 1.01]} fontSize={0.2} color="black">
        Front
      </Text>
      <Text position={[0, 0, -1.01]} fontSize={0.2} color="black" rotation={[0, Math.PI, 0]}>
        Back
      </Text>
      <Text position={[0, 0.26, 0]} fontSize={0.2} color="black" rotation={[-Math.PI/2, 0, 0]}>
        Top
      </Text>
      <Text position={[0, -0.26, 0]} fontSize={0.2} color="black" rotation={[Math.PI/2, 0, 0]}>
        Bottom
      </Text>
      <Text position={[0.51, 0, 0]} fontSize={0.2} color="black" rotation={[0, Math.PI/2, 0]}>
        Right
      </Text>
      <Text position={[-0.51, 0, 0]} fontSize={0.2} color="black" rotation={[0, -Math.PI/2, 0]}>
        Left
      </Text>
      
      {/* 盒子内部的坐标轴 */}
      <Axes length={2} />
      
      {/* 添加盒子的坐标轴指示器 */}
      <AxesIndicator size={2} />
    </group>
  );
};

// 主可视化组件
const IMUVisualizer = ({ websocketUrl = 'ws://localhost:8080' }) => {
  // 添加设备ID控制
  const { deviceId, wsUrl } = useControls('设备设置', {
    deviceId: { value: '00000001', label: '设备ID' },
    wsUrl: { value: websocketUrl, label: '服务器地址' },
  });

  const [quaternion, setQuaternion] = useState({ x: 0, y: 0, z: 0, w: 1 });
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [positionHistory, setPositionHistory] = useState([]);
  const [quaternionHistory, setQuaternionHistory] = useState([]);

    // 添加轨迹控制面板
    const { showTrajectory, maxTrajectoryPoints, showTrajectoryLine, samplingInterval } = useControls('轨迹设置', {
      showTrajectory: { value: true, label: '显示轨迹' },
      showTrajectoryLine: { value: true, label: '显示轨迹连线' },
      maxTrajectoryPoints: { value: 50, min: 10, max: 5000, step: 10, label: '最大轨迹点数' },
      samplingInterval: { value: 2, min: 1, max: 100, step: 1, label: '采样间隔' }
    });
    
    // 单独添加清除轨迹按钮
    useControls('轨迹操作', {
      '清除轨迹': button(() => {
        setPositionHistory([]);
        setQuaternionHistory([]);
      })
    });
    
    // 添加数据计数器用于采样
    const [dataCounter, setDataCounter] = useState(0);
    
    // 更新位置历史记录
    useEffect(() => {
      if (position && quaternion) {
        // 更新计数器
        setDataCounter(prev => (prev + 1) % samplingInterval);
        
        // 只有当计数器为0时才添加到历史记录
        if (dataCounter === 0) {
          const timestamp = Date.now();
          
          // 更新位置历史
          setPositionHistory(prev => {
            const newHistory = [...prev, { ...position, timestamp }];
            if (newHistory.length > maxTrajectoryPoints) {
              return newHistory.slice(newHistory.length - maxTrajectoryPoints);
            }
            return newHistory;
          });
          
          // 更新四元数历史
          setQuaternionHistory(prev => {
            const newHistory = [...prev, { ...quaternion, timestamp }];
            if (newHistory.length > maxTrajectoryPoints) {
              return newHistory.slice(newHistory.length - maxTrajectoryPoints);
            }
            return newHistory;
          });
        }
      }
    }, [position, quaternion, maxTrajectoryPoints, samplingInterval, dataCounter]);
  
  // 使用 Leva 创建控制面板，添加世界坐标轴位置控制
  const { worldAxesX, worldAxesY, worldAxesZ } = useControls('世界坐标轴设置', {
    worldAxesX: { value: -5, min: -20, max: 20, step: 1, label: 'X位置' },
    worldAxesY: { value: 0, min: -20, max: 20, step: 1, label: 'Y位置' },
    worldAxesZ: { value: -5, min: -20, max: 20, step: 1, label: 'Z位置' }
  });
  
  // 添加手动控制四元数的控制面板
  const { manualControl, controlType, qx, qy, qz, qw, eulerX, eulerY, eulerZ, eulerOrder } = useControls('旋转控制', {
    manualControl: { value: false, label: '启用手动控制' },
    controlType: { 
      value: 'quaternion', 
      options: ['quaternion', 'euler'], 
      label: '控制方式' 
    },
    // 四元数控制
    qx: { value: 0, min: -1, max: 1, step: 0.01, label: '四元数X' },
    qy: { value: 0, min: -1, max: 1, step: 0.01, label: '四元数Y' },
    qz: { value: 0, min: -1, max: 1, step: 0.01, label: '四元数Z' },
    qw: { value: 1, min: -1, max: 1, step: 0.01, label: '四元数W' },
    // 欧拉角控制
    eulerX: { value: 0, min: -180, max: 180, step: 1, label: '欧拉角X(度)' },
    eulerY: { value: 0, min: -180, max: 180, step: 1, label: '欧拉角Y(度)' },
    eulerZ: { value: 0, min: -180, max: 180, step: 1, label: '欧拉角Z(度)' },
    eulerOrder: { 
      value: 'XYZ', 
      options: ['XYZ', 'YZX', 'ZXY', 'XZY', 'YXZ', 'ZYX'], 
      label: '欧拉角顺序' 
    }
  });
  
  // 添加位置手动控制面板
  const { positionControl, posX, posY, posZ } = useControls('位置控制', {
    positionControl: { value: false, label: '启用位置手动控制' },
    posX: { value: 0, min: -10, max: 10, step: 0.1, label: 'X位置' },
    posY: { value: 0, min: -10, max: 10, step: 0.1, label: 'Y位置' },
    posZ: { value: 0, min: -10, max: 10, step: 0.1, label: 'Z位置' }
  });
  
  // 当手动控制启用时，根据控制方式更新四元数
  useEffect(() => {
    if (manualControl) {
      if (controlType === 'quaternion') {
        // 直接使用四元数值
        setQuaternion({ x: qx, y: qy, z: qz, w: qw });
      } else if (controlType === 'euler') {
        // 将欧拉角转换为四元数
        // 注意：Three.js中欧拉角使用弧度，需要将度数转换为弧度
        const euler = new Euler(
          eulerX * Math.PI / 180, 
          eulerY * Math.PI / 180, 
          eulerZ * Math.PI / 180, 
          eulerOrder
        );
        const quat = new Quaternion();
        quat.setFromEuler(euler);
        
        setQuaternion({ 
          x: quat.x, 
          y: quat.y, 
          z: quat.z, 
          w: quat.w 
        });
      }
    }
  }, [manualControl, controlType, qx, qy, qz, qw, eulerX, eulerY, eulerZ, eulerOrder]);
  
  // 当位置手动控制启用时，更新位置
  useEffect(() => {
    if (positionControl) {
      setPosition({ x: posX, y: posY, z: posZ });
    }
  }, [positionControl, posX, posY, posZ]);
  
  // 构建完整的WebSocket URL，确保参数被正确添加
  const fullWebsocketUrl = `${wsUrl}?source=imu_visualizer&id=${deviceId}`;
  
  const { lastMessage } = useWebSocket(fullWebsocketUrl, {
    onOpen: () => console.log(`WebSocket连接已建立: ${fullWebsocketUrl}`),
    onError: (event) => console.error('WebSocket错误:', event),
    onClose: () => console.log('WebSocket连接已关闭'),
    shouldReconnect: () => true,
  });
  
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        // 处理四元数数据 - 只有在未启用旋转手动控制时更新
        if (data.quaternion && !manualControl) {
          console.log('Received quaternion:', data.quaternion);
          setQuaternion(data.quaternion);
        }
        
        // 处理位置数据 - 只有在未启用位置手动控制时更新
        if (data.position && !positionControl) {
          console.log('Received position:', data.position);
          setPosition(data.position);
        }
      } catch (e) {
        console.error('解析WebSocket消息时出错:', e);
      }
    }
  }, [lastMessage, manualControl, positionControl]);

  return (
    <>
      <Leva />
      {showTrajectory && (
        <TrajectoryCard 
          positionHistory={positionHistory} 
          quaternionHistory={quaternionHistory}
          showTrajectoryLine={showTrajectoryLine}
          worldAxesPosition={{ x: worldAxesX, y: worldAxesY, z: worldAxesZ }}
        />
      )}
      <Canvas 
        camera={{ position: [3, 3, 3], fov: 50 }}
        gl={{ alpha: false }} 
        style={{ background: '#181A1F' }}
      >
        <StatsPanel />
        <color attach="background" args={['#181A1F']} />
        <fog attach="fog" args={['#2a2a2a', 8, 25]} />
        
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.0} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow color="#ffffff" />
        
        <gridHelper args={[100, 100]} color="#666666" secondaryColor="#555555" />
        
        {/* 世界坐标系的坐标轴 - 使用滑块控制的单独坐标值 */}
        <group position={[worldAxesX, worldAxesY, worldAxesZ]}>
          <Axes length={10}/>
        </group>
        
        <IMUBox quaternion={quaternion} position={position} />
        <OrbitControls />
      </Canvas>
    </>
  );
};

export default IMUVisualizer;