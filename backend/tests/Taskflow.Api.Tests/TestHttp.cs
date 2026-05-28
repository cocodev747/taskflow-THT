using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Taskflow.Api.Tests;

static class TestHttp
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    public static async Task<(string Token, int UserId)> RegisterAsync(
        HttpClient client,
        string email,
        string password)
    {
        var res = await client.PostAsJsonAsync("/api/auth/register", new { email, password });
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AuthJson>(Json);
        return (body!.Token, body.User.Id);
    }

    public static void UseToken(HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    public static void ClearToken(HttpClient client)
    {
        client.DefaultRequestHeaders.Authorization = null;
    }

    public static async Task<string?> ReadMessage(HttpResponseMessage res)
    {
        try
        {
            var body = await res.Content.ReadFromJsonAsync<MsgJson>(Json);
            return body?.Message;
        }
        catch
        {
            return null;
        }
    }

    public static async Task<TaskJson?> ReadTask(HttpResponseMessage res)
    {
        return await res.Content.ReadFromJsonAsync<TaskJson>(Json);
    }

    public static async Task<List<TaskJson>?> ReadTaskList(HttpResponseMessage res)
    {
        return await res.Content.ReadFromJsonAsync<List<TaskJson>>(Json);
    }

    record AuthJson(string Token, UserJson User);
    record UserJson(int Id, string Email);
    record MsgJson(string Message);
}

public record TaskJson(
    int Id,
    string Title,
    bool IsCompleted,
    int UserId,
    string? Description = null
);
