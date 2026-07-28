using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class LibroDiarioService : ILibroDiarioService
    {
        private readonly ILibroDiarioRepository _repo;

        public LibroDiarioService(ILibroDiarioRepository repo)
        {
            _repo = repo;
        }

        public Task<List<LibroDiarioConcepto>> ListarConceptos(bool soloActivos)
            => _repo.ListarConceptos(soloActivos);

        public Task<List<LibroDiarioMovimientoDto>> ListarMovimientos(LibroDiarioFiltroDto filtro)
            => _repo.ListarMovimientos(filtro);

        public async Task<(LibroDiarioResumenDto resumen, decimal saldoAnterior)> ObtenerResumen(LibroDiarioFiltroDto filtro)
        {
            filtro ??= new LibroDiarioFiltroDto();
            var saldoAnterior = await _repo.SaldoAnterior(filtro);
            var resumen = await _repo.ObtenerResumen(filtro);
            return (resumen, saldoAnterior);
        }

        public async Task<LibroDiarioMovimientoDto?> ObtenerMovimiento(int id)
        {
            var m = await _repo.ObtenerMovimiento(id);
            if (m == null)
                return null;

            return new LibroDiarioMovimientoDto
            {
                Id = m.Id,
                Fecha = m.Fecha,
                IdConcepto = m.IdConcepto,
                Concepto = m.Concepto,
                IdCliente = m.IdCliente,
                Cliente = m.IdClienteNavigation?.Nombre,
                IdProveedor = m.IdProveedor,
                Proveedor = m.IdProveedorNavigation?.Nombre,
                RecorridoTexto = m.RecorridoTexto,
                Unidades = m.Unidades,
                PrecioUnitario = m.PrecioUnitario,
                Debe = m.Debe,
                Haber = m.Haber,
                PorcIva = m.PorcIva,
                Iva = m.Iva,
                OtrosImp = m.OtrosImp,
                Total = m.Total,
                Saldo = m.Saldo,
                FormaPago = m.FormaPago,
                EsBancario = m.EsBancario
            };
        }

        public async Task<ServiceResult> InsertarMovimiento(LibroDiarioMovimientoDto dto, int idUsuario)
        {
            await ResolverTercerosAsync(dto);

            var validacion = ValidarMovimiento(dto);
            if (validacion != null)
                return validacion;

            var ahora = DateTime.Now;
            var entity = MapToEntity(dto, idUsuario, ahora);

            if (dto.IdConcepto.HasValue && dto.IdConcepto > 0)
            {
                var conceptos = await _repo.ListarConceptos(soloActivos: false);
                var concepto = conceptos.FirstOrDefault(x => x.Id == dto.IdConcepto);
                if (concepto != null)
                {
                    entity.IdProducto = concepto.IdProducto;
                    entity.TipoStock = concepto.TipoStock;
                }
            }

            await _repo.InsertarMovimiento(entity);
            return ServiceResult.Success("Movimiento registrado correctamente.");
        }

        public async Task<ServiceResult> ActualizarMovimiento(LibroDiarioMovimientoDto dto, int idUsuario)
        {
            if (dto.Id <= 0)
                return ServiceResult.Error("Movimiento inválido.", "validacion");

            await ResolverTercerosAsync(dto);

            var validacion = ValidarMovimiento(dto);
            if (validacion != null)
                return validacion;

            var existente = await _repo.ObtenerMovimiento(dto.Id);
            if (existente == null)
                return ServiceResult.Error("No se encontró el movimiento.", "validacion");

            var ahora = DateTime.Now;
            var entity = MapToEntity(dto, idUsuario, ahora, esModificacion: true);
            entity.Id = dto.Id;
            entity.IdUsuarioRegistra = existente.IdUsuarioRegistra;
            entity.FechaUsuarioRegistra = existente.FechaUsuarioRegistra;

            if (dto.IdConcepto.HasValue && dto.IdConcepto > 0)
            {
                var conceptos = await _repo.ListarConceptos(soloActivos: false);
                var concepto = conceptos.FirstOrDefault(x => x.Id == dto.IdConcepto);
                if (concepto != null)
                {
                    entity.IdProducto = concepto.IdProducto;
                    entity.TipoStock = concepto.TipoStock;
                }
            }
            else
            {
                entity.IdProducto = existente.IdProducto;
                entity.TipoStock = existente.TipoStock;
            }

            var ok = await _repo.ActualizarMovimiento(entity);
            return ok
                ? ServiceResult.Success("Movimiento modificado correctamente.")
                : ServiceResult.Error("No se pudo modificar el movimiento.");
        }

        public Task<ServiceResult> EliminarMovimiento(int id)
            => DeleteOperationHelper.ExecuteAsync(
                () => _repo.EliminarMovimiento(id),
                "el movimiento del libro diario",
                "Movimiento eliminado correctamente",
                id);

        public Task<List<(int Id, string Nombre)>> AutocompleteClientes(string? buscar)
            => _repo.AutocompleteClientes(buscar);

        public Task<List<(int Id, string Nombre)>> AutocompleteProveedores(string? buscar)
            => _repo.AutocompleteProveedores(buscar);

        private async Task ResolverTercerosAsync(LibroDiarioMovimientoDto dto)
        {
            if ((!dto.IdCliente.HasValue || dto.IdCliente <= 0) &&
                !string.IsNullOrWhiteSpace(dto.Cliente))
            {
                var nombreCliente = dto.Cliente.Trim();
                var clientes = await _repo.AutocompleteClientes(nombreCliente);
                var exacto = clientes.FirstOrDefault(c =>
                    string.Equals(c.Nombre, nombreCliente, StringComparison.OrdinalIgnoreCase));

                if (exacto.Id > 0)
                    dto.IdCliente = exacto.Id;
            }

            if ((!dto.IdProveedor.HasValue || dto.IdProveedor <= 0) &&
                !string.IsNullOrWhiteSpace(dto.Proveedor))
            {
                var nombreProveedor = dto.Proveedor.Trim();
                var proveedores = await _repo.AutocompleteProveedores(nombreProveedor);
                var exacto = proveedores.FirstOrDefault(p =>
                    string.Equals(p.Nombre, nombreProveedor, StringComparison.OrdinalIgnoreCase));

                if (exacto.Id > 0)
                    dto.IdProveedor = exacto.Id;
            }
        }

        private static ServiceResult? ValidarMovimiento(LibroDiarioMovimientoDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (dto.Debe < 0 || dto.Haber < 0)
                return ServiceResult.Error("Debe y Haber no pueden ser negativos.", "validacion");

            if (dto.Debe > 0 && dto.Haber > 0)
                return ServiceResult.Error("Indique importe solo en Debe o en Haber.", "validacion");

            if (dto.Debe == 0 && dto.Haber == 0)
                return ServiceResult.Error("Debe indicar un importe en Debe o Haber.", "validacion");

            return null;
        }

        private static LibroDiarioMovimiento MapToEntity(
            LibroDiarioMovimientoDto dto,
            int idUsuario,
            DateTime ahora,
            bool esModificacion = false)
        {
            var total = dto.Total;
            if (total == 0)
            {
                var baseImporte = dto.Debe > 0 ? dto.Debe : dto.Haber;
                total = baseImporte + dto.Iva + dto.OtrosImp;
            }

            var entity = new LibroDiarioMovimiento
            {
                Fecha = dto.Fecha,
                IdConcepto = dto.IdConcepto,
                Concepto = dto.Concepto.Trim(),
                IdCliente = dto.IdCliente,
                IdProveedor = dto.IdProveedor,
                RecorridoTexto = dto.RecorridoTexto?.Trim(),
                Unidades = dto.Unidades,
                PrecioUnitario = dto.PrecioUnitario,
                Debe = dto.Debe,
                Haber = dto.Haber,
                PorcIva = dto.PorcIva,
                Iva = dto.Iva,
                OtrosImp = dto.OtrosImp,
                Total = total,
                FormaPago = dto.FormaPago?.Trim(),
                EsBancario = dto.EsBancario
            };

            if (esModificacion)
            {
                entity.IdUsuarioModifica = idUsuario;
                entity.FechaUsuarioModifica = ahora;
            }
            else
            {
                entity.IdUsuarioRegistra = idUsuario;
                entity.FechaUsuarioRegistra = ahora;
            }

            return entity;
        }
    }
}
