using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProductosService : IProductosService
    {
        private readonly IProductosRepository _repo;

        public ProductosService(IProductosRepository repo)
        {
            _repo = repo;
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

        public async Task<ServiceResult> Eliminar(int id)
        {
            try
            {
                var ok = await _repo.Eliminar(id);

                if (!ok)
                    return ServiceResult.Error("No se encontró el registro.");

                return ServiceResult.Success("Producto eliminado correctamente");
            }
            catch (InvalidOperationException ex) when (ex.Message == "PRODUCTO_EN_USO")
            {
                return ServiceResult.Error(
                    "No se puede eliminar porque posee registros relacionados (compras, entregas o establecimientos).",
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
                return ServiceResult.Error("Error inesperado.");
            }
        }

        public Task<Producto?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<IQueryable<Producto>> ObtenerTodos()
            => _repo.ObtenerTodos();

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
