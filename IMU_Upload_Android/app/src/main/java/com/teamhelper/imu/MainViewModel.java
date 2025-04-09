package com.teamhelper.imu;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.net.URISyntaxException;

public class MainViewModel extends ViewModel {

    // 双向绑定的数据
    private final MutableLiveData<String> wsUrl = new MutableLiveData<>("ws://192.168.0.138:8080");
    private final MutableLiveData<String> deviceId = new MutableLiveData<>("00000001");
    private final MutableLiveData<String> sensorData = new MutableLiveData<>("");

    // 内部状态
    private final MutableLiveData<Boolean> connectionStatus = new MutableLiveData<>();
    private final MutableLiveData<String> errorMessage = new MutableLiveData<>("");
    private final MutableLiveData<String> currentConnectedUrl = new MutableLiveData<>("");

    private WebSocketClient webSocketClient;

    // 连接WebSocket
    public void connect() {
        if (connectionStatus.getValue() != null && connectionStatus.getValue()) {
            // 如果已连接，则断开连接
            disconnect();
            return;
        }
        if (webSocketClient != null && webSocketClient.isOpen()) {
            disconnect();
        }

        try {
            URI serverUri = new URI(wsUrl.getValue() + "?source=imu_sender&id=" + deviceId.getValue());
            webSocketClient = new WebSocketClient(serverUri) {

                // 在 connect() 方法中，成功连接后更新当前连接的 URL
                @Override
                public void onOpen(ServerHandshake handshakedata) {
                    connectionStatus.postValue(true);
                    currentConnectedUrl.postValue(wsUrl.getValue());
                }

                @Override
                public void onMessage(String message) {
                }

                @Override
                public void onClose(int code, String reason, boolean remote) {
                    connectionStatus.postValue(false);
                    if (remote) {
                        errorMessage.postValue("服务器关闭了连接: " + reason);
                    }
                }

                @Override
                public void onError(Exception ex) {
                    errorMessage.postValue("连接错误: " + ex.getMessage());
                }
            };
            webSocketClient.connect();
        } catch (URISyntaxException e) {
            errorMessage.setValue("URL格式错误: " + e.getMessage());
        }
    }

    public void sendMessage(String message) {
        if (webSocketClient != null && webSocketClient.isOpen()) {
            webSocketClient.send(message);
        }
    }

    // 断开WebSocket连接
    public void disconnect() {
        if (webSocketClient != null && !webSocketClient.isClosed()) {
            webSocketClient.close();
            currentConnectedUrl.postValue("");
        }
    }

    // 清除错误信息
    public void clearErrorMessage() {
        errorMessage.setValue("");
    }

    // Getter方法，用于数据绑定
    public MutableLiveData<String> getWsUrl() {
        return wsUrl;
    }

    public MutableLiveData<String> getDeviceId() {
        return deviceId;
    }

    public LiveData<String> getSensorData() {
        return sensorData;
    }

    public void setSensorData(String data) {
        sensorData.postValue(data);
    }

    public LiveData<Boolean> getConnectionStatus() {
        return connectionStatus;
    }

    public LiveData<String> getErrorMessage() {
        return errorMessage;
    }

    public LiveData<String> getCurrentConnectedUrl() {
        return currentConnectedUrl;
    }

    @Override
    protected void onCleared() {
        super.onCleared();
        disconnect();
    }
}