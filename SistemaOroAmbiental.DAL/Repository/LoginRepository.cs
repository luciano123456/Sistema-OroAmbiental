using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class LoginRepository : ILoginRepository<User>
    {

        private readonly SistemaOroAmbientalContext _dbcontext;

        public LoginRepository(SistemaOroAmbientalContext context)
        {
            _dbcontext = context;
        }

        public async Task<User> Login(string username, string password)
        {
            return await _dbcontext.Usuarios
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Usuario == username);
        }

        public async Task<bool> Logout()
        {
            return true;
        }

    }
}
