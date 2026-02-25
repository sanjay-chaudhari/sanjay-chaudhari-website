---
title: "What's New in .NET 10: The Features That Actually Matter"
description: "A practical look at the most impactful .NET 10 features — from performance improvements to new C# 14 language features and runtime changes."
date: 2025-11-15
tags: [".NET 10", "C#", "Performance"]
readingTime: 8
---

.NET 10 shipped in November 2025 and it's a Long Term Support (LTS) release — meaning it gets 3 years of support. If you're still on .NET 8, this is the one to plan your upgrade around.

Here's what actually matters in day-to-day development.

## C# 14: The Highlights

### Field-backed Properties

The most requested C# feature in years. You can now use `field` keyword inside property accessors to access the compiler-generated backing field:

```csharp
public class User
{
    public string Name
    {
        get;
        set => field = value.Trim();
    }
}
```

No more declaring a private `_name` field just to add validation in a setter. Clean and concise.

### Implicit Span Conversions

Working with `Span<T>` and `ReadOnlySpan<T>` is now much smoother. The compiler handles more implicit conversions, reducing the need for explicit casts in performance-sensitive code:

```csharp
void Process(ReadOnlySpan<byte> data) { ... }

byte[] buffer = new byte[1024];
Process(buffer); // works directly now
```

### `params` Collections

`params` now works with any collection type, not just arrays:

```csharp
void Log(params IEnumerable<string> messages) { ... }
void Log(params ReadOnlySpan<string> messages) { ... }
```

This is huge for performance — you can now write variadic methods that avoid heap allocations entirely.

---

## Runtime Performance

.NET 10 continues the trend of significant JIT improvements. Key wins:

- **Loop optimizations** — the JIT now vectorizes more loop patterns automatically using AVX-512 on supported hardware
- **Inlining improvements** — more aggressive inlining of small methods, especially in hot paths
- **GC improvements** — reduced pause times in server GC mode, better for latency-sensitive APIs

Benchmarks from the .NET team show 10-15% throughput improvements on typical web API workloads compared to .NET 8.

---

## ASP.NET Core 10

### OpenAPI 3.1 by Default

The built-in OpenAPI support (introduced in .NET 9) now generates OpenAPI 3.1 documents by default. This matters because 3.1 aligns with JSON Schema, making your API docs more compatible with tooling like Postman, Stoplight, and code generators.

```csharp
builder.Services.AddOpenApi();

app.MapOpenApi(); // serves at /openapi/v1.json
```

### Minimal API Improvements

Request delegate generator (RDG) is now on by default for all minimal API projects. This means your minimal API handlers are source-generated at compile time — no reflection at runtime, faster startup, AOT-friendly.

```csharp
app.MapGet("/users/{id}", (int id, IUserService svc) => svc.GetById(id));
// ↑ fully source-generated, zero reflection
```

---

## Entity Framework Core 10

### ExecuteUpdateAsync with Complex Types

You can now use `ExecuteUpdateAsync` with complex type properties:

```csharp
await context.Users
    .Where(u => u.IsInactive)
    .ExecuteUpdateAsync(s => s
        .SetProperty(u => u.Status, UserStatus.Archived)
        .SetProperty(u => u.ArchivedAt, DateTime.UtcNow));
```

### LINQ Translation Improvements

More LINQ expressions now translate to SQL instead of falling back to client-side evaluation. The team specifically improved `DateOnly`/`TimeOnly` operations and string manipulation methods.

---

## Should You Upgrade?

If you're on .NET 8 (LTS): plan for it, but no rush — .NET 8 support runs until November 2026.

If you're on .NET 9 (STS): yes, upgrade. .NET 9 support ends May 2026.

For new projects: start on .NET 10. It's the current LTS and you get all the improvements from day one.

The upgrade path from .NET 8 → 10 is straightforward for most projects. The breaking changes list is short and mostly edge cases.
