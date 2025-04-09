import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Cone, Line } from '@react-three/drei';
import { Vector3 } from 'three';
import styled from 'styled-components';

// 坐标轴组件
const Axes = ({ length = 2 }) => {
    // 使用 Leva 创建控制面板
    const axisWidth = 3
    const coneSize = 0.1
  
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
  
// 样式化的卡片容器
const CardContainer = styled.div`
  position: fixed;
  top: ${props => props.isFullscreen ? '0' : '20px'};
  left: ${props => props.isFullscreen ? '0' : '20px'};
  width: ${props => props.isFullscreen ? '100%' : '300px'};
  height: ${props => props.isFullscreen ? '100%' : '200px'};
  background-color: rgba(30, 30, 30, 0.8);
  border-radius: ${props => props.isFullscreen ? '0' : '12px'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
`;

const CardHeader = styled.div`
  padding: 10px;
  background-color: rgba(40, 40, 40, 0.9);
  color: white;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CardTitle = styled.div`
  font-size: 14px;
`;

const FullscreenButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

// 轨迹可视化组件
const TrajectoryVisualization = ({ positionHistory, quaternionHistory, showTrajectoryLine, worldAxesPosition }) => {
  // 生成轨迹线的点
  const points = positionHistory.map(pos => [pos.x, pos.y, pos.z]);
  
  // 计算轨迹的边界框以便自动调整视图
  const calculateBounds = (points) => {
    if (points.length === 0) return { min: [-1, -1, -1], max: [1, 1, 1] };
    
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    
    points.forEach(point => {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], point[i]);
        max[i] = Math.max(max[i], point[i]);
      }
    });
    
    // 确保有最小尺寸
    for (let i = 0; i < 3; i++) {
      if (max[i] - min[i] < 0.1) {
        const mid = (max[i] + min[i]) / 2;
        min[i] = mid - 0.05;
        max[i] = mid + 0.05;
      }
    }
    
    return { min, max };
  };
  
  const bounds = calculateBounds(points);
  const cameraRef = useRef();
  
  // 使用useEffect代替useFrame来调整相机
  useEffect(() => {
    if (cameraRef.current && points.length > 0) {
      const center = new Vector3(
        (bounds.min[0] + bounds.max[0]) / 2,
        (bounds.min[1] + bounds.max[1]) / 2,
        (bounds.min[2] + bounds.max[2]) / 2
      );
      
      // 计算合适的相机距离
      const size = Math.max(
        bounds.max[0] - bounds.min[0],
        bounds.max[1] - bounds.min[1],
        bounds.max[2] - bounds.min[2]
      );
      
      // 更新相机位置
      cameraRef.current.position.set(
        center.x + size * 1.5,
        center.y + size * 1.5,
        center.z + size * 1.5
      );
      cameraRef.current.lookAt(center);
    }
  }, [points, bounds]);
  
  return (
    <>
      {/* 坐标轴 */}
      <group position={[worldAxesPosition.x, worldAxesPosition.y, worldAxesPosition.z]}>
          <Axes length={10}/>
      </group>
      
      {/* 轨迹线 - 根据showTrajectoryLine控制显示 */}
      {showTrajectoryLine && points.length > 1 && (
        <Line
          points={points}
          color="cyan"
          lineWidth={3}
        />
      )}
      
      {/* 当前位置标记和姿态坐标轴 */}
      {points.length > 0 && (
        <group position={points[points.length - 1]}>
          {/* 黄色球体标记 */}
          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="yellow" />
          </mesh>
          
          {/* 姿态坐标轴 */}
          {quaternionHistory.length > 0 && quaternionHistory[quaternionHistory.length - 1] && (
            <group quaternion={[
              quaternionHistory[quaternionHistory.length - 1].x,
              quaternionHistory[quaternionHistory.length - 1].y,
              quaternionHistory[quaternionHistory.length - 1].z,
              quaternionHistory[quaternionHistory.length - 1].w
            ]}>
              {/* X轴 - 红色 */}
              <Line 
                points={[[0, 0, 0], [0.5, 0, 0]]} 
                color="red" 
                lineWidth={3} 
              />
              <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
                <coneGeometry args={[0.05, 0.1, 8]} />
                <meshBasicMaterial color="red" />
              </mesh>
              
              {/* Y轴 - 绿色 */}
              <Line 
                points={[[0, 0, 0], [0, 0.5, 0]]} 
                color="green" 
                lineWidth={3} 
              />
              <mesh position={[0, 0.5, 0]}>
                <coneGeometry args={[0.05, 0.1, 8]} />
                <meshBasicMaterial color="green" />
              </mesh>
              
              {/* Z轴 - 蓝色 */}
              <Line 
                points={[[0, 0, 0], [0, 0, 0.5]]} 
                color="blue" 
                lineWidth={3} 
              />
              <mesh position={[0, 0, 0.5]} rotation={[Math.PI/2, 0, 0]}>
                <coneGeometry args={[0.05, 0.1, 8]} />
                <meshBasicMaterial color="blue" />
              </mesh>
            </group>
          )}
        </group>
      )}
      
      {/* 历史位置点 - 即使不显示连线也显示点 */}
      {!showTrajectoryLine && points.length > 1 && 
        points.map((point, index) => {
          // 跳过当前点，因为已经用黄色球体标记了
          if (index === points.length - 1) return null;
          
          return (
            <mesh key={index} position={point}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color="cyan" />
            </mesh>
          );
        })
      }
      
      {/* 历史姿态坐标轴（每隔一定数量的点显示一次） */}
      {points.length > 0 && quaternionHistory.length > 0 && 
        points.map((point, index) => {
          
          const quat = quaternionHistory[index];
          if (!quat) return null;
          
          return (
            <group key={index} position={point}>
              <group quaternion={[quat.x, quat.y, quat.z, quat.w]}>
                {/* X轴 - 红色 */}
                <Line 
                  points={[[0, 0, 0], [0.3, 0, 0]]} 
                  color="red" 
                  lineWidth={2} 
                />
                
                {/* Y轴 - 绿色 */}
                <Line 
                  points={[[0, 0, 0], [0, 0.3, 0]]} 
                  color="green" 
                  lineWidth={2} 
                />
                
                {/* Z轴 - 蓝色 */}
                <Line 
                  points={[[0, 0, 0], [0, 0, 0.3]]} 
                  color="blue" 
                  lineWidth={2} 
                />
              </group>
            </group>
          );
        })
      }
    </>
  );
};

// 全屏/退出全屏图标组件
const FullscreenIcon = ({ isFullscreen }) => {
  return isFullscreen ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  );
};

// 跟随图标组件
const FollowIcon = ({ following }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: following ? 1 : 0.5 }}>
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

// 跟随按钮样式
const FollowButton = styled(FullscreenButton)`
  margin-right: 8px;
`;

// 主卡片组件
const TrajectoryCard = ({ positionHistory = [], quaternionHistory = [], showTrajectoryLine = true, worldAxesPosition = {x: 0, y:0, z:0} }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [followLatestPoint, setFollowLatestPoint] = useState(true);
  const [fixedCameraPosition] = useState([5, 5, 5]);
  const [fixedCameraTarget] = useState([0, 0, 0]);
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  const toggleFollow = () => {
    setFollowLatestPoint(!followLatestPoint);
  };
  
  // 获取最新位置点作为相机目标
  const getLatestPosition = () => {
    if (positionHistory.length > 0) {
      const latest = positionHistory[positionHistory.length - 1];
      return [latest.x, latest.y, latest.z];
    }
    return [0, 0, 0];
  };
  
  // 计算合适的相机位置
  const getCameraPosition = () => {
    if (positionHistory.length > 0) {
      const target = getLatestPosition();
      // 相机位置在目标点的右上后方
      return [target[0] + 3, target[1] + 3, target[2] + 3];
    }
    return [3, 3, 3];
  };
  
  const cameraPosition = followLatestPoint ? getCameraPosition() : fixedCameraPosition;
  const cameraTarget = followLatestPoint ? getLatestPosition() : fixedCameraTarget;
  
  return (
    <CardContainer isFullscreen={isFullscreen}>
      <CardHeader>
        <CardTitle>位姿轨迹</CardTitle>
        <div style={{ display: 'flex' }}>
          <FollowButton onClick={toggleFollow} title={followLatestPoint ? "停止跟随" : "跟随最新点"}>
            <FollowIcon following={followLatestPoint} />
          </FollowButton>
          <FullscreenButton onClick={toggleFullscreen}>
            <FullscreenIcon isFullscreen={isFullscreen} />
          </FullscreenButton>
        </div>
      </CardHeader>
      <Canvas 
        style={{ flex: 1 }}
        camera={{ 
          position: cameraPosition, 
          fov: 50 
        }}
      >
        <color attach="background" args={['#1a1a1a']} />
        <ambientLight intensity={0.5} />
        <TrajectoryVisualization 
          positionHistory={positionHistory} 
          quaternionHistory={quaternionHistory}
          showTrajectoryLine={showTrajectoryLine}
          worldAxesPosition={worldAxesPosition}
        />
        <OrbitControls 
          enablePan={false}
          enableZoom={true}
          minDistance={0.5}
          maxDistance={20}
          target={cameraTarget}
        />
        <gridHelper args={[100, 100]} color="#666666" secondaryColor="#555555" />
      </Canvas>
    </CardContainer>
  );
};

export default TrajectoryCard;