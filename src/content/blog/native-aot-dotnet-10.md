---
title: "Native AOT in .NET 10: When to Use It and When to Skip It"
description: "Native AOT compiles your .NET app to a self-contained native binary. Here's a practical guide on what it means, the trade-offs, and whether it's right for your project."
date: 2025-12-20
tags: [".NET 10", "Native AOT", "Performance"]
readingTime: 7
---

Native AOT (Ahead-of-Time compilation) has been available since .NET 7, but .NET 10 is the first release where it feels genuinely production-ready for web APIs. Let me break down what it actually means and when you should care.

## What is Native AOT?

Normally, .NET compiles your C# to IL (Intermediate Language), and the JIT (Just-In-Time) compiler converts that to native machine code at runtime. This gives you great performance after warmup, but:

- Startup takes time (JIT compilation)
- Memory footprint includes the JIT compiler itself
- The runtime must be present on the target machine

Native AOT flips this: your entire app — including the runtime — is compiled to a native binary at build time. The result is:

- **Instant startup** (no JIT warmup)
- **Smaller memory footprint**
- **Single self-contained binary**
- **No .NET runtime required on target**

## Enabling Native AOT

```xml
<!-- In your .csproj -->
<PropertyGroup>
  <PublishAot>true</PublishAot>
</PropertyGroup>
```

Publish:

```bash
dotnet publish -c Release -r linux-x64
```

That's it. You get a single native binary.

---

## Real Numbers

For a typical ASP.NET Core minimal API in .NET 10:

| Metric | JIT | Native AOT |
|--------|-----|------------|
| Startup time | ~200ms | ~10ms |
| Memory (idle) | ~50MB | ~15MB |
| Binary size | ~100MB (with runtime) | ~12MB |
| Throughput (req/s) | Excellent (after warmup) | Excellent |

The throughput difference is minimal for long-running services — JIT catches up after warmup. The real wins are startup and memory.

---

## The Trade-offs

Native AOT isn't free. Here's what you give up:

### No Runtime Reflection

This is the big one. AOT requires the compiler to know everything at compile time. Dynamic reflection — loading types by name, creating instances dynamically — doesn't work.

```csharp
// This breaks with AOT:
var type = Type.GetType("MyApp.SomeService");
var instance = Activator.CreateInstance(type);
```

Most modern libraries have AOT-compatible modes, but some older ones don't.

### No Dynamic Code Generation

`System.Reflection.Emit`, `Expression.Compile()`, and similar APIs are unavailable. This affects some serializers and ORMs.

### Longer Build Times

AOT compilation is slow. A project that builds in 5 seconds with JIT might take 60+ seconds with AOT. This matters for CI/CD pipelines.

### Trimming Warnings

AOT requires trimming (removing unused code). You'll get warnings for code paths the trimmer can't analyze statically. These need to be fixed or suppressed.

---

## What Works Well with AOT in .NET 10

### Minimal APIs (Source Generated)

```csharp
// This is fully AOT-compatible in .NET 10
app.MapGet("/health", () => TypedResults.Ok(new { status = "healthy" }));
app.MapGet("/users/{id}", (int id, IUserService svc) => svc.GetById(id));
```

The request delegate generator (RDG) source-generates all the routing and binding code — no reflection needed.

### System.Text.Json with Source Generation

```csharp
[JsonSerializable(typeof(UserDto))]
[JsonSerializable(typeof(List<UserDto>))]
public partial class AppJsonContext : JsonSerializerContext { }

// Register it:
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
});
```

This generates all serialization code at compile time. Fast and AOT-safe.

### Dapper (with limitations)

Dapper works with AOT if you avoid dynamic SQL and use typed queries. The newer `Dapper.AOT` package makes this explicit.

---

## What Doesn't Work (Yet)

- **Entity Framework Core** — EF Core is not AOT-compatible. Use Dapper or raw ADO.NET for AOT scenarios.
- **AutoMapper** — uses reflection heavily. Use manual mapping or `Mapperly` (source-generated mapper).
- **MediatR** — the classic version uses reflection. `Mediator` (source-generated alternative) works with AOT.

---

## When Should You Use Native AOT?

**Good fit:**
- Serverless functions (AWS Lambda, Azure Functions) — cold start matters
- CLI tools and utilities
- Microservices with simple data access (no EF Core)
- Container workloads where memory density matters

**Skip it if:**
- You use EF Core (wait for EF Core AOT support)
- Your codebase relies on reflection-heavy libraries
- You need fast iteration — AOT build times slow you down
- You're building a monolith — JIT performance is excellent for long-running services

---

## My Take

For new microservices in .NET 10, I'd evaluate AOT seriously — especially for anything running on Lambda or in a high-density container environment. The startup and memory wins are real.

For existing apps with EF Core, wait. The ecosystem isn't fully there yet, and the migration cost isn't worth it until EF Core has proper AOT support.

The good news: .NET 10 has made AOT significantly more approachable. The tooling, warnings, and library compatibility are all better than .NET 8. It's no longer experimental — it's a real option.
