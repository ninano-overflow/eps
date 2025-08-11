#!/usr/bin/env node

const net = require("net");
const EventEmitter = require("events");

class HTTPProxy extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sourceHost = options.sourceHost || "192.168.2.119";
    this.sourcePort = options.sourcePort || 8554;
    this.proxyHost = options.proxyHost || "0.0.0.0";
    this.proxyPort = options.proxyPort || 8554;
    this.maxConnections = options.maxConnections || 10;
    this.connectionTimeout = options.connectionTimeout || 30000;

    this.server = null;
    this.connections = new Map();
    this.connectionId = 0;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((clientSocket) => {
        this.handleClient(clientSocket);
      });

      this.server.on("error", (err) => {
        console.error("Server error:", err);
        this.emit("error", err);
      });

      this.server.listen(this.proxyPort, this.proxyHost, () => {
        const address = this.server.address();
        console.log(`RTSP Proxy listening on ${address.address}:${address.port}`);
        console.log(`Proxying RTSP stream from rtsp://${this.sourceHost}:${this.sourcePort}/`);
        console.log(`Access stream at: rtsp://192.168.199.11:${this.proxyPort}/`);
        this.emit("started");
        resolve();
      });
    });
  }

  handleClient(clientSocket) {
    const connId = ++this.connectionId;
    console.log(`[${connId}] Client connected from ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);

    // Check connection limit
    if (this.connections.size >= this.maxConnections) {
      console.log(`[${connId}] Connection limit reached, rejecting client`);
      clientSocket.end();
      return;
    }

    // Connect to RTSP source
    const sourceSocket = new net.Socket();
    const connection = {
      id: connId,
      client: clientSocket,
      source: sourceSocket,
      startTime: Date.now(),
    };

    this.connections.set(connId, connection);

    // Set timeouts
    clientSocket.setTimeout(this.connectionTimeout);
    sourceSocket.setTimeout(this.connectionTimeout);

    // Connect to source RTSP server
    sourceSocket.connect(this.sourcePort, this.sourceHost, () => {
      console.log(`[${connId}] Connected to RTSP source ${this.sourceHost}:${this.sourcePort}`);
    });

    // Handle client → source data flow
    clientSocket.on("data", (data) => {
      if (sourceSocket.writable) {
        const request = data.toString("utf8");
        if (request.includes("RTSP/1.0")) {
          console.log(`[${connId}] RTSP Request: ${request.split("\r\n")[0]}`);
        }
        sourceSocket.write(data);
      }
    });

    // Handle source → client data flow
    sourceSocket.on("data", (data) => {
      if (clientSocket.writable) {
        const response = data.toString("utf8");
        if (response.includes("RTSP/1.0")) {
          console.log(`[${connId}] RTSP Response: ${response.split("\r\n")[0]}`);
        }
        clientSocket.write(data);
      }
    });

    // Error handling
    const cleanup = (reason) => {
      console.log(`[${connId}] Connection closed: ${reason}`);
      this.connections.delete(connId);

      if (!clientSocket.destroyed) clientSocket.destroy();
      if (!sourceSocket.destroyed) sourceSocket.destroy();
    };

    clientSocket.on("error", (err) => {
      console.error(`[${connId}] Client error:`, err.message);
      cleanup("client error");
    });

    sourceSocket.on("error", (err) => {
      console.error(`[${connId}] Source error:`, err.message);
      cleanup("source error");
    });

    clientSocket.on("close", () => cleanup("client closed"));
    sourceSocket.on("close", () => cleanup("source closed"));

    clientSocket.on("timeout", () => {
      console.log(`[${connId}] Client timeout`);
      cleanup("client timeout");
    });

    sourceSocket.on("timeout", () => {
      console.log(`[${connId}] Source timeout`);
      cleanup("source timeout");
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        // Close all active connections
        for (const [connId, connection] of this.connections) {
          console.log(`Closing connection ${connId}`);
          if (!connection.client.destroyed) connection.client.destroy();
          if (!connection.source.destroyed) connection.source.destroy();
        }
        this.connections.clear();

        this.server.close(() => {
          console.log("RTSP Proxy stopped");
          this.emit("stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getStatus() {
    return {
      running: !!this.server?.listening,
      activeConnections: this.connections.size,
      maxConnections: this.maxConnections,
      uptime: this.server?.listening ? Date.now() - this.startTime : 0,
    };
  }
}

// CLI usage
if (require.main === module) {
  const proxy = new HTTPProxy({
    sourceHost: "192.168.2.119",
    sourcePort: 8554,
    proxyHost: "0.0.0.0",
    proxyPort: 8554,
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nReceived SIGINT, shutting down gracefully...");
    await proxy.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\nReceived SIGTERM, shutting down gracefully...");
    await proxy.stop();
    process.exit(0);
  });

  // Start the proxy
  proxy.start().catch((err) => {
    console.error("Failed to start RTSP proxy:", err);
    process.exit(1);
  });
}

module.exports = HTTPProxy;
