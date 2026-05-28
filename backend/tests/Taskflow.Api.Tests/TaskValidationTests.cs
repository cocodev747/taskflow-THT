using System.Net;
using System.Net.Http.Json;

namespace Taskflow.Api.Tests;

public class TaskValidationTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;
    private string? _token;

    public TaskValidationTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task SignIn()
    {
        if (_token is not null) return;

        var email = $"valid-{Guid.NewGuid():N}@test.com";
        (_token, _) = await TestHttp.RegisterAsync(_client, email, "password123");
        TestHttp.UseToken(_client, _token);
    }

    [Fact]
    public async Task Create_rejects_empty_title()
    {
        await SignIn();

        var res = await _client.PostAsJsonAsync("/api/tasks", new { title = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("Title is required", await TestHttp.ReadMessage(res) ?? "");
    }

    [Fact]
    public async Task Create_rejects_title_over_200_chars()
    {
        await SignIn();

        var res = await _client.PostAsJsonAsync("/api/tasks", new { title = new string('x', 201) });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("200 characters", await TestHttp.ReadMessage(res) ?? "");
    }

    [Fact]
    public async Task Get_rejects_invalid_task_id()
    {
        await SignIn();

        var res = await _client.GetAsync("/api/tasks/0");

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Update_rejects_empty_title()
    {
        await SignIn();

        var created = await _client.PostAsJsonAsync("/api/tasks", new { title = "Valid title" });
        var task = await TestHttp.ReadTask(created);
        Assert.NotNull(task);

        var res = await _client.PatchAsJsonAsync($"/api/tasks/{task.Id}", new
        {
            title = "   ",
            dueDateChanged = false
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("cannot be empty", await TestHttp.ReadMessage(res) ?? "");
    }

    [Fact]
    public async Task Update_rejects_description_over_1000_chars()
    {
        await SignIn();

        var created = await _client.PostAsJsonAsync("/api/tasks", new { title = "Valid title" });
        var task = await TestHttp.ReadTask(created);
        Assert.NotNull(task);

        var res = await _client.PatchAsJsonAsync($"/api/tasks/{task.Id}", new
        {
            description = new string('d', 1001),
            dueDateChanged = false
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("1000 characters", await TestHttp.ReadMessage(res) ?? "");
    }

    [Fact]
    public async Task Delete_rejects_invalid_task_id()
    {
        await SignIn();

        var res = await _client.DeleteAsync("/api/tasks/-1");

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
