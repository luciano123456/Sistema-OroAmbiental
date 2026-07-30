using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProveedoresOperativoService : IProveedoresOperativoService
    {
        private readonly IProveedoresOperativoRepository _repo;

        public ProveedoresOperativoService(IProveedoresOperativoRepository repo)
        {
            _repo = repo;
        }

        public Task<ProveedorControlFiltradoDto?> ObtenerControlMensualFiltrado(
            int idProveedor,
            IReadOnlyList<int> anios,
            IReadOnlyList<int> meses)
        {
            if (idProveedor <= 0)
                return Task.FromResult<ProveedorControlFiltradoDto?>(null);

            return _repo.ObtenerControlMensualFiltrado(idProveedor, anios, meses);
        }

        public async Task<ServiceResult> GuardarControlMensual(ProveedoresControlMensual model, int idUsuario)
        {
            if (model.IdProveedor <= 0 || model.Anio < 2000 || model.Mes is < 1 or > 12)
                return ServiceResult.Error("Proveedor, ano y mes son obligatorios.", "validacion");

            var esNuevo = model.Id <= 0;

            if (!esNuevo)
            {
                var ok = await _repo.GuardarControlMensual(model, false, idUsuario);
                return ok
                    ? ServiceResult.Success("Control mensual actualizado correctamente.")
                    : ServiceResult.Error("No se pudo actualizar el control mensual.");
            }

            try
            {
                var ok = await _repo.GuardarControlMensual(model, true, idUsuario);
                return ok
                    ? ServiceResult.Success("Control mensual registrado correctamente.")
                    : ServiceResult.Error("No se pudo registrar el control mensual.");
            }
            catch (DbUpdateException)
            {
                return ServiceResult.Error(
                    "Ya existe un registro de control para ese proveedor, ano y mes.",
                    "duplicado");
            }
        }
    }
}
