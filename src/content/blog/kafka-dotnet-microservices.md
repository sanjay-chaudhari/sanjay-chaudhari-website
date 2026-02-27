---
title: "Building Production-Ready Kafka Microservices with .NET and AWS MSK"
description: "A practical walkthrough of building an event-driven order processing system using Apache Kafka, .NET, and AWS MSK — with real delivery guarantees and Terraform infrastructure."
date: 2026-01-29
tags: [".NET", "Kafka", "Microservices", "AWS", "Terraform"]
readingTime: 12
---

Event-driven architecture sounds straightforward until you actually build it. Kafka is powerful, but getting producers, consumers, delivery guarantees, and cloud infrastructure right takes more than a hello-world tutorial. This post walks through a real implementation — an order processing system — built with .NET, Apache Kafka, and Terraform for AWS MSK.

## The Use Case

A customer places an order. Multiple downstream systems need to react — inventory, payment, notifications. Rather than chaining synchronous HTTP calls, we publish an event to Kafka and let each consumer handle its own concern independently.

```
POST /api/v1/orders
        │
        ▼
 OrderService.API  ──── Kafka Producer ────► order.created
                                                    │
                                                    ▼
                                        OrderService.Consumer
                                        (inventory → payment → status)
                                                    │
                                                    ▼
                                        order.status.updated
```

Two services. One topic in, one topic out.

---

## Project Structure

```
src/
  OrderService.Core/           # Domain models, events, interfaces
  OrderService.Infrastructure/ # Kafka producer, consumer base, repository
  OrderService.API/            # REST API + Kafka producer
  OrderService.Consumer/       # Background worker + order handler
tests/
  OrderService.API.Tests/
  OrderService.Consumer.Tests/
terraform/
  modules/networking/          # VPC, subnets, NAT
  modules/msk/                 # AWS MSK cluster
  modules/ecs/                 # ECS Fargate services, ALB, auto-scaling
docker-compose.yml             # Local Kafka + Zookeeper + Kafka UI
```

The Kafka producer lives in `OrderService.Infrastructure` — both the API and Consumer need to produce messages, so it's a shared class library. The Consumer is a long-running `BackgroundService` with its own process lifecycle.

---

## The Kafka Producer

The producer wraps `Confluent.Kafka` with three production concerns: idempotency, structured logging, and proper disposal.

```csharp
public sealed class KafkaProducer : IKafkaProducer, IDisposable
{
    private readonly IProducer<string, string> _producer;
    private readonly ILogger<KafkaProducer> _logger;

    public KafkaProducer(IOptions<KafkaSettings> settings, ILogger<KafkaProducer> logger)
    {
        _logger = logger;
        var config = new ProducerConfig
        {
            BootstrapServers = settings.Value.BootstrapServers,
            Acks = Acks.All,
            EnableIdempotence = true,
            MaxInFlight = 5,
            RetryBackoffMs = 500,
            MessageSendMaxRetries = 3
        };

        _producer = new ProducerBuilder<string, string>(config)
            .SetErrorHandler((_, e) => logger.LogError("Kafka error: {Reason}", e.Reason))
            .Build();
    }

    public async Task ProduceAsync<T>(string topic, string key, T message, CancellationToken ct = default)
        where T : class
    {
        var result = await _producer.ProduceAsync(topic, new Message<string, string>
        {
            Key = key,
            Value = JsonSerializer.Serialize(message)
        }, ct);

        _logger.LogInformation("Produced to {Topic} partition {Partition} offset {Offset}",
            result.Topic, result.Partition.Value, result.Offset.Value);
    }

    public void Dispose()
    {
        _producer.Flush(TimeSpan.FromSeconds(10)); // drain in-flight messages
        _producer.Dispose();
    }
}
```

`Acks.All` waits for all in-sync replicas to acknowledge. Combined with `min.insync.replicas=2` on the topic, you get durability even if one broker goes down. `EnableIdempotence` assigns a sequence number to each message — retries won't produce duplicates. `Flush` on dispose is critical; without it, in-flight messages are lost on shutdown.

---

## The Consumer Base Class

A generic base class handles the lifecycle so concrete consumers only implement `ProcessAsync`:

```csharp
public abstract class KafkaConsumerBase<TMessage> : BackgroundService where TMessage : class
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var consumer = new ConsumerBuilder<string, string>(BuildConsumerConfig()).Build();
        consumer.Subscribe(_topic);

        while (!stoppingToken.IsCancellationRequested)
        {
            var result = consumer.Consume(stoppingToken);

            try
            {
                var message = JsonSerializer.Deserialize<TMessage>(result.Message.Value);
                await ProcessAsync(message!, result.Message.Key, stoppingToken);
                consumer.Commit(result); // commit only after success
            }
            catch (JsonException ex)
            {
                await HandleDeadLetterAsync(result.Message.Value, ex, stoppingToken);
                consumer.Commit(result); // commit poison messages — don't block the partition
            }
            catch (Exception)
            {
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                // do NOT commit — message reprocessed on restart
            }
        }

        consumer.Close(); // graceful rebalance
    }

    protected abstract Task ProcessAsync(TMessage message, string key, CancellationToken ct);
}
```

The commit strategy matters:
- **Success** → commit
- **Deserialization failure** → dead-letter + commit (a malformed message will never succeed)
- **Processing failure** → no commit (redelivered on restart)

`consumer.Close()` triggers a graceful group rebalance so other consumers pick up partitions immediately rather than waiting for session timeout.

---

## The Order Handler

The concrete consumer uses scoped DI per message — important for handlers with scoped dependencies like database contexts:

```csharp
public sealed class OrderCreatedConsumer : KafkaConsumerBase<OrderCreatedEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override async Task ProcessAsync(OrderCreatedEvent message, string key, CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var handler = scope.ServiceProvider.GetRequiredService<IOrderProcessingHandler>();
        await handler.HandleAsync(message, ct);
    }
}
```

The handler runs the pipeline — confirm, inventory check, payment — publishing an `order.status.updated` event after each transition. Downstream services subscribe to that topic independently.

---

## Running Locally

```bash
# Start Kafka infrastructure
docker compose up -d zookeeper kafka kafka-ui

# Terminal 1 — API
dotnet run --project src/OrderService.API --urls http://localhost:5000

# Terminal 2 — Consumer
dotnet run --project src/OrderService.Consumer
```

Place an order:

```bash
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-001",
    "items": [{ "productId": "prod-abc", "productName": "Headphones", "quantity": 2, "unitPrice": 49.99 }]
  }'
```

Verify zero consumer lag:

```bash
docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 \
  --describe --group order-processing-group

# GROUP                   TOPIC          PARTITION  LAG
# order-processing-group  order.created  0          0
```

Kafka UI at `http://localhost:8080` gives a visual view of topics, messages, and consumer group offsets.

---

## AWS Infrastructure with Terraform

The Terraform setup provisions everything — no manual console clicks.

MSK cluster configuration:

```hcl
resource "aws_msk_cluster" "main" {
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3

  client_authentication {
    sasl { scram = true }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }
}

resource "aws_msk_configuration" "main" {
  server_properties = <<-EOT
    auto.create.topics.enable=false
    default.replication.factor=3
    min.insync.replicas=2
    num.partitions=6
    log.retention.hours=168
  EOT
}
```

`auto.create.topics.enable=false` in production — topics should be created explicitly with the right partition count and replication factor.

Kafka credentials are injected into ECS containers from Secrets Manager:

```hcl
secrets = [
  { name = "Kafka__SaslUsername", valueFrom = "${var.kafka_secret_arn}:username::" },
  { name = "Kafka__SaslPassword", valueFrom = "${var.kafka_secret_arn}:password::" }
]
```

The `Kafka__` prefix maps directly to `KafkaSettings` via .NET's configuration system — double underscore is the section separator for nested config.

---

## Key Settings at a Glance

| Concern | Setting | Why |
|---|---|---|
| Durability | `acks=all` | All ISR replicas must acknowledge |
| Deduplication | `enable.idempotence=true` | Safe retries without duplicates |
| Reliability | `enable.auto.commit=false` | Commit only after successful processing |
| Poison messages | Dead-letter + commit | Don't block the partition forever |
| Replication | `replication.factor=3`, `min.insync.replicas=2` | Survive one broker failure |
| Security | SASL/SCRAM + TLS | Encrypted and authenticated on MSK |

---

## What's Next

A few intentional extension points in this implementation:

- **Outbox pattern** — for true end-to-end exactly-once, write the order and event in a single DB transaction, with a relay process publishing to Kafka
- **Schema Registry** — Confluent Schema Registry with Avro or Protobuf prevents breaking schema changes from reaching consumers
- **Dead-letter topic** — publish poison messages to `order.created.dlq` so they can be inspected and replayed, rather than just logged

Kafka's learning curve is real, but the patterns are consistent once you understand them. Get the delivery semantics right, handle failures explicitly, and the rest is just domain logic.
