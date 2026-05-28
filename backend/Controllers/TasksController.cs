using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Taskflow.Api.Data;
using Taskflow.Api.Models;

namespace Taskflow.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/tasks")]
public class TasksController(ApplicationDbContext db) : ControllerBase
{
    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskItem>>> GetAll()
    {
        var userId = CurrentUserId;
        var items = await db.Tasks
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<TaskItem>> Create([FromBody] CreateTaskRequest request)
    {
        var title = request.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        var item = new TaskItem
        {
            Title = title,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            DueDate = request.DueDate,
            IsCompleted = false,
            UserId = CurrentUserId
        };

        db.Tasks.Add(item);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskItem>> GetById(int id)
    {
        var item = await FindOwnedTask(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPatch("{id:int}")]
    public async Task<ActionResult<TaskItem>> Update(int id, [FromBody] UpdateTaskRequest request)
    {
        var item = await FindOwnedTask(id);
        if (item is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Title))
        {
            item.Title = request.Title.Trim();
        }

        if (request.Description is not null)
        {
            item.Description = string.IsNullOrWhiteSpace(request.Description)
                ? null
                : request.Description.Trim();
        }

        if (request.DueDateChanged)
        {
            item.DueDate = request.DueDate;
        }

        if (request.IsCompleted.HasValue)
        {
            item.IsCompleted = request.IsCompleted.Value;
        }

        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await FindOwnedTask(id);
        if (item is null)
        {
            return NotFound();
        }

        db.Tasks.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private Task<TaskItem?> FindOwnedTask(int id)
    {
        var userId = CurrentUserId;
        return db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    }

    public record CreateTaskRequest(string Title, string? Description, DateTime? DueDate);
    public record UpdateTaskRequest(
        string? Title,
        string? Description,
        DateTime? DueDate,
        bool DueDateChanged,
        bool? IsCompleted
    );
}
