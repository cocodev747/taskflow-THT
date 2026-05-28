using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Taskflow.Api.Data;

namespace Taskflow.Api.Tests;

public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _db;

    public ApiFactory()
    {
        _db = new SqliteConnection("Data Source=:memory:");
        _db.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.UseSetting("Jwt:Key", "integration-test-jwt-signing-key-32chars");
        builder.UseSetting("Jwt:Issuer", "Taskflow.Api");
        builder.UseSetting("Jwt:Audience", "Taskflow.Web");

        builder.ConfigureServices(services =>
        {
            var opts = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (opts is not null) services.Remove(opts);

            var ctx = services.SingleOrDefault(d => d.ServiceType == typeof(ApplicationDbContext));
            if (ctx is not null) services.Remove(ctx);

            services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(_db));
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _db.Dispose();
        }
        base.Dispose(disposing);
    }
}
