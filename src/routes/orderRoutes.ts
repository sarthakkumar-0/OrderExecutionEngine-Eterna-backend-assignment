import { FastifyInstance, FastifyRequest } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { createOrder } from '../controllers/orderController';
import { redis } from '../config/redis';
import { WebSocket } from 'ws';

export async function orderRoutes(fastify: FastifyInstance) {

    // HTTP POST /api/orders/execute
    fastify.post('/execute', createOrder);

    // WebSocket /api/orders/execute (Upgrade handled by fastify-websocket)
    // We need to parse orderId from query param or message?
    // User Guide says: "Same HTTP connection upgrades to WebSocket"
    // Usually this means the client calls POST, gets ID, then connects to WS with ID.
    // OR the client connects WS first?
    // Prompt: "Initial POST returns orderId. Connection upgrades to WebSocket for status streaming."
    // This implies 2 separate connections or a very specific flow. 
    // Standard way: POST -> get ID -> Connect WS w/ ID.

    fastify.get('/execute', { websocket: true }, (connection: SocketStream, req: FastifyRequest) => {
        const { socket } = connection;
        const query = req.query as { orderId?: string };

        // If orderId is provided in query
        if (query.orderId) {
            subscribeToOrder(socket, query.orderId);
        }

        socket.on('message', (message: Buffer) => {
            try {
                const data = JSON.parse(message.toString());
                if (data.orderId) {
                    subscribeToOrder(socket, data.orderId);
                }
            } catch (e) {
                socket.send(JSON.stringify({ error: 'Invalid message format' }));
            }
        });
    });
}

function subscribeToOrder(socket: WebSocket, orderId: string) {
    console.log(`[WS] Client subscribed to order ${orderId}`);

    const channel = `order_status:${orderId}`;
    const subRedis = redis.duplicate();

    subRedis.subscribe(channel);

    subRedis.on('message', (chan: string, msg: string) => {
        if (chan === channel) {
            socket.send(msg);
            // Close connection if finished? 
            const data = JSON.parse(msg);
            if (data.status === 'confirmed' || data.status === 'failed') {
                // Optional: close after delay
                // socket.close();
            }
        }
    });

    socket.on('close', () => {
        subRedis.disconnect();
    });

    socket.send(JSON.stringify({ message: `Subscribed to updates for ${orderId}` }));
}
