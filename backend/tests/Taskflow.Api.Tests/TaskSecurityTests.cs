using System.Net;
using System.Net.Http.Json;

namespace Taskflow.Api.Tests;

public class TaskSecurityTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public TaskSecurityTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Tasks_without_token_returns_401()
    {
        TestHttp.ClearToken(_client);

        var res = await _client.GetAsync("/api/tasks");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task User_only_sees_own_tasks()
    {
        var (tokenA, _) = await TestHttp.RegisterAsync(_client, $"a-{Guid.NewGuid():N}@test.com", "password123");
        var (tokenB, _) = await TestHttp.RegisterAsync(_client, $"b-{Guid.NewGuid():N}@test.com", "password123");

        TestHttp.UseToken(_client, tokenA);
        await _client.PostAsJsonAsync("/api/tasks", new { title = "Alice task" });

        TestHttp.UseToken(_client, tokenB);
        await _client.PostAsJsonAsync("/api/tasks", new { title = "Bob task" });

        var listB = await _client.GetAsync("/api/tasks");
        var tasksB = await TestHttp.ReadTaskList(listB);

        Assert.NotNull(tasksB);
        Assert.Single(tasksB);
        Assert.Equal("Bob task", tasksB[0].Title);
        Assert.All(tasksB, t => Assert.DoesNotContain("Alice", t.Title));
    }

    [Fact]
    public async Task User_cannot_read_another_users_task()
    {
        var (tokenA, _) = await TestHttp.RegisterAsync(_client, $"a-{Guid.NewGuid():N}@test.com", "password123");
        var (tokenB, _) = await TestHttp.RegisterAsync(_client, $"b-{Guid.NewGuid():N}@test.com", "password123");

        TestHttp.UseToken(_client, tokenA);
        var created = await _client.PostAsJsonAsync("/api/tasks", new { title = "Private task" });
        var task = await TestHttp.ReadTask(created);
        Assert.NotNull(task);

        TestHttp.UseToken(_client, tokenB);
        var res = await _client.GetAsync($"/api/tasks/{task.Id}");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task User_cannot_update_another_users_task()
    {
        var taskId = await CreateTaskForUser($"owner-{Guid.NewGuid():N}@test.com", "Owner task");
        var (tokenB, _) = await TestHttp.RegisterAsync(_client, $"other-{Guid.NewGuid():N}@test.com", "password123");

        TestHttp.UseToken(_client, tokenB);
        var res = await _client.PatchAsJsonAsync($"/api/tasks/{taskId}", new
        {
            title = "Hacked title",
            dueDateChanged = false
        });

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task User_cannot_delete_another_users_task()
    {
        var taskId = await CreateTaskForUser($"owner-{Guid.NewGuid():N}@test.com", "Owner task");
        var (tokenB, _) = await TestHttp.RegisterAsync(_client, $"other-{Guid.NewGuid():N}@test.com", "password123");

        TestHttp.UseToken(_client, tokenB);
        var res = await _client.DeleteAsync($"/api/tasks/{taskId}");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task User_cannot_toggle_another_users_task()
    {
        var taskId = await CreateTaskForUser($"owner-{Guid.NewGuid():N}@test.com", "Owner task");
        var (tokenB, _) = await TestHttp.RegisterAsync(_client, $"other-{Guid.NewGuid():N}@test.com", "password123");

        TestHttp.UseToken(_client, tokenB);
        var res = await _client.PatchAsync($"/api/tasks/{taskId}/toggle", null);

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    private async Task<int> CreateTaskForUser(string email, string title)
    {
        var (token, _) = await TestHttp.RegisterAsync(_client, email, "password123");
        TestHttp.UseToken(_client, token);
        var res = await _client.PostAsJsonAsync("/api/tasks", new { title });
        var task = await TestHttp.ReadTask(res);
        Assert.NotNull(task);
        return task.Id;
    }
}
