---
title: Essential EF Core & .NET CLI Commands Reference
description: A comprehensive reference guide for Entity Framework Core and .NET CLI commands every .NET developer should know.
date: 2022-01-29
tags: ['.NET', 'EF Core', 'CLI']
readingTime: 8
---

The .NET CLI is a cross-platform toolchain for developing, building, running, and publishing .NET applications. Entity Framework Core is a lightweight, extensible, open-source ORM for .NET. This post is a practical reference for the commands you'll reach for most often.

---

## Entity Framework Core

Install `dotnet-ef` as a global tool:

```bash
dotnet tool install --global dotnet-ef
```

Update to the latest version:

```bash
dotnet tool update --global dotnet-ef
```

Verify the installation:

```bash
dotnet ef
```

### Migrations

Add a migration:

```bash
dotnet ef migrations add InitialCreate
```

List all migrations and their status:

```bash
dotnet ef migrations list
```

Remove the last migration (only if not applied to DB):

```bash
dotnet ef migrations remove
```

Apply all pending migrations:

```bash
dotnet ef database update
```

Apply migrations up to a specific migration:

```bash
dotnet ef database update <MigrationName>
```

Roll back all migrations:

```bash
dotnet ef database update 0
```

Drop the database:

```bash
dotnet ef database drop
```

Generate a SQL script from migrations (useful for production deployments):

```bash
dotnet ef migrations script
```

Generate a SQL script from a specific migration range:

```bash
dotnet ef migrations script FromMigration ToMigration
```

Generate an idempotent SQL script (safe to run multiple times):

```bash
dotnet ef migrations script --idempotent
```

### DbContext

List all discovered DbContext types in the project:

```bash
dotnet ef dbcontext list
```

Display information about a DbContext type:

```bash
dotnet ef dbcontext info
```

Scaffold a `DbContext` and entity types from an existing database:

```bash
dotnet ef dbcontext scaffold \
  "Server=.\SQLEXPRESS;Database=MyDB;Trusted_Connection=True;" \
  Microsoft.EntityFrameworkCore.SqlServer \
  -o Models
```

Scaffold and overwrite existing files:

```bash
dotnet ef dbcontext scaffold "..." Microsoft.EntityFrameworkCore.SqlServer -o Models --force
```

Scaffold only specific tables:

```bash
dotnet ef dbcontext scaffold "..." Microsoft.EntityFrameworkCore.SqlServer --table Orders --table Products
```

Optimize the DbContext for compiled models (improves startup performance):

```bash
dotnet ef dbcontext optimize
```

---

## .NET CLI

### Environment & Info

Check your .NET installation and machine environment:

```bash
dotnet --info
```

List all installed .NET SDK versions:

```bash
dotnet --list-sdks
```

List all installed .NET runtimes:

```bash
dotnet --list-runtimes
```

Check the .NET version:

```bash
dotnet --version
```

### Project & Solution Creation

List all available project templates:

```bash
dotnet new --list
```

Create a new project from a template:

```bash
dotnet new <template>

# Examples
dotnet new console --framework net9.0
dotnet new webapi --framework net9.0
dotnet new classlib --framework net9.0
dotnet new blazorwasm
dotnet new mvc
dotnet new razor
dotnet new worker
dotnet new grpc
```

Create a new solution:

```bash
dotnet new sln --name MySolution
```

Add a project to a solution:

```bash
dotnet sln MySolution.sln add src/MyProject/MyProject.csproj
```

Remove a project from a solution:

```bash
dotnet sln MySolution.sln remove src/MyProject/MyProject.csproj
```

List projects in a solution:

```bash
dotnet sln MySolution.sln list
```

### Build & Run

Restore NuGet packages:

```bash
dotnet restore
```

Build a project or solution:

```bash
dotnet build
dotnet build solution.sln
dotnet build --configuration Release
```

Run the project:

```bash
dotnet run
dotnet run --configuration Release
dotnet run --project src/MyProject/MyProject.csproj
```

Run with hot reload:

```bash
dotnet watch run
dotnet watch --project src/MyProject/MyProject.csproj
```

Clean build outputs:

```bash
dotnet clean
dotnet clean --configuration Release
```

### Publish

Publish for deployment:

```bash
dotnet publish
dotnet publish --configuration Release
dotnet publish -r win-x64 --self-contained
dotnet publish -r linux-x64 --self-contained
dotnet publish -r osx-x64 --self-contained
```

Publish as a single file:

```bash
dotnet publish -r win-x64 -p:PublishSingleFile=true --self-contained false
```

Publish with Native AOT (requires .NET 7+):

```bash
dotnet publish -r win-x64 -p:PublishAot=true
```

### Testing

Run all tests:

```bash
dotnet test
dotnet test solution.sln
dotnet test --configuration Release
```

Run tests with a filter:

```bash
dotnet test --filter "FullyQualifiedName~MyTest"
dotnet test --filter "Category=Unit"
```

Run tests with detailed output:

```bash
dotnet test --logger "console;verbosity=detailed"
```

Collect code coverage:

```bash
dotnet test --collect:"XPlat Code Coverage"
```

### Package Management

Add a NuGet package:

```bash
dotnet add package Newtonsoft.Json
dotnet add package Newtonsoft.Json --version 13.0.3
```

Remove a NuGet package:

```bash
dotnet remove package Newtonsoft.Json
```

List all packages in a project:

```bash
dotnet list package
```

List outdated packages:

```bash
dotnet list package --outdated
```

List packages with known vulnerabilities:

```bash
dotnet list package --vulnerable
```

### Project References

Add a project reference:

```bash
dotnet add reference ../MyLibrary/MyLibrary.csproj
```

Remove a project reference:

```bash
dotnet remove reference ../MyLibrary/MyLibrary.csproj
```

List all project references:

```bash
dotnet list reference
```

### Tools

Install a local or global tool:

```bash
dotnet tool install --global <toolname>
dotnet tool install --local <toolname>
```

Update a tool:

```bash
dotnet tool update --global <toolname>
```

Uninstall a tool:

```bash
dotnet tool uninstall --global <toolname>
```

List installed tools:

```bash
dotnet tool list --global
dotnet tool list --local
```

Restore local tools (from `.config/dotnet-tools.json`):

```bash
dotnet tool restore
```

### User Secrets (Development)

Initialize user secrets for a project:

```bash
dotnet user-secrets init
```

Set a secret:

```bash
dotnet user-secrets set "ConnectionStrings:Default" "Server=.;Database=MyDB;"
```

List all secrets:

```bash
dotnet user-secrets list
```

Remove a secret:

```bash
dotnet user-secrets remove "ConnectionStrings:Default"
```

Clear all secrets:

```bash
dotnet user-secrets clear
```

### Certificates (HTTPS Development)

Trust the ASP.NET Core development certificate:

```bash
dotnet dev-certs https --trust
```

Check certificate status:

```bash
dotnet dev-certs https --check
```

Clean and regenerate the certificate:

```bash
dotnet dev-certs https --clean
dotnet dev-certs https --trust
```

### Format & Code Quality

Format code (requires `dotnet-format` or .NET 6+):

```bash
dotnet format
dotnet format --verify-no-changes
```

---

Bookmark this page — these are the commands you'll use on every .NET project.
