# Order Execution Engine

A robust backend service for executing **Market Orders** with smart DEX routing (simulating Raydium vs. Meteora) and real-time WebSocket status updates.

## 🚀 Deployment & Deliverables

* **Live URL:** [OrderExecutionEngine](https://order-execution-engine-rw9f.onrender.com)
* **Demo Video:** `[INSERT YOUR YOUTUBE LINK HERE]`
* **API Documentation:** [Postman Collection](./postman_collection.json)
* **Solana Explorer:** `[OPTIONAL: Insert TX Link if using real Devnet]`

---

## 🏗 Architecture & Design Decisions

### Why Market Orders?
I chose to implement **Market Orders** because they demonstrate the core value of a DEX router: **latency-sensitive price comparison**. Immediate execution requires efficient async processing and real-time locking of the best quote, which effectively showcases the system's routing logic and queue management capabilities.

**Extension Strategy (Limit & Sniper Orders):**
To extend this engine for **Limit** or **Sniper** orders, I would implement a "Price Watcher" worker.
1.  **Limit Orders:** Instead of immediate processing, orders are stored in PostgreSQL with a `targetPrice`. A separate worker polls prices (or subscribes to chain events) and pushes the order to the existing `execute` queue only when the condition is met.
2.  **Sniper Orders:** Similar to Limit orders, but triggered by `liquidity add` events on-chain.

### Tech Stack
* **Runtime:** Node.js + TypeScript
* **Framework:** Fastify (Chosen for low overhead and built-in WebSocket support)
* **Queue:** BullMQ + Redis (Handles concurrency and retries for reliability)
* **Database:** PostgreSQL (Permanent history) + Redis (Ephemeral state & caching)

---

## ✨ Features

* **Smart DEX Routing**: Queries multiple (mocked) providers to find the best rate (Raydium vs Meteora).
* **High Concurrency**: Uses BullMQ to process up to 10 simultaneous orders with a rate limit of 100 orders/min.
* **Real-time Updates**: WebSocket streaming of the full order lifecycle (`pending` → `routing` → `building` → `submitted` → `confirmed`).
* **Fault Tolerance**: Implements exponential backoff strategies for failed network requests.

---

## 🛠 Setup & Local Development

1.  **Clone the repository**
    ```bash
    git clone <repo-url>
    cd order-execution-engine
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Start Infrastructure (Docker)**
    Ensure Docker is running to spin up Postgres and Redis.
    ```bash
    docker-compose up -d
    ```

4.  **Initialize Database**
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Run the Server**
    ```bash
    npm run dev
    ```

6.  **Run Tests**
    Includes >10 unit/integration tests covering routing, queueing, and WS logic.
    ```bash
    npm test
    ```

---

## 📡 API Usage

### 1. Submit Order (HTTP)
**Endpoint:** `POST /api/orders/execute`

**Body:**
```json
{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 1.5
}
```

**Response:**
```json
{
  "orderId": "uuid-string",
  "message": "Order submitted successfully"
}
```

### 2. WebSocket Status Stream
**Endpoint:** `ws://localhost:3000/api/orders/execute?orderId=<ORDER_ID>`

**Message Flow:**
```json
{ "status": "pending", "orderId": "..." }
{ "status": "routing", "timestamp": "..." }
{ "status": "building", "dex": "Raydium", "price": 102.5 }
{ "status": "submitted" }
{ "status": "confirmed", "txHash": "0x123...", "executedPrice": 102.5 }
```
