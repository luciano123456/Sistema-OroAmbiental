using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesEstablecimientosService : IClientesEstablecimientosService
    {
        private readonly IClientesEstablecimientosRepository _repo;

        public ClientesEstablecimientosService(IClientesEstablecimientosRepository repo)
        {
            _repo = repo;
        }

        public async Task<ServiceResult> Insertar(ClientesEstablecimiento model)
        {
            var validacion = Validar(model);
            if (validacion != null) return validacion;

            var dup = await _repo.BuscarDuplicado(null, model.IdCliente, model.Nombre.Trim());
            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un establecimiento '{dup.Nombre}' para este cliente.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Insertar(model);
            return ok
                ? ServiceResult.Success("Establecimiento registrado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> Actualizar(ClientesEstablecimiento model)
        {
            var validacion = Validar(model);
            if (validacion != null) return validacion;

            var dup = await _repo.BuscarDuplicado(model.Id, model.IdCliente, model.Nombre.Trim());
            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un establecimiento '{dup.Nombre}' para este cliente.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Actualizar(model);
            return ok
                ? ServiceResult.Success("Establecimiento modificado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> Eliminar(int id)
        {
            try
            {
                if (await _repo.TieneContratos(id))
                {
                    return ServiceResult.Error(
                        "No se puede eliminar porque tiene contratos asociados.",
                        "relacion",
                        id);
                }

                var ok = await _repo.Eliminar(id);
                if (!ok)
                    return ServiceResult.Error("No se encontró el registro.");

                return ServiceResult.Success("Establecimiento eliminado correctamente");
            }
            catch (InvalidOperationException ex) when (ex.Message == "CONTRATOS")
            {
                return ServiceResult.Error(
                    "No se puede eliminar porque tiene contratos asociados.",
                    "relacion",
                    id);
            }
            catch (DbUpdateException)
            {
                return ServiceResult.Error(
                    "No se puede eliminar porque posee registros relacionados.",
                    "relacion",
                    id);
            }
            catch
            {
                return ServiceResult.Error("Error inesperado al eliminar.");
            }
        }

        public Task<ClientesEstablecimiento?> Obtener(int id) => _repo.Obtener(id);

        public Task<IQueryable<ClientesEstablecimiento>> ObtenerTodos() => _repo.ObtenerTodos();

        private static ServiceResult? Validar(ClientesEstablecimiento model)
        {
            if (model.IdCliente <= 0)
                return ServiceResult.Error("Debe seleccionar un cliente.", "validacion");

            if (string.IsNullOrWhiteSpace(model.Nombre))
                return ServiceResult.Error("El nombre es obligatorio.", "validacion");

            if (model.IdDiaRecoleccion <= 0 || model.IdSemanaRecoleccion <= 0 || model.IdListaPrecio <= 0)
                return ServiceResult.Error("Día, semana y lista de precios son obligatorios.", "validacion");

            if (model.HorarioRecoleccionHasta <= model.HorarioRecoleccionDesde)
                return ServiceResult.Error("El horario hasta debe ser mayor al horario desde.", "validacion");

            return null;
        }
    }
}
