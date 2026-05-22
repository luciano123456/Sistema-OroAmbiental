using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ContratosService : IContratosService
    {
        private readonly IContratosRepository _repo;
        private readonly SistemaOroAmbientalContext _db;

        public ContratosService(IContratosRepository repo, SistemaOroAmbientalContext db)
        {
            _repo = repo;
            _db = db;
        }

        public Task<List<Contrato>> ListarFiltrado(int? idCliente, bool? soloVigentes, string? texto)
            => _repo.ListarFiltrado(idCliente, soloVigentes, texto);

        public Task<IQueryable<Contrato>> ObtenerTodos() => _repo.ObtenerTodos();

        public Task<Contrato?> Obtener(int id) => _repo.Obtener(id);

        public async Task<ServiceResult> Insertar(Contrato model)
        {
            var validacion = await Validar(model);
            if (validacion != null) return validacion;

            var dup = await _repo.BuscarDuplicado(null, model.IdCliente, model.IdEstablecimiento);
            if (dup != null)
            {
                return ServiceResult.Error(
                    "Ya existe un contrato para este cliente y establecimiento.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Insertar(model);
            if (!ok)
                return ServiceResult.Error("No se pudo guardar el contrato.");

            return new ServiceResult
            {
                Ok = true,
                Mensaje = "Contrato registrado correctamente",
                Tipo = "success",
                IdReferencia = model.Id
            };
        }

        public async Task<ServiceResult> Actualizar(Contrato model)
        {
            var validacion = await Validar(model);
            if (validacion != null) return validacion;

            var dup = await _repo.BuscarDuplicado(model.Id, model.IdCliente, model.IdEstablecimiento);
            if (dup != null)
            {
                return ServiceResult.Error(
                    "Ya existe un contrato para este cliente y establecimiento.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Actualizar(model);
            return ok
                ? ServiceResult.Success("Contrato modificado correctamente")
                : ServiceResult.Error("No se pudo guardar el contrato.");
        }

        public async Task<ServiceResult> Eliminar(int id)
        {
            try
            {
                if (await _repo.TieneEntregas(id))
                {
                    return ServiceResult.Error(
                        "No se puede eliminar porque tiene entregas asociadas.",
                        "relacion",
                        id);
                }

                var ok = await _repo.Eliminar(id);
                if (!ok)
                    return ServiceResult.Error("No se encontró el contrato.");

                return ServiceResult.Success("Contrato eliminado correctamente");
            }
            catch (InvalidOperationException ex) when (ex.Message == "ENTREGAS")
            {
                return ServiceResult.Error(
                    "No se puede eliminar porque tiene entregas asociadas.",
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

        private async Task<ServiceResult?> Validar(Contrato model)
        {
            if (model.IdCliente <= 0)
                return ServiceResult.Error("Debe seleccionar un cliente.", "validacion");

            if (model.IdEstablecimiento <= 0)
                return ServiceResult.Error("Debe seleccionar un establecimiento.", "validacion");

            if (model.FechaContrato == default)
                return ServiceResult.Error("Indique la fecha del contrato.", "validacion");

            if (model.FechaInicio == default)
                return ServiceResult.Error("Indique la fecha de inicio.", "validacion");

            if (model.FechaVencimiento == default)
                return ServiceResult.Error("Indique la fecha de vencimiento.", "validacion");

            if (model.FechaVencimiento < model.FechaInicio)
                return ServiceResult.Error("La fecha de vencimiento no puede ser anterior al inicio.", "validacion");

            var est = await _db.ClientesEstablecimientos
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == model.IdEstablecimiento);

            if (est == null)
                return ServiceResult.Error("El establecimiento no existe.", "validacion");

            if (est.IdCliente != model.IdCliente)
                return ServiceResult.Error("El establecimiento no pertenece al cliente seleccionado.", "validacion");

            return null;
        }
    }
}
