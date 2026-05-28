using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using Taskflow.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var connectionString =
    builder.Configuration.GetConnectionString("Default")
    ?? Environment.GetEnvironmentVariable("TASKFLOW_CONNECTION_STRING")
    ?? "Data Source=taskflow.db";

builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connectionString));

var allowedOriginsRaw =
    builder.Configuration["Cors:AllowedOrigins"]
    ?? Environment.GetEnvironmentVariable("TASKFLOW_ALLOWED_ORIGINS")
    ?? "http://localhost:5173";

var allowedOrigins = allowedOriginsRaw
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.EnsureCreated();

    // if local DB schema is stale, recreate it.
    try
    {
        _ = db.Users.Any();
    }
    catch (SqliteException ex) when (ex.SqliteErrorCode == 1 && ex.Message.Contains("no such table"))
    {
        db.Database.EnsureDeleted();
        db.Database.EnsureCreated();
    }

    if (!db.Users.Any())
    {
        db.Users.Add(new()
        {
            Email = "demo@taskflow.local",
            PasswordHash = "dev-only-placeholder-hash"
        });
        db.SaveChanges();
    }
}

app.UseCors("frontend");
app.UseHttpsRedirection();
app.MapControllers();

app.Run();
