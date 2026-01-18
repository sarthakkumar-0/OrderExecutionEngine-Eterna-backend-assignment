import { Queue, Worker, Job } from 'bullmq';
import { connection, redis } from '../config/redis';
import { DexRouter } from './DexRouter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dexRouter = new DexRouter();

export const ORDER_QUEUE_NAME = 'order-execution-queue';

export const orderQueue = new Queue(ORDER_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for inspection
    },
});

interface OrderJobData {
    orderId: string;
    tokenIn: string;
    tokenOut: string;
    amount: number;
}

// Function to publish status updates
async function updateStatus(orderId: string, status: string, data?: any) {
    const payload = JSON.stringify({ status, ...data, timestamp: new Date() });
    await redis.publish(`order_status:${orderId}`, payload);

    // Also update DB
    // Note: For high throughput, we might want to batch DB updates or only do valid state transitions
    // But for this task, updating directly is fine.
    try {
        // We map status string to Enum if possible, or just ignore if it's intermediate
        // Our Enum: PENDING, ROUTING, BUILDING, SUBMITTED, CONFIRMED, FAILED
        const validStatuses = ['PENDING', 'ROUTING', 'BUILDING', 'SUBMITTED', 'CONFIRMED', 'FAILED'];
        if (validStatuses.includes(status.toUpperCase())) {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: status.toUpperCase() as any }
            });
        }
    } catch (e) {
        console.error(`Failed to update DB for order ${orderId}:`, e);
    }
}

export const orderWorker = new Worker<OrderJobData>(
    ORDER_QUEUE_NAME,
    async (job: Job<OrderJobData>) => {
        const { orderId, tokenIn, tokenOut, amount } = job.data;
        console.log(`[Worker] Processing order ${orderId}`);

        try {
            // 1. Routing
            await updateStatus(orderId, 'routing');
            const quote = await dexRouter.getBestQuote(tokenIn, tokenOut, amount);

            // 2. Building
            await updateStatus(orderId, 'building', { dex: quote.dex, price: quote.price });
            // Simulate transaction building time
            await new Promise(resolve => setTimeout(resolve, 500));

            // 3. Submitted
            await updateStatus(orderId, 'submitted');

            // 4. Execution (Settlement)
            const result = await dexRouter.executeSwap(quote.dex, tokenIn, tokenOut, amount, quote.price);

            if (result.status === 'failed') {
                throw new Error(result.error || 'Execution failed');
            }

            // 5. Confirmed
            await updateStatus(orderId, 'confirmed', {
                txHash: result.txHash,
                executedPrice: result.executedPrice
            });

            // Final DB Update with details
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: 'CONFIRMED',
                    dex: quote.dex,
                    txHash: result.txHash,
                    amount: amount // Assuming amount stays same (input)
                }
            });

            return result;

        } catch (error: any) {
            console.error(`[Worker] Job ${job.id} failed: ${error.message}`);
            await updateStatus(orderId, 'failed', { error: error.message });

            // Update DB with Error
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: 'FAILED',
                    error: error.message
                }
            });

            throw error; // Triggers BullMQ retry
        }
    },
    {
        connection,
        concurrency: 10, // Requirement: 10 concurrent orders
        limiter: {
            max: 100,
            duration: 60000, // Requirement: 100 orders/minute
        }
    }
);
