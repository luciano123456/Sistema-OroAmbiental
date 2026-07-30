using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesEstablecimientosService : IClientesEstablecimientosService
    {
        private readonly IClientesEstablecimientosRepository _repo;
        private readonly IDeleteConflictChecker _deleteChecker;

        public ClientesEstablecimientosService(
            IClientesEstablecimientosRepository repo,
            IDeleteConflictChecker deleteChecker)
        {
            _repo = repo;
            _deleteChecker = deleteChecker;
        }

        public async Task<ServiceResult> Insertar(ClientesEstablecimiento model)
        {
            var validacion = Validar(model);
            if (validacion != null) return validacion;

            var dup = await _repo.BuscarDuplicado(null, model.IdEstablecimientoCliente);
            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un establecimiento con Id del ministerio '{dup.IdEstablecimientoCliente}' ({dup.Nombre}).",
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

            var dup = await _repo.BuscarDuplicado(model.Id, model.IdEstablecimientoCliente);
            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un establecimiento con Id del ministerio '{dup.IdEstablecimientoCliente}' ({dup.Nombre}).",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Actualizar(model);
            return ok
                ? ServiceResult.Success("Establecimiento modificado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public Task<ServiceResult> Eliminar(int id)
            => DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "el establecimiento",
                "Establecimiento eliminado correctamente",
                id,
                () => _deleteChecker.EstablecimientoAsync(id));

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

            if (string.IsNullOrWhiteSpace(model.DiasHorarios)
                && model.HorarioRecoleccionHasta <= model.HorarioRecoleccionDesde)
                return ServiceResult.Error("El horario hasta debe ser mayor al horario desde.", "validacion");

            return null;
        }
    }
}
