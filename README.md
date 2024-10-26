
# ewents-scan

This guide provides an example of how to use the `RTCScan` class to manage connections and handle data during a scan session. Below, you'll find installation instructions, initialization options, and method explanations.

Demo:
https://scan.ewents.io/


## Installation

First, make sure to install the `ewents-scan` package:

```bash
npm install ewents-scan
```

## Using the RTCScan Class

The `RTCScan` class provides several options and methods to retrieve connection details, monitor connection status, and handle received data.

### RTCScan Initialization Options

```javascript
const rtcscan = new RTCScan('66760d2b14813c0e8b53b4ff', {
  maxFeedback: 10,            // Max number of feedback allowed
  throttleInterval: 2000,      // Time between each scan event (in ms)
  feedbackDuration: 10000,     // Duration of feedback in milliseconds
  isAutoReconnect: true,       // Automatically reconnect if disconnected
}, {
  allowShortUrl: false,        // If true, allows generating a short URL with TTL
  isLog: true,                 // Enables logging for debugging purposes
  shortUrlTTL: 300             // Time-to-live for the short URL in seconds
});
```

#### Options Explained:

- `maxFeedback`: Maximum number of feedback events allowed.
- `throttleInterval`: Minimum interval (in milliseconds) between each scan event.
- `feedbackDuration`: Duration for which feedback is active.
- `isAutoReconnect`: Automatically reconnect if the connection is lost.

### Advanced Configuration

The advanced configuration object includes:

- `allowShortUrl`: Allows generating a short URL with a specified TTL (in seconds) for temporary connections.
- `isLog`: Enables logging for debugging and monitoring.
- `shortUrlTTL`: TTL (in seconds) for the short URL, after which it expires.

### Methods

#### 1. Getting Connection Details (with optional QR size)

```javascript
const { qrImage, url } = await rtcscan.getConnectionDetail(300);
```

Retrieves the QR code URL (`qrImage`) and the connection URL (`url`). Optionally, you can pass `qrPxSize` to adjust the QR code size (default is 300 pixels).

#### 2. Handling Received Data

```javascript
rtcscan.onDataReceived((value) => {
  return {
    type: 'success' | 'error',  // Indicates the type of response
    message: 'This is a message',  // The message to be sent
  };
});
```

Listens for incoming data. You can return a `type` ('success' or 'error') and a `message`, though this is optional.

#### 3. Monitoring Connection Status

```javascript
rtcscan.onIsConnecting(() => setIsLoading(true));
rtcscan.onIsConnected(() => setIsConnected(true));
```

- `onIsConnecting`: Triggered when the session is connecting.
- `onIsConnected`: Triggered when the connection is successfully established.

#### 4. Reconnect Functionality

```javascript
rtcscan.reConnect();
```

Attempts to manually re-establish the connection if it is lost.

#### 5. Getting the Session ID

```javascript
const sessionId = rtcscan.getSession();
rtcscan.getSession((id) => console.log(id));  // Optionally pass a callback
```

Returns the session ID, with an optional callback for handling it when available.

#### 6. Starting Connection with a URL

```javascript
rtcscan.startConnectionWithUrl('https://scan.ewents.io/connection-url');
```

Initiates the connection using a specified URL (short or long), allowing flexibility in the URL format.

---

This overview covers the key methods and options of the `RTCScan` class, providing control over connection handling, received data, and session management.
