using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.Application.Models;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;
using Microsoft.AspNetCore.Authorization;

namespace SistemaBronx.Application.Controllers
{
    public class LoginController : Controller
    {

        private readonly ILoginService _loginService;
        private readonly IConfiguration _config;
        private readonly IUsuariosPermisosService _permisosService;


        public LoginController(
      ILoginService loginService,
      IConfiguration config,
      IUsuariosPermisosService permisosService)
        {
            _loginService = loginService;
            _config = config;
            _permisosService = permisosService;
        }


        public IActionResult Index()
        {
            return View();
        }



        [ValidateAntiForgeryToken]
        [HttpPost]
        public async Task<IActionResult> IniciarSesion([FromBody] VMLogin model)
        {
            try
            {
                var user = await _loginService.Login(model.Usuario, model.Contrasena);

                if (user == null)
                {
                    return Unauthorized(new { success = false, message = "Usuario o contraseña incorrectos." });
                }

                if (user.IdEstado == 2)
                {
                    return Unauthorized(new { success = false, message = "Tu usuario se encuentra bloqueado." });
                }

                var passwordHasher = new PasswordHasher<User>();
                var result = passwordHasher.VerifyHashedPassword(user, user.Contrasena, model.Contrasena);

                if (result == PasswordVerificationResult.Success)
                {
                    var token = GenerarToken(user);

                    // 🔥 NUEVO SISTEMA DINÁMICO
                    var (modulos, permisosUsuario, catalogo) = await _permisosService.ObtenerFull(user.Id);

                    var permisosFinal = modulos.Select(modulo =>
                    {
                        // 🔥 permisos válidos para este módulo (global + específicos)
                        var permisosDisponibles = catalogo
                            .Where(p => p.IdModulo == null || p.IdModulo == modulo.Id)
                            .ToList();

                        var permisosUsuarioModulo = permisosUsuario
                            .Where(x => x.IdModulo == modulo.Id && x.Activo == true)
                            .ToList();

                        return new
                        {
                            IdModulo = modulo.Id,
                            Modulo = modulo.Nombre,
                            CodigoModulo = modulo.Codigo,

                            Permisos = permisosDisponibles.Select(p => new
                            {
                                p.Id,
                                p.Codigo,
                                p.Nombre,
                                p.Descripcion,
                                Activo = permisosUsuarioModulo.Any(x => x.IdPermiso == p.Id)
                            }).ToList()
                        };
                    }).ToList();

                    return Ok(new
                    {
                        success = true,
                        token,
                        user = new
                        {
                            user.Id,
                            user.Usuario,
                            user.IdRol,
                            user.Nombre,
                            user.Apellido,
                            user.Direccion,
                            user.Dni,
                            user.Telefono,

                            // 🔥 AHORA DINÁMICO
                            Permisos = permisosFinal
                        }
                    });
                }

                return Unauthorized(new { success = false, message = "Usuario o contraseña incorrectos." });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Ocurrió un error inesperado. Inténtalo nuevamente." });
            }
        }

        private string GenerarToken(User user)
        {
            try
            {
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["JwtSettings:SecretKey"]));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

                var claims = new[]
                {
            new Claim(JwtRegisteredClaimNames.Sub, user.Usuario),
            new Claim("Id", user.Id.ToString()),
            new Claim("UsuariosRol", user.IdRol.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

                var token = new JwtSecurityToken(
                    _config["JwtSettings:Issuer"],
                    _config["JwtSettings:Audience"],
                    claims,
                    expires: DateTime.UtcNow.AddHours(2),
                    signingCredentials: creds);

                return new JwtSecurityTokenHandler().WriteToken(token);
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        [AllowAnonymous]
        public IActionResult Logout()
        {
            // Eliminar cookie si la usás
            Response.Cookies.Delete("JwtToken");

            // Simplemente redirigimos
            return RedirectToAction("Index", "Login");
        }


        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }

}

