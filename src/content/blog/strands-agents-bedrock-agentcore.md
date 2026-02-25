---
title: Building AI Agents with Strands Agents SDK and Amazon Bedrock AgentCore
description: A deep dive into AWS's open-source Strands Agents SDK and Amazon Bedrock AgentCore — how they work, agent architecture patterns, observability, and deploying production-grade AI agents on AWS.
date: 2026-01-17
tags: ['AWS', 'AI/ML', 'Amazon Bedrock', 'Serverless']
readingTime: 12
---

I've been spending a lot of time with AWS's new agent tooling lately. Two things in particular: the **Strands Agents SDK** (open-sourced in May 2025) and **Amazon Bedrock AgentCore** (went GA in October 2025). Used together, they give you a solid story for building and running AI agents in production.

Let me walk through both — what they actually are, how they fit together, and what I've learned using them.

---

## Strands Agents SDK — The "Just Give It Tools" Framework

The idea behind Strands is refreshingly simple. Instead of writing complex orchestration logic that says "first do this, then do that", you just give the agent a prompt and a list of tools, and let the LLM figure out the rest.

Every Strands agent has three things:
1. A language model (defaults to Claude on Bedrock, but you can swap it out)
2. A system prompt that defines what the agent is supposed to do
3. A set of tools — plain Python functions it can call

```python
from strands import Agent
from strands_tools import calculator

agent = Agent(tools=[calculator])
result = agent("What is the square root of 1764?")
print(result)
```

That's genuinely all you need to get started. The agent decides whether to use the calculator, when to use it, and how to weave the result into its answer. No routing code, no state machines.

---

## What You Can Do With It

### Defining Tools

Tools are just Python functions with a `@tool` decorator:

```python
from strands import tool

@tool
def get_order_status(order_id: str) -> str:
    """Returns the current status of an order."""
    # hit your database or API here
    return f"Order {order_id} is shipped and arriving tomorrow"
```

The docstring matters — the LLM reads it to understand when to use the tool.

Strands also supports **MCP (Model Context Protocol)**, which means you can plug in thousands of pre-built tools from the ecosystem without writing any integration code. And **A2A (Agent-to-Agent)** lets agents call other agents as tools, which is where things get interesting.

### Switching Models

```python
from strands.models import BedrockModel, AnthropicModel

# Use Claude on Bedrock
agent = Agent(model=BedrockModel(model_id="anthropic.claude-3-5-sonnet-20241022-v2:0"))

# Or hit Anthropic's API directly
agent = Agent(model=AnthropicModel(model_id="claude-3-5-sonnet-20241022"))
```

You can also use Ollama for local models, OpenAI, LlamaAPI — the framework doesn't care.

### Streaming

```python
for chunk in agent.stream("Summarise this document for me"):
    print(chunk, end="", flush=True)
```

---

## Architecture Patterns

This is where Strands gets genuinely powerful. There are four patterns I keep reaching for.

### Single Agent

The simplest case — one agent, a few tools. Works for most things.

```python
agent = Agent(
    system_prompt="You are a helpful customer support agent.",
    tools=[get_order_status, process_refund, send_email]
)
response = agent("My order hasn't arrived and I want a refund")
```

### Supervisor Agent (My Favourite)

This one clicked for me immediately. You have an orchestrator agent, and your specialist agents are just... tools. The orchestrator's LLM decides which specialist to call based on the question.

```python
from strands import Agent, tool

@tool
def research_assistant(query: str) -> str:
    """Answers research questions with citations."""
    agent = Agent(
        system_prompt="You are a research specialist. Always cite your sources.",
        tools=[retrieve, http_request]
    )
    return agent(query)

@tool
def math_assistant(problem: str) -> str:
    """Solves maths problems step by step."""
    agent = Agent(
        system_prompt="You are a maths specialist. Show your working.",
        tools=[calculator]
    )
    return agent(problem)

orchestrator = Agent(tools=[research_assistant, math_assistant])
response = orchestrator("What are the latest NASA Mars findings, and how long would it take to travel there at 20 km/s?")
```

The orchestrator figures out that this question has two parts, calls the right specialist for each, and combines the answers. You didn't write any routing logic — the model handled it.

### Multi-Agent Network (Swarm)

For problems where you want multiple agents working in parallel or building on each other's ideas:

```python
from strands_tools import agent_graph

network = agent_graph(
    agents=[
        {"name": "researcher", "prompt": "You find facts and supporting data."},
        {"name": "critic", "prompt": "You identify weaknesses and gaps."},
        {"name": "synthesiser", "prompt": "You combine inputs into a final answer."},
    ],
    topology="mesh"
)
```

I've used this for things like code review (one agent writes, another reviews, another suggests improvements) and it works surprisingly well.

### Hierarchical Agents

When you need multiple levels of delegation — an executive agent breaks down a big task, manager agents handle sub-tasks, worker agents do the actual work. Good for complex multi-stage workflows.

---

## Observability — The Part People Overlook

Most agent frameworks treat observability as an afterthought. Strands doesn't. It uses **OpenTelemetry** natively, so every agent run produces traces you can send to X-Ray, CloudWatch, Jaeger, or anything OTEL-compatible.

Each trace captures:
- Every LLM call — prompt, model params, token usage
- Every tool invocation — what was called, what came back, how long it took
- Cross-agent calls in multi-agent setups

```python
from strands.telemetry import configure_telemetry

configure_telemetry(
    otlp_endpoint="http://localhost:4317",
    service_name="my-agent"
)
```

When you need to debug agent behaviour in production, you can look at the trace and see exactly what the agent did — which tools it called, in what order, and what each one returned.

---

## Amazon Bedrock AgentCore — The Production Runtime

Strands gives you the framework. AgentCore gives you the infrastructure to run it properly.

Think of it as a managed, serverless runtime specifically designed for agent workloads. The things it handles that you'd otherwise have to build yourself:

| What | How |
|---|---|
| Long-running tasks | Up to 8 hours (agents aren't always quick) |
| Memory | Managed short-term and long-term memory across sessions |
| Auth | OAuth, Cognito, IAM |
| Tool access | MCP, A2A, API Gateway |
| Observability | CloudWatch + OTEL out of the box |
| Security | VPC isolation, encryption, Bedrock Guardrails |

### Deploying to AgentCore

```python
from strands import Agent
from strands_tools import calculator, http_request
from bedrock_agentcore import BedrockAgentCoreApp

agent = Agent(
    system_prompt="You are a helpful assistant.",
    tools=[calculator, http_request]
)

app = BedrockAgentCoreApp(agent)

if __name__ == "__main__":
    app.run()
```

```bash
agentcore deploy --name my-agent --region us-east-1
```

That's it. AgentCore handles scaling, cold starts, session management, and security. You just write the agent.

---

## Where to Deploy

| Option | When to use it |
|---|---|
| **Lambda** | Short tasks, event-driven, minimal ops overhead |
| **ECS / Fargate** | Long-running, stateful, streaming responses |
| **Bedrock AgentCore** | Production, when you want managed memory + auth + observability |
| **Local** | Development and testing |

Quick Lambda example:

```python
from strands import Agent
from strands_tools import calculator

agent = Agent(tools=[calculator])

def handler(event, context):
    response = agent(event.get("query", ""))
    return {"statusCode": 200, "body": str(response)}
```

---

## A Few Security Things Worth Knowing

- Only give agents the tools they actually need — don't hand everything to every agent
- Use Bedrock Guardrails to filter what goes in and what comes out
- Never put credentials in prompts or tool code — use Secrets Manager
- Validate user inputs before they reach the agent (prompt injection is real)
- Assign scoped IAM roles to your Lambda functions or containers

---

## Strands vs LangChain

| | Strands | LangChain |
|---|---|---|
| Philosophy | LLM decides the workflow | You define the workflow |
| AWS integration | First-class | Community-maintained |
| Multi-agent | Built-in patterns | LangGraph (explicit DAG) |
| Observability | Built-in OTEL | Third-party (Langfuse etc.) |
| Tool protocol | MCP + A2A | Custom integrations |

If you're building on AWS and want to get something working quickly without writing a lot of orchestration code, Strands is the better starting point. If you need very precise control over every step, or you have a lot of existing LangChain integrations, stick with LangChain.

They're not mutually exclusive either — you could use a LangChain chain as a Strands tool if you needed to.

---

## Quick Decision Guide

- Simple task with a few tools → single agent
- Complex task needing different expertise → supervisor pattern
- Parallel exploration or brainstorming → multi-agent swarm
- Multi-stage enterprise workflow → hierarchical agents
- Deploying to production on AWS → Bedrock AgentCore

---

## Getting Started

```bash
pip install strands-agents strands-agents-tools
```

```python
from strands import Agent
from strands_tools import calculator

agent = Agent(tools=[calculator])
print(agent("What is 25 * 48?"))
```

Useful links:
- [Strands Agents SDK docs](https://strandsagents.com/latest/)
- [Strands GitHub samples](https://github.com/strands-agents/samples)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)

Strands and AgentCore together give you a clear path from prototype to production on AWS — write your agent in Python, deploy it to a managed runtime, and scale without managing infrastructure.
