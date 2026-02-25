---
title: AWS Certified Solutions Architect Associate — Study Notes
description: Key concepts and service summaries for the AWS SAA-C03 exam. A quick revision guide covering networking, compute, storage, security, and more.
date: 2022-03-15
tags: ['AWS', 'Cloud', 'Certification']
readingTime: 15
---

These are study notes I created while preparing for the **AWS Certified Solutions Architect Associate** exam. I hope they help with revision of important topics before your exam.

---

## Networking

### AWS Direct Connect
Establishes a dedicated private network connection between your on-premises network and AWS. Uses industry-standard 802.1q VLANs and can be partitioned into multiple virtual interfaces. Does **not** traverse the public internet — traffic flows over dedicated, private connections between your intranet and Amazon VPC.

### AWS Site-to-Site VPN
Securely connects your on-premises network or branch office to your Amazon VPC over the **internet** using IPSec encryption. Use this when you need an encrypted tunnel but don't require a dedicated physical connection.

### AWS Transit Gateway
Connects multiple Amazon VPCs and on-premises networks through a single central gateway (hub-and-spoke model). You only need one connection from each network to the Transit Gateway — not a full mesh between every network. Simplifies management and reduces operational costs at scale.

### AWS Global Accelerator
Routes user traffic to the optimal endpoint based on performance, reacting instantly to changes in application health and user location. Best suited for **non-HTTP use cases** such as gaming (UDP), IoT (MQTT), or Voice over IP.

### Private IP Ranges

| Range | Size | Typical Use |
|---|---|---|
| `10.0.0.0 – 10.255.255.255` | 16,777,216 IPs | Large enterprise networks |
| `172.16.0.0 – 172.31.255.255` | 1,048,576 IPs | AWS default VPC |
| `192.168.0.0 – 192.168.255.255` | 65,536 IPs | Home networks |

---

## Route 53

### Routing Policies

- **Simple** — Single resource for a given function (e.g. one web server).
- **Failover** — Active-passive failover configuration.
- **Geolocation** — Route based on the **location of your users**.
- **Geoproximity** — Route based on the **location of your resources**, with optional bias to shift traffic between regions.
- **Latency** — Route to the AWS Region with the lowest round-trip latency.
- **Multivalue Answer** — Returns up to 8 healthy records at random.
- **Weighted** — Split traffic across multiple resources in defined proportions.

### TTL (Time to Live)
How long DNS resolvers cache a record. Longer TTL = fewer Route 53 queries = lower latency and cost. Shorter TTL = faster propagation of changes.

> Route 53 does **not** charge for alias queries to AWS resources, but **does** charge for CNAME queries.

---

## Compute

### Amazon EC2

**User Data**
- Used to run scripts or cloud-init directives on first launch.
- Scripts run with **root privileges** — no `sudo` needed.
- By default, runs **only on first boot**. Can be configured to run on every restart.

**Instance Store**
- Temporary block-level storage physically attached to the host.
- Ideal for buffers, caches, scratch data, and replicated data (e.g. load-balanced web servers).
- Data is **lost when the instance stops or terminates**.
- Included in instance usage cost. High I/O performance with NVMe/SSD-based instances.

**Hibernate**
Saves RAM contents to the EBS root volume. On restart: EBS root volume is restored, RAM is reloaded, processes resume, and the instance retains its instance ID.

**EC2 Dedicated Hosts**
Physical servers dedicated to your use. Lets you use existing server-bound software licenses (e.g. Windows Server) and meet corporate compliance requirements.

**Placement Groups**
- **Cluster** — Packs instances close together in one AZ for low-latency, high-throughput HPC workloads.
- **Spread** — Spreads instances across distinct hardware to minimise correlated failures.
- **Partition** — Divides instances into logical partitions on separate racks.

**Auto Scaling Groups**
- Associated with one launch configuration at a time; launch configurations are immutable.
- To change config: create a new launch configuration, update the ASG to use it. Existing instances are unaffected until replaced.
- When multiple scaling policies trigger simultaneously, ASG uses the policy that provides the **largest capacity**.
- **Lifecycle hooks** let you pause instances during launch or termination to run custom scripts (e.g. install software, collect logs).

### Amazon Elastic Beanstalk
End-to-end web application management. Upload your code — Beanstalk handles provisioning, load balancing, auto-scaling, and health monitoring. Supports Java, .NET, PHP, Node.js, Python, Ruby, Go, and Docker. **No additional charge** — you pay only for the underlying AWS resources.

### AWS OpsWorks
Configuration management using managed **Chef** and **Puppet**. Automates server configuration, deployment, and management across EC2 and on-premises environments. Three offerings: OpsWorks for Chef Automate, OpsWorks for Puppet Enterprise, and OpsWorks Stacks.

---

## Containers & Serverless

| Service | Purpose |
|---|---|
| **ECS** | Docker container management on AWS. Helps build microservices. |
| **ECR** | Docker image registry on AWS. Push and pull images. |
| **Step Functions** | Orchestrate Lambda functions and ECS containers into workflows. |
| **SWF** | Legacy workflow orchestration service. |

---

## Storage

### Amazon S3

**S3 Object Lock**
Store objects using a write-once-read-many (WORM) model. Prevents deletion or overwriting for a fixed period or indefinitely.
- **Compliance mode** — No user, including root, can delete objects during the retention period. Use for regulatory WORM requirements.
- **Governance mode** — Users with special permissions can override retention settings.

**Bucket Policy**
Resource-based policy for granting permissions. Required for **cross-account access** — you cannot use IAM policies alone for cross-account S3 permissions.

**S3 Sync**
Copies objects between S3 buckets using `CopyObject` APIs. Only copies the **current version** of objects (not previous versions). Preserves metadata; resets ACLs to `FULL_CONTROL` for your account.

```bash
aws s3 sync s3://SOURCE-BUCKET s3://TARGET-BUCKET
```

### Amazon EFS — Standard-IA Storage Class
File storage for EC2, containers, and serverless. Standard-IA reduces costs for infrequently accessed files without sacrificing availability, durability, or POSIX semantics. Recommended when you need the full dataset accessible but want automatic cost savings for cold files.

### Tape Gateway
Replaces physical on-premises tapes with virtual tapes in AWS — no changes to existing backup workflows required.

---

## Databases

### RDS

**Read Replicas Encryption**
If the master DB is encrypted, read replicas are also encrypted.

**IAM Database Authentication**
Supported for **MySQL and PostgreSQL**. Authenticate using an IAM-generated token instead of a password.

**RDS Port Reference**

| Database | Port |
|---|---|
| PostgreSQL | 5432 |
| MySQL | 3306 |
| MariaDB | 3306 |
| Oracle RDS | 1521 |
| MSSQL Server | 1433 |
| Aurora (MySQL-compatible) | 3306 |
| Aurora (PostgreSQL-compatible) | 5432 |

### Aurora Multi-Master
All DB instances can perform **write operations**. No failover delay — another writer immediately takes over. AWS calls this **continuous availability**, distinct from standard high availability with brief failover downtime.

### Amazon ElastiCache for Redis
Sub-millisecond in-memory data store. Ideal for caching, sessions, leaderboards, geospatial, queues, real-time analytics, and pub/sub messaging. Supports replication, high availability, and cluster sharding.
- **IAM Auth is not supported** — use Redis authentication tokens (passwords) instead.

---

## Security & Identity

### Security Groups vs Network ACLs

| | Security Groups | Network ACLs |
|---|---|---|
| State | **Stateful** | **Stateless** |
| Rules | Permissive only (allow) | Allow and deny |
| Outbound | All outbound allowed by default | Must explicitly allow outbound |

### AWS Secrets Manager
Manages rotation, retrieval, and lifecycle of secrets (DB credentials, API keys). Built-in rotation support for RDS, Redshift, and DocumentDB. Applications call the Secrets Manager API — no hardcoded credentials.

### AWS WAF
Allows or blocks web requests based on IP addresses (up to 10,000 IPs per condition), headers, URI strings, and more.

### AWS Firewall Manager
Centrally configure and manage WAF rules, Shield Advanced, security groups, Network Firewall rules, and Route 53 Resolver DNS Firewall rules across all accounts in AWS Organizations.

### IAM Trust Policy
Defines which principals (accounts, users, roles, federated users) can assume an IAM role. Every IAM role requires both a **trust policy** and an **identity-based policy**.

### Amazon GuardDuty
Detects anomalies and malicious activity by analysing **CloudTrail event logs**, **VPC Flow Logs**, and **DNS logs**. Also monitors for malicious activity on S3.

### Amazon Macie
Uses machine learning to discover and protect sensitive data in S3. Automatically inventories buckets, flags unencrypted or publicly accessible buckets, and alerts on PII.

---

## Messaging & Queues

### SQS — Delay Queues
Postpone delivery of new messages for up to **15 minutes** (default: 0 seconds). Messages remain invisible to consumers during the delay period.

### SQS — FIFO Queues
- Queue name must end with `.fifo`.
- Throughput: up to **300 msg/s** without batching, **3,000 msg/s** with batching.
- Guarantees exactly-once processing and strict ordering.

---

## Deployment & CI/CD

| Service | Purpose |
|---|---|
| **CodeCommit** | Git-based source code repository (similar to GitHub) |
| **CodeBuild** | Build and test service for CI/CD pipelines |
| **CodeDeploy** | Deploy packaged code to EC2 and Lambda |
| **CodePipeline** | Orchestrate CI/CD pipeline stages and approvals |
| **CloudFormation** | Infrastructure as Code — declarative resource management |

### Blue/Green Deployment
- **Blue** = currently running version
- **Green** = new version

Traffic is gradually shifted from blue to green after validation. Enables zero-downtime deployments and instant rollback.

---

## Monitoring & Observability

### AWS X-Ray
Analyses and debugs distributed applications (microservices). Provides end-to-end request tracing and a service map. Can collect data **across AWS accounts** by assuming a cross-account role.

### AWS CloudTrail
Logs all API activity across your AWS account. Enables governance, compliance, and operational auditing.

### AWS Trusted Advisor
Evaluates your account against AWS best practices across five categories: cost optimisation, security, fault tolerance, performance, and service quotas.
- **Basic/Developer** support: core security checks + service quota checks.
- **Business/Enterprise** support: all checks.

---

## Other Services

### Amazon EventBridge
Event-based service that integrates directly with **third-party SaaS partners** and automatically ingests events from 90+ AWS services. Recommended for building event-driven applications reacting to SaaS or AWS events.

### API Gateway — Caching
Enable response caching per stage to reduce calls to your backend and improve latency. Configure a TTL (in seconds) for cached responses.

### Amazon Machine Image (AMI)
Provides the configuration to launch an EC2 instance. AMIs are **region-specific** — copy them across regions for disaster recovery.

### Connection Draining (ELB)
Ensures the load balancer completes in-flight requests to de-registering or unhealthy instances before stopping traffic. Configurable timeout: **1–3,600 seconds** (default: 300 seconds).

### Spot Fleet
Selects Spot Instance pools to meet target capacity. By default, maintains target capacity by launching replacements when Spot Instances are terminated.

### Heterogeneous Database Migration
Two-step process:
1. **AWS Schema Conversion Tool (SCT)** — convert source schema to target DB format.
2. **AWS Database Migration Service (DMS)** — migrate data from source to target.

### AWS OpsHub
GUI for managing AWS Snowball devices. Supports Snowball Edge Storage Optimized and Compute Optimized devices. Enables device unlock, data transfer, application launch, and metric monitoring without the CLI.

### Amazon AppSync
GraphQL as a managed service on AWS.

### AWS SSO (Single Sign-On)
Centralised login for SAML 2.0-compatible business applications (e.g. Office 365) managed by AWS.

### Amazon Workspaces
Virtual Desktop Infrastructure (VDI) in the cloud. Replaces traditional on-premises VDI.

### Amazon EMR
Managed Hadoop/Spark clusters on EC2 for big data processing.

### AWS Glue
Managed ETL (Extract, Transform, Load) service.

### Amazon ElasticTranscoder
Managed media conversion service — converts video and audio into optimised formats.

### AWS Organizations
Hierarchy and centralised management of multiple AWS accounts.

---

Good luck with your exam! If you found these notes helpful, feel free to share them.
