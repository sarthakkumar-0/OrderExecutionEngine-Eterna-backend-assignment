# Order Execution Engine

Backend service for executing market orders with DEX routing (Raydium/Meteora) and real-time WebSocket updates.

## Features

- **Market Order Execution**: Routes orders to the best price provider.
- **Smart Routing**: Compares prices between Raydium and Meteora (Mocked).
- **Concurrency**: Process up to 10 orders simultaneously with rate limiting (100 orders/min).
- **Real-time Updates**: WebSocket streaming of order status (Pending -> Routing -> Building -> Submitted -> Confirmed).
- **Reliability**: Exponential backoff retries and persistent order history (PostgreSQL).

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Fastify
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL (History), Redis (Active Status)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd order-execution-engine
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Infrastructure (Docker)**
   Ensure Docker is running.
   ```bash
   docker-compose up -d
   ```

4. **Initialize Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the Server**
   ```bash
   npm run dev
   ```

## API Usage

### Submit Order
`POST /api/orders/execute`

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

### WebSocket Updates
Connect to: `ws://localhost:3000/api/orders/execute?orderId=<ORDER_ID>`

**Messages:**
```json
{ "status": "pending", "orderId": "..." }
{ "status": "routing", "timestamp": "..." }
{ "status": "building", "dex": "Raydium", "price": 102.5 }
{ "status": "confirmed", "txHash": "...", "executedPrice": 102.5 }
```

## Testing

Run unit/integration tests:
```bash
npm test
```
