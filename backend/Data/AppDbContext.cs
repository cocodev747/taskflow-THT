using Microsoft.EntityFrameworkCore;
using Taskflow.Api.Models;

namespace Taskflow.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
}
