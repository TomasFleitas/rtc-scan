
# RTCScan Usage Guide

This README provides instructions on how to use the `RTCScan` class and its methods for managing connections and handling data during a scan session.

### Testing with Demo

You can test the integration of the `RTCScan` class by visiting the demo page: [https://scan.ewents.io](https://scan.ewents.io).

## Installation

First, make sure to install the `ewents-scan` package:

```bash
npm install ewents-scan
```

## RTCScan Class Overview

The `RTCScan` class helps in managing connections and handling data during a scan session. The class provides several options and methods to retrieve connection details, monitor connection status, and handle received data.

### RTCScan Initialization Options

Here’s an example of how to initialize the `RTCScan` class with the available options:

```javascript
const rtcscan = new RTCScan('66760d2b14813c0e8b53b4ff', {
  maxFeedback: 3,  // Max number of feedback
  throttleInterval: 2000,  // Time between each scan event (in ms)
  feedbackDuration: 10000,  // Duration of feedback in milliseconds
  isAutoReconnect: true,  // Whether it should automatically reconnect
});
```

Note: The API key (`66760d2b14813c0e8b53b4ff`) is a default key for trying out the example. This key will be deleted after testing, so ensure to replace it with your own API key.

### Methods

#### 1. Getting Connection Details (with optional QR size)

Retrieve the QR code URL (`qrUrl`) and the connection URL (`url`). You can optionally pass the `qrPxSize` parameter to adjust the size of the QR code, where the default is 300 pixels.

```javascript
const { qrUrl, url } = await rtcscan.getConnectionDetail({ qrPxSize: 300 });
```

#### 2. Handling Received Data

The `onDataReceived` method listens for incoming data. You can return a `type` ('success' or 'error') and a `message`, but this is optional, and the response could be a promise or just plain data.

```javascript
rtcscan.onDataReceived((value) => {
  return {
    type: 'success' | 'error',  // Indicates the type of response
    message: 'This is a message',  // The message to be sent
  };
});
```

#### 3. Monitoring Connection Status

These methods monitor the connection status. `onIsConnecting` is triggered when the session is connecting, and `onIsConnected` is triggered when the connection is successfully established.

```javascript
rtcscan.onIsConnecting(() => setIsLoading(true));

rtcscan.onIsConnected(() => setIsConnected(true));
```

#### 4. Reconnect Functionality

The `reConnect` method attempts to re-establish the connection manually if it is lost.

```javascript
rtcscan.reConnect();
```

#### 5. Getting the Session ID

This method returns the session ID. You can also pass a callback to handle the session ID when it's available.

```javascript
const sessionId = rtcscan.getSession();

rtcscan.getSession((id) => console.log(id));  // Optionally pass a callback
```

## Conclusion

This overview covers the key methods and options of the `RTCScan` class, providing control over connection handling, received data, and session management.
