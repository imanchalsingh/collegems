import amqp from "amqplib";
import { EventEmitter } from "events";

let channel, connection;
const mockEventBus = new EventEmitter();

export const connectRabbitMQ = async () => {
  if (process.env.MOCK_RABBITMQ === "true") {
    console.log("🐇 MOCK RabbitMQ Connected via EventEmitter");
    return;
  }
  try {
    const amqpServer = process.env.RABBITMQ_URL || "amqp://localhost:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    console.log("🐇 Connected to RabbitMQ");
  } catch (err) {
    console.error("❌ RabbitMQ Connection Error:", err.message);
  }
};

export const publishEvent = async (exchange, routingKey, data) => {
  if (process.env.MOCK_RABBITMQ === "true") {
    console.log(`📨 MOCK: Published event to ${exchange} with key ${routingKey}`);
    mockEventBus.emit(`${exchange}:${routingKey}`, data);
    return;
  }
  
  if (!channel) await connectRabbitMQ();
  if (!channel) return;
  try {
    await channel.assertExchange(exchange, 'topic', { durable: true });
    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)));
    console.log(`📨 Published event to ${exchange} with key ${routingKey}`);
  } catch (err) {
    console.error("❌ Error publishing event:", err.message);
  }
};

export const subscribeEvent = async (exchange, queueName, routingKey, callback) => {
  if (process.env.MOCK_RABBITMQ === "true") {
    mockEventBus.on(`${exchange}:${routingKey}`, callback);
    console.log(`👂 MOCK: Subscribed to ${exchange} on queue ${queueName} with key ${routingKey}`);
    return;
  }
  
  if (!channel) await connectRabbitMQ();
  if (!channel) return;
  try {
    await channel.assertExchange(exchange, 'topic', { durable: true });
    const q = await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(q.queue, exchange, routingKey);
    
    channel.consume(q.queue, (msg) => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());
        callback(data);
        channel.ack(msg);
      }
    });
    console.log(`👂 Subscribed to ${exchange} on queue ${queueName} with key ${routingKey}`);
  } catch (err) {
    console.error("❌ Error subscribing to event:", err.message);
  }
};
