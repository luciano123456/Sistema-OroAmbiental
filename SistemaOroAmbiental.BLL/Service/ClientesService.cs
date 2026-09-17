using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesService : IClientesService
    {
        private readonly IClientesRepository _repo;
        private readonly IEntidadCascadeRepository _cascadeRepo;

        public ClientesService(IClientesRepository repo, IEntidadCascadeRepository cascadeRepo)
        {
            _repo = repo;
            _cascadeRepo = cascadeRepo;
        }

        public async Task<ServiceResult> Insertar(Cliente model)
        {
            IntercambioTxtCampos.Aplicar(model);

            if (string.IsNullOrWhiteSpace(model.Nombre) ||
                string.IsNullOrWhiteSpace(model.Cuit) ||
                model.IdSucursal <= 0)
            {
                return ServiceResult.Error(
                    "Debe completar los campos obligatorios.",
                    "validacion");
            }

            var dup = await _repo.BuscarDuplicado(null, model.Nombre, model.Cuit);

            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un cliente: '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Insertar(model);

            return ok
                ? ServiceResult.Success("Cliente registrado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> Actualizar(Cliente model)
        {
            IntercambioTxtCampos.Aplicar(model);

            if (string.IsNullOrWhiteSpace(model.Nombre) ||
                string.IsNullOrWhiteSpace(model.Cuit) ||
                model.IdSucursal <= 0)
            {
                return ServiceResult.Error(
                    "Debe completar los campos obligatorios.",
                    "validacion");
            }

            var dup = await _repo.BuscarDuplicado(model.Id, model.Nombre, model.Cuit);

            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un cliente: '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Actualizar(model);

            return ok
                ? ServiceResult.Success("Cliente modificado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id)
            => _cascadeRepo.ObtenerDependenciasClienteAsync(id);

        public Task<ServiceResult> Eliminar(int id, bool cascada = false)
            => DeleteOperationHelper.ExecuteCascadeAsync(
                id,
                cascada,
                "el cliente",
                () => _cascadeRepo.ObtenerDependenciasClienteAsync(id),
                () => _cascadeRepo.EliminarClienteEnCascadaAsync(id),
                () => DeleteOperationHelper.ExecuteAsync(
                    () => _repo.Eliminar(id),
                    "el cliente",
                    "Cliente eliminado correctamente",
                    id),
                "Cliente y todos sus registros asociados fueron eliminados correctamente.",
                "Error inesperado al eliminar el cliente en cascada.");

        public Task<Cliente?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<IQueryable<Cliente>> ObtenerTodos(bool soloActivos = false)
            => _repo.ObtenerTodos(soloActivos);

        public Task<GrillaPaginadaResult<Cliente>> ListarPaginado(GrillaPaginadaConsulta consulta)
            => _repo.ListarPaginado(consulta);

        public Task<int> ObtenerIndiceEnLista(int id, GrillaPaginadaConsulta consulta)
            => _repo.ObtenerIndiceEnLista(id, consulta);

        public async Task<ServiceResult> CambiarActivo(int id, bool activo)
        {
            if (id <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            var ok = await _repo.CambiarActivo(id, activo);
            return ok
                ? ServiceResult.Success(activo ? "Registro activado." : "Registro desactivado.")
                : ServiceResult.Error("No se pudo actualizar el estado.");
        }
    }
}
