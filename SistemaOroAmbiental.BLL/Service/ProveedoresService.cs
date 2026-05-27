using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProveedoresService : IProveedoresService
    {
        private readonly IProveedoresRepository _repo;
        private readonly IEntidadCascadeRepository _cascadeRepo;

        public ProveedoresService(IProveedoresRepository repo, IEntidadCascadeRepository cascadeRepo)
        {
            _repo = repo;
            _cascadeRepo = cascadeRepo;
        }

        public async Task<ServiceResult> Insertar(Proveedore model)
        {
            if (!ValidarModelo(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var dup = await _repo.BuscarDuplicado(null, model.Nombre, model.Cuit);

            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un proveedor: '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Insertar(model);

            return ok
                ? ServiceResult.Success("Proveedor registrado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> Actualizar(Proveedore model)
        {
            if (!ValidarModelo(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var dup = await _repo.BuscarDuplicado(model.Id, model.Nombre, model.Cuit);

            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un proveedor: '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Actualizar(model);

            return ok
                ? ServiceResult.Success("Proveedor modificado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id)
            => _cascadeRepo.ObtenerDependenciasProveedorAsync(id);

        public async Task<ServiceResult> Eliminar(int id, bool cascada = false)
        {
            var deps = await _cascadeRepo.ObtenerDependenciasProveedorAsync(id);

            if (deps.TieneDependencias && !cascada)
            {
                return new ServiceResult
                {
                    Ok = false,
                    Mensaje = deps.MensajeResumen,
                    Tipo = "dependencias",
                    IdReferencia = id,
                    Dependencias = deps,
                    InstruccionesPasoAPaso = deps.InstruccionesPasoAPaso
                };
            }

            if (deps.TieneDependencias && cascada)
            {
                try
                {
                    await _cascadeRepo.EliminarProveedorEnCascadaAsync(id);
                    return ServiceResult.Success(
                        "Proveedor y todos sus registros asociados fueron eliminados correctamente.");
                }
                catch (InvalidOperationException ex)
                {
                    return ServiceResult.Error(ex.Message, "relacion", id);
                }
                catch (DbUpdateException ex)
                {
                    var msg = DeleteOperationHelper.MapDbUpdateMessage(ex, "el proveedor")
                        ?? "No se pudo eliminar el proveedor en cascada por registros relacionados.";
                    return ServiceResult.Error(msg, "relacion", id);
                }
                catch (Exception)
                {
                    return ServiceResult.Error("Error inesperado al eliminar el proveedor en cascada.", "error", id);
                }
            }

            return await DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "el proveedor",
                "Proveedor eliminado correctamente",
                id);
        }

        public Task<Proveedore?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<IQueryable<Proveedore>> ObtenerTodos()
            => _repo.ObtenerTodos();

        private static bool ValidarModelo(Proveedore model, out string error)
        {
            if (string.IsNullOrWhiteSpace(model.Nombre) ||
                string.IsNullOrWhiteSpace(model.Cuit) ||
                model.IdCondicionIva <= 0)
            {
                error = "Debe completar los campos obligatorios.";
                return false;
            }

            error = "";
            return true;
        }
    }
}
