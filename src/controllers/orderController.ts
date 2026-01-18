import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { orderQueue } from '../services/OrderQueue';
import { redis } from '../config/redis';

const prisma = new PrismaClient();

const orderSchema = z.object({
    tokenIn: z.string().min(1),
    tokenOut: z.string().min(1),
    amount: z.number().positive(),
});

export const createOrder = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { tokenIn, tokenOut, amount } = orderSchema.parse(req.body);

        // Create DB Record PENDING
        const order = await prisma.order.create({
            data: {
                tokenIn,
                tokenOut,
                amount,
                status: 'PENDING',
            },
        });

        // Add to Queue
        await orderQueue.add('execute-order', {
            orderId: order.id,
            tokenIn,
            tokenOut,
            amount,
        });

        // Publish initial pending status
        await redis.publish(`order_status:${order.id}`, JSON.stringify({ status: 'pending', orderId: order.id }));

        return reply.status(201).send({ orderId: order.id, message: 'Order submitted successfully' });

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return reply.status(400).send({ error: 'Validation failed', details: error.errors });
        }
        console.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
};
