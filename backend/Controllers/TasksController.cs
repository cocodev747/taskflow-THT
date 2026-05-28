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
    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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
        if (request is null)
        {
            return BadRequest(new { message = "Request body is required." });
        }

        var title = request.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest(new { message = "Title is required." });
        }
        
        if (title.Length > 200)
        {
            return BadRequest(new { message = "Title must be 200 characters or fewer." });
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
        if (id <= 0)
        {
            return BadRequest(new { message = "Task id must be greater than 0." });
        }

        var item = await FindOwnedTask(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPatch("{id:int}")]
    public async Task<ActionResult<TaskItem>> Update(int id, [FromBody] UpdateTaskRequest request)
    {
        if (id <= 0)
        {
            return BadRequest(new { message = "Task id must be greater than 0." });
        }

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

    [HttpPatch("{id:int}/toggle")]
    public async Task<ActionResult<TaskItem>> ToggleCompletion(int id)
    {
        if (id <= 0)
        {
            return BadRequest(new { message = "Task id must be greater than 0." });
        }

        var item = await FindOwnedTask(id);
        if (item is null)
        {
            return NotFound();
        }

        // Explicit ownership check kept for review readability.
        if (item.UserId != CurrentUserId)
        {
            return Forbid();
        }

        item.IsCompleted = !item.IsCompleted;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (id <= 0)
        {
            return BadRequest(new { message = "Task id must be greater than 0." });
        }

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
