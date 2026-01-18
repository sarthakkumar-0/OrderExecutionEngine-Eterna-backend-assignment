import Fastify, { FastifyInstance } from 'fastify';
import { orderRoutes } from '../src/routes/orderRoutes';
import websocket from '@fastify/websocket';

// Mock dependencies to avoid needing real Redis implementation for unit/integration logic
// We can use jest.mock for services if we want pure unit tests of the controller
// But integration tests usually want to hit the endpoints.

describe('API Integration', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = Fastify();
        app.register(websocket);
        app.register(orderRoutes, { prefix: '/api/orders' });
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    test('POST /execute should validate missing fields', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/orders/execute',
            payload: { tokenIn: 'SOL' } // Missing tokenOut and amount
        });
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('Validation failed');
    });

    test('POST /execute should validate invalid amount', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/orders/execute',
            payload: { tokenIn: 'SOL', tokenOut: 'USDC', amount: -5 }
        });
        expect(response.statusCode).toBe(400);
    });

    // Note: Successfully Testing the "Happy Path" requires Redis to be running or Mocked.
    // If we run this in an environment without Redis, it will fail at `orderQueue.add`.
    // We will assume the user has Docker running as per instructions.
    // Or we can mock the queue.
});
