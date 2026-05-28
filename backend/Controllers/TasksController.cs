using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Taskflow.Api.Data;
using Taskflow.Api.Models;

namespace Taskflow.Api.Controllers;

[ApiController]
[Route("api/tasks")]
public class TasksController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskItem>>> GetAll()
    {
        var items = await db.Tasks.OrderByDescending(t => t.CreatedAtUtc).ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<TaskItem>> Create([FromBody] CreateTaskRequest request)
    {
        var title = request.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest("Title is required.");
        }

        var item = new TaskItem
        {
            Title = title,
            IsDone = false
        };

        db.Tasks.Add(item);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskItem>> GetById(int id)
    {
        var item = await db.Tasks.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPatch("{id:int}")]
    public async Task<ActionResult<TaskItem>> Update(int id, [FromBody] UpdateTaskRequest request)
    {
        var item = await db.Tasks.FindAsync(id);
        if (item is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Title))
        {
            item.Title = request.Title.Trim();
        }

        if (request.IsDone.HasValue)
        {
            item.IsDone = request.IsDone.Value;
        }

        await db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.Tasks.FindAsync(id);
        if (item is null)
        {
            return NotFound();
        }

        db.Tasks.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    public record CreateTaskRequest(string Title);
    public record UpdateTaskRequest(string? Title, bool? IsDone);
}
