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
        private readonly IUsuariosConexionesService _conexiones;
        private readonly IConfiguration _config;
        private readonly SessionSettings _sessionSettings;

        public LoginController(
            ILoginService loginService,
            IUsuariosService usuariosService,
            IUsuariosSucursalesService usuariosSucursales,
            IUsuariosConexionesService conexiones,
            IConfiguration config,
            SessionSettings sessionSettings)
        {
            _loginService = loginService;
            _usuariosService = usuariosService;
            _usuariosSucursales = usuariosSucursales;
            _conexiones = conexiones;
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
                    var (token, jti) = GenerarToken(user);
                    if (string.IsNullOrEmpty(token))
                    {
                        return StatusCode(500, new { success = false, message = "No se pudo generar el token." });
                    }

                    var sucursales = await _usuariosSucursales.ListaParaUsuario(user.Id);
                    var sucursalesDto = sucursales
                        .Select(s => new { s.Id, s.Nombre })
                        .ToList();
                    int? idSucursalDefault = sucursales.Count == 1 ? sucursales[0].Id : null;

                    var expiresAt = DateTime.UtcNow.Add(_sessionSettings.GetDuration());

                    try
                    {
                        await _conexiones.RegistrarConexionAsync(user.Id, jti, ObtenerIp(), ObtenerUserAgent());
                    }
                    catch
                    {
                        // No bloquea el login si falla el registro de conexión
                    }

                    return Ok(new
                    {
                        success = true,
                        token,
                        jti,
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
                            user.AvatarColor,
                            user.AvatarIcono,
                            user.AvatarFoto,
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

        private (string? Token, string Jti) GenerarToken(User user)
        {
            try
            {
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["JwtSettings:SecretKey"]));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
                var jti = Guid.NewGuid().ToString();

                var claims = new[]
                {
                    new Claim(JwtRegisteredClaimNames.Sub, user.Usuario),
                    new Claim("Id", user.Id.ToString()),
                    new Claim("UsuariosRol", user.IdRol.ToString()),
                    new Claim(JwtRegisteredClaimNames.Jti, jti)
                };

                var token = new JwtSecurityToken(
                    _config["JwtSettings:Issuer"],
                    _config["JwtSettings:Audience"],
                    claims,
                    expires: DateTime.UtcNow.Add(_sessionSettings.GetDuration()),
                    signingCredentials: creds);

                return (new JwtSecurityTokenHandler().WriteToken(token), jti);
            }
            catch (Exception)
            {
                return (null, string.Empty);
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

                var (token, jti) = GenerarToken(user);
                if (string.IsNullOrEmpty(token))
                {
                    return StatusCode(500, new { success = false, message = "No se pudo generar el token." });
                }

                try { await _conexiones.HeartbeatAsync(userId); } catch { /* ignore */ }

                var expiresAt = DateTime.UtcNow.Add(_sessionSettings.GetDuration());

                return Ok(new
                {
                    success = true,
                    token,
                    jti,
                    expiresAt = expiresAt.ToString("o"),
                    expiresAtUnixMs = new DateTimeOffset(expiresAt).ToUnixTimeMilliseconds()
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "No se pudo renovar la sesión." });
            }
        }

        /// <summary>Mantiene al usuario en línea mientras la pestaña esté abierta.</summary>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Heartbeat([FromBody] VMHeartbeat? model = null)
        {
            if (!int.TryParse(User.FindFirst("Id")?.Value, out var userId))
                return Unauthorized();

            try
            {
                await _conexiones.HeartbeatAsync(userId, model?.Modulo);
                return Ok(new { success = true });
            }
            catch
            {
                return Ok(new { success = false });
            }
        }

        /// <summary>Registra desconexión voluntaria o por expiración. motivo: 2=logout, 3=expiró.</summary>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> RegistrarDesconexion([FromQuery] byte motivo = 2, [FromQuery] string? jti = null)
        {
            if (!int.TryParse(User.FindFirst("Id")?.Value, out var userId))
                return Unauthorized();

            var tipo = motivo == UsuariosConexion.TipoExpiro
                ? UsuariosConexion.TipoExpiro
                : UsuariosConexion.TipoDesconecto;

            var tokenJti = jti
                ?? User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value
                ?? User.FindFirst("jti")?.Value;

            try
            {
                await _conexiones.RegistrarDesconexionAsync(userId, tipo, tokenJti, ObtenerIp(), ObtenerUserAgent());
            }
            catch { /* ignore */ }

            return Ok(new { success = true });
        }

        [AllowAnonymous]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("JwtToken");
            return RedirectToAction("Index", "Login");
        }


        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        private string? ObtenerIp()
        {
            var forwarded = Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(forwarded))
                return forwarded.Split(',')[0].Trim();
            return HttpContext.Connection.RemoteIpAddress?.ToString();
        }

        private string? ObtenerUserAgent()
            => Request.Headers.UserAgent.ToString();
    }
}
