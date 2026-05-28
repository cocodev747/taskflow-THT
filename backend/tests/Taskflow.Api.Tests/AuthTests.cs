using System.Net;
using System.Net.Http.Json;

namespace Taskflow.Api.Tests;

public class AuthTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public AuthTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Me_without_token_returns_401()
    {
        TestHttp.ClearToken(_client);

        var res = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Register_rejects_invalid_email()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "not-an-email",
            password = "password123"
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("valid email", await TestHttp.ReadMessage(res) ?? "", StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Register_rejects_short_password()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email = $"user-{Guid.NewGuid():N}@test.com",
            password = "12345"
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("6 characters", await TestHttp.ReadMessage(res) ?? "");
    }

    [Fact]
    public async Task Register_rejects_duplicate_email()
    {
        var email = $"dup-{Guid.NewGuid():N}@test.com";

        var first = await _client.PostAsJsonAsync("/api/auth/register", new { email, password = "password123" });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await _client.PostAsJsonAsync("/api/auth/register", new { email, password = "password123" });

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Login_rejects_bad_password()
    {
        var email = $"login-{Guid.NewGuid():N}@test.com";
        await TestHttp.RegisterAsync(_client, email, "password123");

        var res = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "wrong-password"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }
}
