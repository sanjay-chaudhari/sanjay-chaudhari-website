---
title: "Building Minimal APIs in .NET 10: A Production-Ready Guide"
description: "How to build fast, clean, and production-ready REST APIs using ASP.NET Core 10 Minimal APIs — with validation, error handling, auth, and OpenAPI."
date: 2025-12-02
tags: [".NET 10", "ASP.NET Core", "API Design"]
readingTime: 10
---

Minimal APIs have matured significantly since their introduction in .NET 6. In .NET 10, they're genuinely production-ready with source generation, native AOT support, and a clean programming model. Here's how to build one properly.

## Project Setup

```bash
dotnet new webapi -n MyApi --use-minimal-apis
cd MyApi
```

Your `Program.cs` starts clean:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

var app = builder.Build();

app.MapOpenApi();
app.UseExceptionHandler();

app.Run();
```

---

## Organizing Routes

Don't dump everything in `Program.cs`. Use extension methods to group related endpoints:

```csharp
// Features/Users/UserEndpoints.cs
public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/users")
            .WithTags("Users")
            .RequireAuthorization();

        group.MapGet("/", GetAllUsers);
        group.MapGet("/{id:int}", GetUserById);
        group.MapPost("/", CreateUser);
        group.MapDelete("/{id:int}", DeleteUser);

        return app;
    }

    static async Task<Ok<List<UserDto>>> GetAllUsers(IUserService svc)
        => TypedResults.Ok(await svc.GetAllAsync());

    static async Task<Results<Ok<UserDto>, NotFound>> GetUserById(int id, IUserService svc)
    {
        var user = await svc.GetByIdAsync(id);
        return user is null ? TypedResults.NotFound() : TypedResults.Ok(user);
    }

    static async Task<Created<UserDto>> CreateUser(CreateUserRequest req, IUserService svc)
    {
        var user = await svc.CreateAsync(req);
        return TypedResults.Created($"/users/{user.Id}", user);
    }

    static async Task<Results<NoContent, NotFound>> DeleteUser(int id, IUserService svc)
    {
        var deleted = await svc.DeleteAsync(id);
        return deleted ? TypedResults.NoContent() : TypedResults.NotFound();
    }
}
```

Then in `Program.cs`:

```csharp
app.MapUserEndpoints();
```

## Why TypedResults?

Using `TypedResults` instead of `Results` gives you:
- Compile-time type checking on return types
- Accurate OpenAPI schema generation (the generator knows exactly what you return)
- Better testability

---

## Validation

Use `FluentValidation` or the new built-in endpoint filter approach:

```csharp
// Endpoint filter for validation
app.MapPost("/users", CreateUser)
   .AddEndpointFilter<ValidationFilter<CreateUserRequest>>();

// Generic validation filter
public class ValidationFilter<T>(IValidator<T> validator) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var arg = ctx.GetArgument<T>(0);
        var result = await validator.ValidateAsync(arg);

        if (!result.IsValid)
            return TypedResults.ValidationProblem(result.ToDictionary());

        return await next(ctx);
    }
}
```

---

## Error Handling

Use the built-in Problem Details middleware — it handles exceptions and returns RFC 9457-compliant error responses:

```csharp
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = ctx =>
    {
        ctx.ProblemDetails.Extensions["traceId"] = Activity.Current?.Id;
        ctx.ProblemDetails.Extensions["instance"] = ctx.HttpContext.Request.Path;
    };
});

app.UseExceptionHandler();
app.UseStatusCodePages();
```

For domain-specific errors, throw exceptions and map them:

```csharp
app.UseExceptionHandler(exApp =>
{
    exApp.Run(async ctx =>
    {
        var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
        var problemDetails = ex switch
        {
            NotFoundException e => new ProblemDetails { Status = 404, Title = "Not Found", Detail = e.Message },
            ValidationException e => new ProblemDetails { Status = 400, Title = "Validation Error", Detail = e.Message },
            _ => new ProblemDetails { Status = 500, Title = "Internal Server Error" }
        };
        ctx.Response.StatusCode = problemDetails.Status ?? 500;
        await ctx.Response.WriteAsJsonAsync(problemDetails);
    });
});
```

---

## Authentication & Authorization

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth:Authority"];
        options.Audience = builder.Configuration["Auth:Audience"];
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", p => p.RequireRole("admin"));
});

// In endpoints:
group.MapDelete("/{id:int}", DeleteUser)
     .RequireAuthorization("AdminOnly");
```

---

## OpenAPI & Documentation

.NET 10's built-in OpenAPI support is good enough for most cases:

```csharp
group.MapGet("/{id:int}", GetUserById)
     .WithName("GetUserById")
     .WithSummary("Get a user by ID")
     .WithDescription("Returns a single user or 404 if not found")
     .Produces<UserDto>(200)
     .Produces(404);
```

Access your docs at `/openapi/v1.json` and plug it into Scalar or Swagger UI.

---

## Performance Tips

1. Use `TypedResults` — enables source generation, avoids reflection
2. Use `ValueTask` for sync-heavy endpoints
3. Enable response compression: `app.UseResponseCompression()`
4. Use output caching for read-heavy endpoints: `.CacheOutput(p => p.Expire(TimeSpan.FromMinutes(5)))`

Minimal APIs with source generation in .NET 10 are genuinely fast — benchmarks show them competitive with Go and Rust frameworks on simple JSON endpoints.
