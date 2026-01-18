import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { orderRoutes } from './routes/orderRoutes';
import dotenv from 'dotenv';

dotenv.config();

const server = Fastify({
    logger: true,
});

server.register(websocket);

server.register(orderRoutes, { prefix: '/api/orders' });

server.get('/', async () => {
    return { status: 'ok', service: 'Order Execution Engine' };
});

const start = async () => {
    try {
        const PORT = parseInt(process.env.PORT || '3000');
        await server.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Server listening at http://localhost:${PORT}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
