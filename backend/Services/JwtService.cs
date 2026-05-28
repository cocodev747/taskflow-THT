using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Taskflow.Api.Models;

namespace Taskflow.Api.Services;

public class JwtService(IConfiguration configuration)
{
    public string GenerateToken(User user)
    {
        var key = configuration["Jwt:Key"]
            ?? Environment.GetEnvironmentVariable("TASKFLOW_JWT_KEY")
            ?? throw new InvalidOperationException("JWT key is not configured.");

        var issuer = configuration["Jwt:Issuer"] ?? "Taskflow.Api";
        var audience = configuration["Jwt:Audience"] ?? "Taskflow.Web";
        var expiresHours = int.TryParse(configuration["Jwt:ExpiresHours"], out var hours) ? hours : 8;

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email)
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiresHours),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
