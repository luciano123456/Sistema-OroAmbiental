using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProductosService : IProductosService
    {
        private readonly IProductosRepository _repo;
        private readonly IDeleteConflictChecker _deleteChecker;

        public ProductosService(IProductosRepository repo, IDeleteConflictChecker deleteChecker)
        {
            _repo = repo;
            _deleteChecker = deleteChecker;
        }

        public async Task<ServiceResult> Insertar(Producto model)
        {
            if (!ValidarModelo(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var dup = await _repo.BuscarDuplicado(null, model.Nombre);

            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un producto: '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Insertar(model);

            return ok
                ? ServiceResult.Success("Producto registrado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> Actualizar(Producto model)
        {
            if (!ValidarModelo(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var dup = await _repo.BuscarDuplicado(model.Id, model.Nombre);

            if (dup != null)
            {
                return ServiceResult.Error(
                    $"Ya existe un producto: '{dup.Nombre}'.",
                    "duplicado",
                    dup.Id);
            }

            var ok = await _repo.Actualizar(model);

            return ok
                ? ServiceResult.Success("Producto modificado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public Task<ServiceResult> Eliminar(int id)
            => DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "el producto",
                "Producto eliminado correctamente",
                id,
                () => _deleteChecker.ProductoAsync(id));

        public Task<Producto?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<IQueryable<Producto>> ObtenerTodos(bool soloActivos = false)
            => _repo.ObtenerTodos(soloActivos);

        public async Task<ServiceResult> CambiarActivo(int id, bool activo)
        {
            if (id <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            var ok = await _repo.CambiarActivo(id, activo);
            return ok
                ? ServiceResult.Success(activo ? "Producto activado." : "Producto desactivado.")
                : ServiceResult.Error("No se pudo actualizar el estado.");
        }

        public Task<Dictionary<int, decimal>> ObtenerStockTotalesPorProducto()
            => _repo.ObtenerStockTotalesPorProducto();

        public async Task<(Producto? producto, List<ProductoHistorialCostoFila> historial)> ObtenerHistorialCosto(int idProducto)
        {
            var producto = await _repo.Obtener(idProducto);
            if (producto == null)
                return (null, new List<ProductoHistorialCostoFila>());

            var historial = await _repo.ObtenerHistorialCosto(idProducto);
            return (producto, historial);
        }

        private static bool ValidarModelo(Producto model, out string error)
        {
            if (string.IsNullOrWhiteSpace(model.Nombre))
            {
                error = "Debe completar los campos obligatorios.";
                return false;
            }

            if (model.IdCategoria <= 0 || model.IdMedida <= 0)
            {
                error = "Debe completar los campos obligatorios.";
                return false;
            }

            if (model.CostoUnitario < 0)
            {
                error = "El costo unitario no puede ser negativo.";
                return false;
            }

            if (model.StockMinimo < 0)
            {
                error = "El stock mínimo no puede ser negativo.";
                return false;
            }

            error = "";
            return true;
        }
    }
}
