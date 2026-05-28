using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.Application.Models;
using SistemaOroAmbiental.Application.Configuration;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;
using Microsoft.AspNetCore.Authorization;

namespace SistemaBronx.Application.Controllers
{
    public class LoginController : Controller
    {

        private readonly ILoginService _loginService;
        private readonly IUsuariosService _usuariosService;
        private readonly IUsuariosSucursalesService _usuariosSucursales;
        private readonly IConfiguration _config;
        private readonly SessionSettings _sessionSettings;

        public LoginController(
            ILoginService loginService,
            IUsuariosService usuariosService,
            IUsuariosSucursalesService usuariosSucursales,
            IConfiguration config,
            SessionSettings sessionSettings)
        {
            _loginService = loginService;
            _usuariosService = usuariosService;
            _usuariosSucursales = usuariosSucursales;
            _config = config;
            _sessionSettings = sessionSettings;
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

                if (!user.Activo || user.IdEstado == 2)
                {
                    return Unauthorized(new { success = false, message = "Tu usuario se encuentra bloqueado o inactivo." });
                }

                var passwordHasher = new PasswordHasher<User>();
                var result = passwordHasher.VerifyHashedPassword(user, user.Contrasena, model.Contrasena);

                if (result == PasswordVerificationResult.Success)
                {
                    var token = GenerarToken(user);
                    var sucursales = await _usuariosSucursales.ListaParaUsuario(user.Id);
                    var sucursalesDto = sucursales
                        .Select(s => new { s.Id, s.Nombre })
                        .ToList();
                    int? idSucursalDefault = sucursales.Count == 1 ? sucursales[0].Id : null;

                    var expiresAt = DateTime.UtcNow.Add(_sessionSettings.GetDuration());

                    return Ok(new
                    {
                        success = true,
                        token,
                        expiresAt = expiresAt.ToString("o"),
                        expiresAtUnixMs = new DateTimeOffset(expiresAt).ToUnixTimeMilliseconds(),
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
                            Sucursales = sucursalesDto,
                            IdSucursalDefault = idSucursalDefault
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
                    expires: DateTime.UtcNow.Add(_sessionSettings.GetDuration()),
                    signingCredentials: creds);

                return new JwtSecurityTokenHandler().WriteToken(token);
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        /// <summary>Extiende la sesión JWT del usuario autenticado (renovar sin volver a loguearse).</summary>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> RenovarSesion()
        {
            try
            {
                var idClaim = User.FindFirst("Id")?.Value;
                if (!int.TryParse(idClaim, out var userId))
                {
                    return Unauthorized(new { success = false, message = "Sesión no válida." });
                }

                var user = await _usuariosService.Obtener(userId);
                if (user == null)
                {
                    return Unauthorized(new { success = false, message = "Usuario no encontrado." });
                }

                if (!user.Activo || user.IdEstado == 2)
                {
                    return Unauthorized(new { success = false, message = "Tu usuario se encuentra bloqueado o inactivo." });
                }

                var token = GenerarToken(user);
                if (string.IsNullOrEmpty(token))
                {
                    return StatusCode(500, new { success = false, message = "No se pudo generar el token." });
                }

                var expiresAt = DateTime.UtcNow.Add(_sessionSettings.GetDuration());

                return Ok(new
                {
                    success = true,
                    token,
                    expiresAt = expiresAt.ToString("o"),
                    expiresAtUnixMs = new DateTimeOffset(expiresAt).ToUnixTimeMilliseconds()
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "No se pudo renovar la sesión." });
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

