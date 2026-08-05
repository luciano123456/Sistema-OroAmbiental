using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesOperativoService : IClientesOperativoService
    {
        private readonly IClientesOperativoRepository _repo;

        public ClientesOperativoService(IClientesOperativoRepository repo)
        {
            _repo = repo;
        }

        public Task<ClientesDashboardDto> ObtenerDashboard()
            => _repo.ObtenerDashboard();

        public Task<ClienteControlAnualDto?> ObtenerControlAnual(int idCliente, int anio)
        {
            if (idCliente <= 0)
                return Task.FromResult<ClienteControlAnualDto?>(null);

            if (anio < 2000 || anio > 2100)
                anio = DateTime.Now.Year;

            return _repo.ObtenerControlAnual(idCliente, anio);
        }

        public Task<ClienteControlFiltradoDto?> ObtenerControlMensualFiltrado(
            int idCliente,
            IReadOnlyList<int> anios,
            IReadOnlyList<int> meses,
            IReadOnlyList<int>? idsEstablecimiento = null)
        {
            if (idCliente <= 0)
                return Task.FromResult<ClienteControlFiltradoDto?>(null);

            return _repo.ObtenerControlMensualFiltrado(idCliente, anios, meses, idsEstablecimiento);
        }

        public Task<List<ClienteStockDto>> ObtenerStockCliente(int idCliente, IReadOnlyList<int>? idsEstablecimiento = null)
        {
            if (idCliente <= 0)
                return Task.FromResult(new List<ClienteStockDto>());

            return _repo.ObtenerStockCliente(idCliente, idsEstablecimiento);
        }

        public Task<List<ClienteProductoSugeridoDto>> ObtenerProductosSugeridos(int idCliente, IReadOnlyList<int>? idsEstablecimiento = null)
        {
            if (idCliente <= 0)
                return Task.FromResult(new List<ClienteProductoSugeridoDto>());

            return _repo.ObtenerProductosSugeridos(idCliente, idsEstablecimiento);
        }

        public async Task<ServiceResult> GuardarControlMensual(ClientesControlMensual model, int idUsuario)
        {
            if (model.IdCliente <= 0 || model.Anio < 2000 || model.Mes is < 1 or > 12)
                return ServiceResult.Error("Cliente, año y mes son obligatorios.", "validacion");

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
                    "Ya existe un registro de control para ese cliente, año y mes.",
                    "duplicado");
            }
        }
    }
}
