using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;
using System.Diagnostics;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class UsuariosController : Controller
    {
        private readonly IUsuariosService _Usuarioservice;
        private readonly IUsuariosSucursalesService _usuariosSucursales;

        public UsuariosController(
            IUsuariosService Usuarioservice,
            IUsuariosSucursalesService usuariosSucursales)
        {
            _Usuarioservice = Usuarioservice;
            _usuariosSucursales = usuariosSucursales;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }


        public async Task<IActionResult> Configuracion()
        {
            // Obtener el usuario actual desde la sesión usando el helper inyectado
            var userSession = await SessionHelper.GetUsuarioSesion(HttpContext);

            // Si no se pudo obtener el usuario de la sesión
            if (userSession == null)
            {
                return RedirectToAction("Login", "Index");
            }

            // Obtener los detalles del usuario desde la base de datos
            var user = await _Usuarioservice.Obtener(userSession.Id);

            // Si el usuario no existe, redirigir al login
            if (user == null)
            {
                return RedirectToAction("Login", "Index");
            }

            // Pasar los datos del usuario a la vista
            return View(user);
        }

        [HttpGet]
        public async Task<IActionResult> Lista(bool soloActivos = false)
        {
            var Usuarios = await _Usuarioservice.ObtenerTodos(soloActivos);

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
            }).ToList();

            return Ok(lista);
        }


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