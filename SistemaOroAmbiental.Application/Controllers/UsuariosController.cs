using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;
using System.Diagnostics;
using System.Text.RegularExpressions;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class UsuariosController : Controller
    {
        private static readonly HashSet<string> AvatarIconosPermitidos = new(StringComparer.OrdinalIgnoreCase)
        {
            "user", "smile-o", "star", "heart", "leaf", "car", "plane", "bicycle",
            "coffee", "music", "gamepad", "paw", "rocket", "home", "briefcase",
            "graduation-cap", "diamond", "fire"
        };

        private static readonly Regex HexColorRegex = new(@"^#([0-9A-Fa-f]{6})$", RegexOptions.Compiled);

        private readonly IUsuariosService _Usuarioservice;
        private readonly IUsuariosSucursalesService _usuariosSucursales;
        private readonly IUsuariosConexionesService _conexiones;
        private readonly IWebHostEnvironment _env;

        public UsuariosController(
            IUsuariosService Usuarioservice,
            IUsuariosSucursalesService usuariosSucursales,
            IUsuariosConexionesService conexiones,
            IWebHostEnvironment env)
        {
            _Usuarioservice = Usuarioservice;
            _usuariosSucursales = usuariosSucursales;
            _conexiones = conexiones;
            _env = env;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }


        [AllowAnonymous]
        public IActionResult Configuracion()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> MiPerfil()
        {
            if (!int.TryParse(User.FindFirst("Id")?.Value, out var userId))
                return Unauthorized();

            var user = await _Usuarioservice.Obtener(userId);
            if (user == null)
                return NotFound();

            return Ok(new
            {
                user.Id,
                user.Usuario,
                user.Nombre,
                user.Apellido,
                user.Dni,
                user.Telefono,
                user.Direccion,
                user.Correo,
                user.AvatarColor,
                user.AvatarIcono,
                user.AvatarFoto
            });
        }

        [HttpPut]
        public async Task<IActionResult> ActualizarAvatar([FromBody] VMUserAvatar model)
        {
            if (!int.TryParse(User.FindFirst("Id")?.Value, out var userId))
                return Unauthorized();

            var userbase = await _Usuarioservice.Obtener(userId);
            if (userbase == null)
                return NotFound();

            if (!string.IsNullOrWhiteSpace(model.AvatarColor))
            {
                var color = model.AvatarColor.Trim();
                if (!HexColorRegex.IsMatch(color))
                    return Ok(new { valor = "Validacion", mensaje = "Color invalido." });
                userbase.AvatarColor = color.ToLowerInvariant();
            }

            if (!string.IsNullOrWhiteSpace(model.AvatarIcono))
            {
                var icono = model.AvatarIcono.Trim().ToLowerInvariant();
                if (icono.StartsWith("fa-"))
                    icono = icono[3..];
                if (!AvatarIconosPermitidos.Contains(icono))
                    return Ok(new { valor = "Validacion", mensaje = "Icono no permitido." });
                userbase.AvatarIcono = icono;
            }

            var ok = await _Usuarioservice.Actualizar(userbase);
            if (!ok)
                return Ok(new { valor = "Error" });

            return Ok(new
            {
                valor = "OK",
                userbase.AvatarColor,
                userbase.AvatarIcono,
                userbase.AvatarFoto
            });
        }

        [HttpPost]
        [RequestSizeLimit(3_000_000)]
        public async Task<IActionResult> SubirAvatarFoto(IFormFile file)
        {
            if (!int.TryParse(User.FindFirst("Id")?.Value, out var userId))
                return Unauthorized();

            if (file == null || file.Length == 0)
                return Ok(new { valor = "Validacion", mensaje = "Selecciona una imagen." });

            if (file.Length > 2_500_000)
                return Ok(new { valor = "Validacion", mensaje = "La imagen no puede superar 2.5 MB." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            if (!allowed.Contains(ext))
                return Ok(new { valor = "Validacion", mensaje = "Formatos permitidos: JPG, PNG, WEBP o GIF." });

            var contentType = (file.ContentType ?? "").ToLowerInvariant();
            if (!contentType.StartsWith("image/"))
                return Ok(new { valor = "Validacion", mensaje = "El archivo debe ser una imagen." });

            var userbase = await _Usuarioservice.Obtener(userId);
            if (userbase == null)
                return NotFound();

            try
            {
                var folder = Path.Combine(_env.WebRootPath, "Uploads", "Avatares");
                Directory.CreateDirectory(folder);

                EliminarArchivoAvatar(userbase.AvatarFoto);

                var fileName = $"u_{userId}_{Guid.NewGuid():N}{ext}";
                var physical = Path.Combine(folder, fileName);
                await using (var fs = new FileStream(physical, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    await file.CopyToAsync(fs);
                }

                userbase.AvatarFoto = $"/Uploads/Avatares/{fileName}";
                var ok = await _Usuarioservice.Actualizar(userbase);
                if (!ok)
                {
                    try { System.IO.File.Delete(physical); } catch { /* ignore */ }
                    return Ok(new { valor = "Error", mensaje = "No se pudo guardar la foto." });
                }

                return Ok(new
                {
                    valor = "OK",
                    userbase.AvatarFoto,
                    userbase.AvatarColor,
                    userbase.AvatarIcono
                });
            }
            catch
            {
                return Ok(new { valor = "Error", mensaje = "No se pudo subir la foto." });
            }
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarAvatarFoto()
        {
            if (!int.TryParse(User.FindFirst("Id")?.Value, out var userId))
                return Unauthorized();

            var userbase = await _Usuarioservice.Obtener(userId);
            if (userbase == null)
                return NotFound();

            EliminarArchivoAvatar(userbase.AvatarFoto);
            userbase.AvatarFoto = null;

            var ok = await _Usuarioservice.Actualizar(userbase);
            if (!ok)
                return Ok(new { valor = "Error", mensaje = "No se pudo quitar la foto." });

            return Ok(new
            {
                valor = "OK",
                AvatarFoto = (string?)null,
                userbase.AvatarColor,
                userbase.AvatarIcono
            });
        }

        private void EliminarArchivoAvatar(string? avatarFoto)
        {
            if (string.IsNullOrWhiteSpace(avatarFoto))
                return;

            try
            {
                var relative = avatarFoto.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                if (!relative.StartsWith($"Uploads{Path.DirectorySeparatorChar}Avatares{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase))
                    return;

                var physical = Path.Combine(_env.WebRootPath, relative);
                if (System.IO.File.Exists(physical))
                    System.IO.File.Delete(physical);
            }
            catch
            {
                // No bloquea el flujo si no se puede borrar el archivo viejo.
            }
        }

        [HttpPut]
        public async Task<IActionResult> ActualizarPerfil([FromBody] VMUserPerfil model)
        {
            if (!int.TryParse(User.FindFirst("Id")?.Value, out var userId))
                return Unauthorized();

            if (model.Id != userId)
                return Ok(new { valor = "Error", mensaje = "No puede modificar otro usuario." });

            if (string.IsNullOrWhiteSpace(model.Nombre) || string.IsNullOrWhiteSpace(model.Apellido))
                return Ok(new { valor = "Validacion", mensaje = "Nombre y apellido son obligatorios." });

            var userbase = await _Usuarioservice.Obtener(userId);
            if (userbase == null)
                return NotFound();

            var passwordHasher = new PasswordHasher<User>();
            var verify = passwordHasher.VerifyHashedPassword(null, userbase.Contrasena, model.Contrasena ?? "");
            if (verify != PasswordVerificationResult.Success)
                return Ok(new { valor = "Contrasena" });

            userbase.Nombre = model.Nombre.Trim();
            userbase.Apellido = model.Apellido.Trim();
            userbase.Dni = string.IsNullOrWhiteSpace(model.Dni) ? null : model.Dni.Trim();
            userbase.Telefono = string.IsNullOrWhiteSpace(model.Telefono) ? "" : model.Telefono.Trim();
            userbase.Direccion = string.IsNullOrWhiteSpace(model.Direccion) ? "" : model.Direccion.Trim();
            userbase.Correo = string.IsNullOrWhiteSpace(model.Correo) ? null : model.Correo.Trim();

            if (!string.IsNullOrWhiteSpace(model.ContrasenaNueva))
                userbase.Contrasena = passwordHasher.HashPassword(null, model.ContrasenaNueva);

            var ok = await _Usuarioservice.Actualizar(userbase);
            if (!ok)
                return Ok(new { valor = "Error" });

            return Ok(new
            {
                valor = "OK",
                userbase.Nombre,
                userbase.Apellido,
                userbase.Correo
            });
        }

        [HttpGet]
        public async Task<IActionResult> Lista(bool soloActivos = false)
        {
            var Usuarios = (await _Usuarioservice.ObtenerTodos(soloActivos)).ToList();

            var lista = Usuarios.Select(c => new VMUser
            {
                Id = c.Id,
                Activo = c.Activo,
                Usuario = c.Usuario,
                Nombre = c.Nombre,
                Apellido = c.Apellido,
                Dni = c.Dni,
                Telefono = c.Telefono,
                Direccion = c.Direccion,
                IdRol = c.IdRol,
                UsuariosRol = c.IdRolNavigation.Nombre,
                IdEstado = c.IdEstado,
                Estado = c.IdEstadoNavigation.Nombre,
                FechaUltimaActividad = c.FechaUltimaActividad,
                EnLinea = _conexiones.EstaEnLinea(c.FechaUltimaActividad),
                UltimoModulo = c.UltimoModulo,
                AvatarColor = c.AvatarColor,
                AvatarIcono = c.AvatarIcono,
                AvatarFoto = c.AvatarFoto
            }).ToList();

            return Ok(lista);
        }

        /// <summary>Endpoint liviano: presencia + módulo + avatar (para refrescar grilla sin reload).</summary>
        [HttpGet]
        public async Task<IActionResult> Presencia()
        {
            var rows = await _conexiones.ListarPresenciaAsync();
            return Ok(rows.Select(r => new
            {
                r.Id,
                r.EnLinea,
                r.UltimoModulo,
                r.Nombre,
                r.Apellido,
                r.AvatarColor,
                r.AvatarIcono,
                r.AvatarFoto
            }).ToList());
        }

        /// <summary>Quién está online en el mismo módulo (widget de esquina).</summary>
        [HttpGet]
        public async Task<IActionResult> PresenciaModulo(string? modulo)
        {
            if (!int.TryParse(User.FindFirst("Id")?.Value, out var userId))
                return Unauthorized();

            var key = UsuariosConexionesService.SanitizeModulo(modulo);
            if (key == null)
                return Ok(Array.Empty<object>());

            var rows = await _conexiones.ListarPresenciaAsync();
            var lista = rows
                .Where(r => r.EnLinea
                    && r.Id != userId
                    && string.Equals(r.UltimoModulo, key, StringComparison.OrdinalIgnoreCase))
                .OrderBy(r => r.Nombre)
                .ThenBy(r => r.Apellido)
                .Take(20)
                .Select(r => new
                {
                    r.Id,
                    r.Nombre,
                    r.Apellido,
                    r.AvatarColor,
                    r.AvatarIcono,
                    r.AvatarFoto,
                    UltimoModulo = key
                })
                .ToList();

            return Ok(lista);
        }

        [HttpGet]
        public async Task<IActionResult> HistorialConexiones(int id, int take = 100)
        {
            var user = await _Usuarioservice.Obtener(id);
            if (user == null) return NotFound();

            var eventos = await _conexiones.HistorialAsync(id, take);
            static string NombreTipo(byte t) => t switch
            {
                UsuariosConexion.TipoConecto => "Conectó",
                UsuariosConexion.TipoDesconecto => "Desconectó",
                UsuariosConexion.TipoExpiro => "Sesión expirada",
                _ => "Evento"
            };

            var vm = new VMUsuarioConexionHistorial
            {
                IdUsuario = user.Id,
                Usuario = user.Usuario ?? "",
                NombreCompleto = $"{user.Nombre} {user.Apellido}".Trim(),
                EnLinea = _conexiones.EstaEnLinea(user.FechaUltimaActividad),
                FechaUltimaActividad = ComoUtc(user.FechaUltimaActividad),
                TotalConexiones = eventos.Count(e => e.Tipo == UsuariosConexion.TipoConecto),
                TotalDesconexiones = eventos.Count(e => e.Tipo == UsuariosConexion.TipoDesconecto || e.Tipo == UsuariosConexion.TipoExpiro),
                Eventos = eventos.Select(e => new VMUsuarioConexion
                {
                    Id = e.Id,
                    IdUsuario = e.IdUsuario,
                    Tipo = e.Tipo,
                    TipoNombre = NombreTipo(e.Tipo),
                    Fecha = ComoUtc(e.Fecha),
                    // Ip queda solo en BD / logs; no se expone en la UI.
                    Detalle = e.Detalle
                }).ToList()
            };

            return Ok(vm);
        }

        private static DateTime ComoUtc(DateTime value)
            => DateTime.SpecifyKind(value, DateTimeKind.Utc);

        private static DateTime? ComoUtc(DateTime? value)
            => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : null;


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMUser model)
        {

            var passwordHasher = new PasswordHasher<User>();


            var Usuario = new User
            {
                Usuario = model.Usuario,
                Nombre = model.Nombre,
                Apellido = model.Apellido,
                Dni = model.Dni,
                Telefono = model.Telefono,
                Direccion = model.Direccion,
                IdRol = model.IdRol,
                IdEstado = model.IdEstado,
                Activo = EsUsuarioActivo(model.IdEstado),
                Contrasena = passwordHasher.HashPassword(null, model.Contrasena)
            };

            bool respuesta = await _Usuarioservice.Insertar(Usuario);

            if (!respuesta)
                return Ok(new { valor = false });

            var creado = await _Usuarioservice.ObtenerUsuario(model.Usuario);
            return Ok(new { valor = true, id = creado?.Id ?? 0 });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMUser model)
        {
            var passwordHasher = new PasswordHasher<User>();

            // Obtiene el usuario de la base de datos
            User userbase = await _Usuarioservice.Obtener(model.Id);

            User nombreUsuario = await _Usuarioservice.ObtenerUsuario(model.Usuario);

            if (nombreUsuario != null && nombreUsuario.Id != model.Id)
            {
                return Ok(new { valor = "Usuario" });
            }

                if (model.CambioAdmin != 1) //YA QUE DESDE EL EDITAR DESDE EL ADMIN, NO VAMOS A MANDARLE LA CONTRASENA, SE LA CAMBIA DE UNA
            {
                var result = passwordHasher.VerifyHashedPassword(null, userbase.Contrasena, model.Contrasena);
                if (result != PasswordVerificationResult.Success)
                {
                    return Ok(new { valor = "Contrasena" });
                }
            }

            // Si se proporciona una contraseña nueva, úsala; de lo contrario, mantén la contraseña actual
            var passnueva = !string.IsNullOrEmpty(model.ContrasenaNueva)
                ? passwordHasher.HashPassword(null, model.ContrasenaNueva) // Hashea la nueva contraseña si es proporcionada
                : userbase.Contrasena; // Mantén la contraseña actual si no se proporciona una nueva

            // Actualiza las propiedades del objeto ya cargado
            userbase.Nombre = model.Nombre;
            userbase.Usuario = model.Usuario;
            userbase.Apellido = model.Apellido;
            userbase.Dni = model.Dni;
            userbase.Telefono = model.Telefono;
            userbase.Direccion = model.Direccion;
            userbase.IdRol = model.IdRol;
            userbase.IdEstado = model.IdEstado;
            userbase.Activo = EsUsuarioActivo(model.IdEstado);
            userbase.Contrasena = passnueva; // Asigna la nueva contraseña hasheada

            // Realiza la actualización en la base de datos
            bool respuesta = await _Usuarioservice.Actualizar(userbase);

            return Ok(new { valor = respuesta ? "OK" : "Error" });
        }

        [HttpPost]
        public async Task<IActionResult> CambiarActivo([FromBody] VMActivoToggle model)
        {
            var ok = await _Usuarioservice.CambiarActivo(model.Id, model.Activo);
            return Ok(new
            {
                valor = ok,
                mensaje = ok
                    ? (model.Activo ? "Usuario activado." : "Usuario desactivado.")
                    : "No se pudo actualizar el estado."
            });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _Usuarioservice.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var Usuario = await _Usuarioservice.Obtener(id);

            if (Usuario != null)
            {
                return StatusCode(StatusCodes.Status200OK, Usuario);
            }
            else
            {
                return StatusCode(StatusCodes.Status404NotFound);
            }
        }

        [HttpGet]
        public async Task<IActionResult> SucursalesAsignadas(int idUsuario)
        {
            var ids = await _usuariosSucursales.ObtenerIdsSucursales(idUsuario);
            return Ok(new { IdsSucursales = ids });
        }

        [HttpPost]
        public async Task<IActionResult> SucursalesActualizar([FromBody] VMUsuarioSucursalesUpdate model)
        {
            if (model == null || model.IdUsuario <= 0)
                return BadRequest();

            var ok = await _usuariosSucursales.ActualizarMasivo(model.IdUsuario, model.IdsSucursales ?? new List<int>());
            return Ok(new { valor = ok });
        }




        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        /// <summary>IdEstado 2 = inactivo/bloqueado (convención del sistema y login).</summary>
        private static bool EsUsuarioActivo(int idEstado) => idEstado != 2;
    }
}