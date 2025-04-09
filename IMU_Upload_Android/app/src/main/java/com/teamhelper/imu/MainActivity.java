package com.teamhelper.imu;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Bundle;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.databinding.DataBindingUtil;
import androidx.lifecycle.ViewModelProvider;

import com.teamhelper.imu.databinding.ActivityMainBinding;

import org.json.JSONException;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity implements SensorEventListener {

    private MainViewModel viewModel;
    private ActivityMainBinding binding;

    private SensorManager sensorManager;
    private Sensor rotationVectorSensor;
    private Sensor accelerometerSensor;
    private Sensor gyroscopeSensor;

    // 位置估计相关变量
    private float[] velocity = new float[3];
    private float[] position = new float[3];
    private float[] gravity = new float[3];
    private float[] linearAcceleration = new float[3];
    private long lastTimestamp = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 使用DataBinding初始化布局
        binding = DataBindingUtil.setContentView(this, R.layout.activity_main);

        // 初始化ViewModel
        viewModel = new ViewModelProvider(this).get(MainViewModel.class);

        // 设置ViewModel到布局
        binding.setViewModel(viewModel);

        // 设置生命周期所有者，使LiveData可以自动更新UI
        binding.setLifecycleOwner(this);

        // 观察连接状态
        viewModel.getConnectionStatus().observe(this, isConnected -> {
            if (isConnected) {
                Toast.makeText(this, "已连接到服务器", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "连接断开", Toast.LENGTH_SHORT).show();
            }
        });

        // 观察错误信息
        viewModel.getErrorMessage().observe(this, errorMsg -> {
            if (errorMsg != null && !errorMsg.isEmpty()) {
                Toast.makeText(this, errorMsg, Toast.LENGTH_LONG).show();
                viewModel.clearErrorMessage();
            }
        });

        // 初始化传感器管理器
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);

        // 获取旋转矢量传感器（提供四元数）
        rotationVectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);

        // 获取加速度计和陀螺仪
        accelerometerSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        gyroscopeSensor = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // 重新初始化位置估计相关变量
        velocity = new float[3];
        position = new float[3];
        gravity = new float[3];
        linearAcceleration = new float[3];
        lastTimestamp = 0;

        // 注册传感器监听器
        sensorManager.registerListener(this, rotationVectorSensor, SensorManager.SENSOR_DELAY_GAME);
        sensorManager.registerListener(this, accelerometerSensor, SensorManager.SENSOR_DELAY_GAME);
        sensorManager.registerListener(this, gyroscopeSensor, SensorManager.SENSOR_DELAY_GAME);

        viewModel.connect();
    }

    @Override
    protected void onPause() {
        super.onPause();
        // 取消注册传感器监听器
        sensorManager.unregisterListener(this);
        // 断开WebSocket连接
        viewModel.disconnect();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ROTATION_VECTOR) {
            // 处理旋转矢量数据（四元数）
            float[] quaternion = new float[4];
            SensorManager.getQuaternionFromVector(quaternion, event.values);

            try {
                // 创建JSON对象
                JSONObject data = new JSONObject();
                JSONObject quaternionJson = new JSONObject();
                quaternionJson.put("x", quaternion[1]); // 注意：Android四元数顺序是[w,x,y,z]
                quaternionJson.put("y", quaternion[2]);
                quaternionJson.put("z", quaternion[3]);
                quaternionJson.put("w", quaternion[0]);

                JSONObject positionJson = new JSONObject();
                positionJson.put("x", position[0]);
                positionJson.put("y", position[1]);
                positionJson.put("z", position[2]);

                data.put("quaternion", quaternionJson);
                data.put("position", positionJson);
                data.put("timestamp", System.currentTimeMillis());

                // 发送数据
                viewModel.sendMessage(data.toString());
                // 更新UI
                viewModel.setSensorData("四元数: [" +
                        quaternion[0] + ", " +
                        quaternion[1] + ", " +
                        quaternion[2] + ", " +
                        quaternion[3] + "]\n" +
                        "位置: [" +
                        position[0] + ", " +
                        position[1] + ", " +
                        position[2] + "]");

            } catch (JSONException e) {
                e.printStackTrace();
            }
        } else if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            // 处理加速度计数据，用于位置估计
            // 使用低通滤波器分离重力
            final float alpha = 0.8f;
            gravity[0] = alpha * gravity[0] + (1 - alpha) * event.values[0];
            gravity[1] = alpha * gravity[1] + (1 - alpha) * event.values[1];
            gravity[2] = alpha * gravity[2] + (1 - alpha) * event.values[2];

            // 移除重力影响，得到线性加速度
            linearAcceleration[0] = event.values[0] - gravity[0];
            linearAcceleration[1] = event.values[1] - gravity[1];
            linearAcceleration[2] = event.values[2] - gravity[2];

            // 计算时间增量
            long currentTime = System.currentTimeMillis();
            if (lastTimestamp != 0) {
                float dt = (currentTime - lastTimestamp) / 1000.0f; // 转换为秒

                // 使用加速度计数据进行位置估计（双重积分）
                for (int i = 0; i < 3; i++) {
                    // 速度积分
                    velocity[i] += linearAcceleration[i] * dt;

                    // 应用简单的衰减以减少漂移
                    velocity[i] *= 0.95;

                    // 位置积分
                    position[i] += velocity[i] * dt * 10; // 乘以10以增加位置变化的可见性
                }
            }
            lastTimestamp = currentTime;
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // 传感器精度变化时的处理
    }
}