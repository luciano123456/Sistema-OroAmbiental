using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;

namespace SistemaOroAmbiental.DAL.Common
{
    public static class DbContextTransactionExtensions
    {
        public static async Task ExecuteInTransactionAsync(
            this SistemaOroAmbientalContext db,
            Func<Task> action)
        {
            var strategy = db.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await db.Database.BeginTransactionAsync();
                try
                {
                    await action();
                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public static async Task<T> ExecuteInTransactionAsync<T>(
            this SistemaOroAmbientalContext db,
            Func<Task<T>> action)
        {
            var strategy = db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await db.Database.BeginTransactionAsync();
                try
                {
                    var result = await action();
                    await transaction.CommitAsync();
                    return result;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
    }
}
