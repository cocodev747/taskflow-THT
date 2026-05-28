using Microsoft.EntityFrameworkCore;
using Taskflow.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var connectionString =
    builder.Configuration.GetConnectionString("Default")
    ?? Environment.GetEnvironmentVariable("TASKFLOW_CONNECTION_STRING")
    ?? "Data Source=taskflow.db";

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

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
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors("frontend");
app.UseHttpsRedirection();
app.MapControllers();

app.Run();
