using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Taskflow.Api.Data;
using Taskflow.Api.Models;
using Taskflow.Api.Services;

namespace Taskflow.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(ApplicationDbContext db, JwtService jwt) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var password = request.Password.Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        if (!email.Contains('@'))
        {
            return BadRequest(new { message = "Please provide a valid email address." });
        }

        if (password.Length < 6)
        {
            return BadRequest(new { message = "Password must be at least 6 characters." });
        }

        if (await db.Users.AnyAsync(u => u.Email == email))
        {
            return Conflict(new { message = "Email is already registered." });
        }

        var user = new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
        };

        try
        {
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqliteException sqliteEx && sqliteEx.SqliteErrorCode == 19)
        {
            return Conflict(new { message = "Email is already registered." });
        }

        var token = jwt.GenerateToken(user);
        return Ok(new AuthResponse(token, new UserResponse(user.Id, user.Email)));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var password = request.Password.Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var token = jwt.GenerateToken(user);
        return Ok(new AuthResponse(token, new UserResponse(user.Id, user.Email)));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> Me()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FindAsync(userId);
        if (user is null)
        {
            return Unauthorized(new { message = "User not found." });
        }

        return Ok(new UserResponse(user.Id, user.Email));
    }

    public record RegisterRequest(string Email, string Password);
    public record LoginRequest(string Email, string Password);
    public record AuthResponse(string Token, UserResponse User);
    public record UserResponse(int Id, string Email);
}
