using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class LoginService : ILoginService
    {

        private readonly ILoginRepository<User> _loginRepo;

        public LoginService(ILoginRepository<User> loginRepo)
        {
            _loginRepo = loginRepo;
        }

        public async Task<User> Login(string username, string password)
        {
            return await _loginRepo.Login(username, password);
        }

        public async Task<bool> Logout()
        {
            return await _loginRepo.Logout();
        }
    }
}
