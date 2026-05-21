using SistemaOroAmbiental.Models;
using System.Net.Http;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface ILoginService
    {
        Task<User> Login(string username, string password);

        Task<bool> Logout();
    }
}
