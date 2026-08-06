using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class DeleteConflictChecker : IDeleteConflictChecker
    {
        private readonly SistemaOroAmbientalContext _db;

        public DeleteConflictChecker(SistemaOroAmbientalContext db)
        {
            _db = db;
        }

        public async Task<string?> ClienteAsync(int id)
        {
            var partes = new List<string>();

            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdCliente == id);
            if (est > 0) partes.Add($"{est} establecimiento(s)");

            var cont = await _db.ClientesContactos.CountAsync(x => x.IdCliente == id);
            if (cont > 0) partes.Add($"{cont} contacto(s)");

            var contr = await _db.Contratos.CountAsync(x => x.IdCliente == id);
            if (contr > 0) partes.Add($"{contr} contrato(s)");

            var cc = await _db.ClientesCuentaCorrientes.CountAsync(x => x.IdCliente == id);
            if (cc > 0) partes.Add("cuenta corriente con movimientos");

            return Mensaje("este cliente", partes);
        }

        public async Task<string?> ProveedorAsync(int id)
        {
            var partes = new List<string>();

            var contactos = await _db.ProveedoresContactos.CountAsync(x => x.IdProveedor == id);
            if (contactos > 0) partes.Add($"{contactos} contacto(s)");

            var compras = await _db.Compras.CountAsync(x => x.IdProveedor == id);
            if (compras > 0) partes.Add($"{compras} compra(s)");

            var cc = await _db.ProveedoresCuentaCorrientes.CountAsync(x => x.IdProveedor == id);
            if (cc > 0) partes.Add("cuenta corriente con movimientos");

            return Mensaje("este proveedor", partes);
        }

        public async Task<string?> ProductoAsync(int id)
        {
            var partes = new List<string>();

            var compras = await _db.ComprasProductos.CountAsync(x => x.IdProducto == id);
            if (compras > 0) partes.Add($"{compras} línea(s) en compras");

            var entregas = await _db.ClientesEntregasProductos.CountAsync(x => x.IdProducto == id);
            if (entregas > 0) partes.Add($"{entregas} línea(s) en entregas");

            var est = await _db.ClientesEstablecimientosProductos.CountAsync(x => x.IdProducto == id);
            if (est > 0) partes.Add($"{est} asignación(es) en establecimientos");

            return Mensaje("este producto", partes);
        }

        public async Task<string?> EstablecimientoAsync(int id)
        {
            var partes = new List<string>();

            var contr = await _db.Contratos.CountAsync(x => x.IdEstablecimiento == id);
            if (contr > 0) partes.Add($"{contr} contrato(s)");

            var ent = await _db.ClientesEntregas.CountAsync(e => e.IdEstablecimiento == id);
            if (ent > 0) partes.Add($"{ent} entrega(s)");

            var prod = await _db.ClientesEstablecimientosProductos.CountAsync(x => x.IdEstablecimiento == id);
            if (prod > 0) partes.Add($"{prod} producto(s) asignados");

            var cont = await _db.ClientesEstablecimientosContactos.CountAsync(x => x.IdEstablecimiento == id);
            if (cont > 0) partes.Add($"{cont} contacto(s)");

            return Mensaje("este establecimiento", partes);
        }

        public async Task<string?> ContratoAsync(int id)
        {
            var ent = await _db.ClientesEntregas.CountAsync(x => x.IdContrato == id);
            if (ent > 0)
                return $"No se pudo eliminar este contrato porque tiene {ent} entrega(s) asociada(s).";

            var docs = await _db.ContratosDocumentos.CountAsync(x => x.IdContrato == id);
            if (docs > 0)
                return $"No se pudo eliminar este contrato porque tiene {docs} documento(s) adjunto(s).";

            return null;
        }

        public Task<string?> CompraAsync(int id)
            => Task.FromResult<string?>(null);

        public Task<string?> EntregaAsync(int id)
            => Task.FromResult<string?>(null);

        public async Task<string?> ListaPrecioAsync(int id)
        {
            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdListaPrecio == id);
            if (est > 0)
                return $"No se pudo eliminar esta lista de precios porque tiene {est} establecimiento(s) asociado(s).";

            var precios = await _db.ProductosPrecios.CountAsync(x => x.IdListaPrecio == id);
            if (precios > 0)
                return $"No se pudo eliminar esta lista de precios porque tiene {precios} precio(s) de producto asociados.";

            var cep = await _db.ClientesEstablecimientosProductos.CountAsync(x => x.IdListaPrecio == id);
            if (cep > 0)
                return $"No se pudo eliminar esta lista de precios porque tiene {cep} producto(s) de establecimiento asociados.";

            var entregas = await _db.ClientesEntregasProductos.CountAsync(x => x.IdListaPrecio == id);
            if (entregas > 0)
                return $"No se pudo eliminar esta lista de precios porque está usada en {entregas} línea(s) de entrega.";

            var recuperados = await _db.ClientesEntregasProductosRecuperados.CountAsync(x => x.IdListaPrecio == id);
            if (recuperados > 0)
                return $"No se pudo eliminar esta lista de precios porque está usada en {recuperados} línea(s) de productos recuperados.";

            return null;
        }

        public async Task<string?> TipoPagoAsync(int id)
        {
            var listas = await _db.ListasPrecios.CountAsync(x => x.IdTipoPago == id);
            if (listas > 0)
                return $"No se pudo eliminar este tipo de pago porque tiene {listas} lista(s) de precio asociadas.";

            return null;
        }

        public async Task<string?> SucursalAsync(int id)
        {
            var clientes = await _db.Clientes.CountAsync(x => x.IdSucursal == id);
            if (clientes > 0)
                return $"No se pudo eliminar esta sucursal porque tiene {clientes} cliente(s) asociado(s).";

            var inv = await _db.Inventarios.CountAsync(x => x.IdSucursal == id);
            if (inv > 0)
                return $"No se pudo eliminar esta sucursal porque tiene inventario asociado.";

            return null;
        }

        public Task<string?> GastoAsync(int id)
            => Task.FromResult<string?>(null);

        public async Task<string?> CuentaAsync(int id)
        {
            var partes = new List<string>();

            var gastos = await _db.Gastos.CountAsync(x => x.IdCuenta == id);
            if (gastos > 0) partes.Add($"{gastos} gasto(s)");

            var cajas = await _db.CajasSaldos.CountAsync(x => x.IdCuenta == id);
            if (cajas > 0) partes.Add($"{cajas} caja(s)");

            var cobros = await _db.ClientesCobros.CountAsync(x => x.IdCuenta == id);
            if (cobros > 0) partes.Add($"{cobros} cobro(s) de clientes");

            var pagos = await _db.ProveedoresPagos.CountAsync(x => x.IdCuenta == id);
            if (pagos > 0) partes.Add($"{pagos} pago(s) a proveedores");

            return Mensaje("esta cuenta", partes);
        }

        public async Task<string?> CamionAsync(int id)
        {
            var partes = new List<string>();

            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdCamion == id);
            if (est > 0) partes.Add($"{est} establecimiento(s)");

            var ent = await _db.ClientesEntregas.CountAsync(x => x.IdCamion == id);
            if (ent > 0) partes.Add($"{ent} entrega(s)");

            return Mensaje("este camión", partes);
        }

        public async Task<string?> CatalogoAsync<T>(int id) where T : class
        {
            return typeof(T).Name switch
            {
                nameof(Banco) => await BancoAsync(id),
                nameof(CondicionesIva) => await CondicionIvaAsync(id),
                nameof(ProductosCategoria) => await ProductoCategoriaAsync(id),
                nameof(UnidadesMedida) => await UnidadMedidaAsync(id),
                nameof(GastosCategoria) => await GastoCategoriaAsync(id),
                nameof(Provincia) => await ProvinciaAsync(id),
                nameof(Dia) => await DiaAsync(id),
                nameof(Semana) => await SemanaAsync(id),
                nameof(EntregasEstado) => await EntregaEstadoAsync(id),
                nameof(ClientesProfesion) => await ClienteProfesionAsync(id),
                nameof(TiposContrato) => await TipoContratoAsync(id),
                nameof(UsuariosEstado) => await UsuarioEstadoAsync(id),
                nameof(UsuariosRol) => await UsuarioRolAsync(id),
                nameof(Partido) => await PartidoAsync(id),
                nameof(Localidad) => await LocalidadAsync(id),
                nameof(ClientesEstado) => await ClienteEstadoAsync(id),
                nameof(ClientesMotivo) => await ClienteMotivoAsync(id),
                nameof(ClientesCalificacion) => await ClienteCalificacionAsync(id),
                _ => null
            };
        }

        private async Task<string?> BancoAsync(int id)
        {
            var n = await _db.Proveedores.CountAsync(x => x.IdBanco == id);
            return n > 0
                ? $"No se pudo eliminar este banco porque tiene {n} proveedor(es) asociado(s)."
                : null;
        }

        private async Task<string?> CondicionIvaAsync(int id)
        {
            var partes = new List<string>();
            var cli = await _db.Clientes.CountAsync(x => x.IdCondicionIva == id);
            if (cli > 0) partes.Add($"{cli} cliente(s)");
            var prov = await _db.Proveedores.CountAsync(x => x.IdCondicionIva == id);
            if (prov > 0) partes.Add($"{prov} proveedor(es)");
            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdCondicionIva == id);
            if (est > 0) partes.Add($"{est} establecimiento(s)");
            return Mensaje("esta condición de IVA", partes);
        }

        private async Task<string?> ProductoCategoriaAsync(int id)
        {
            var n = await _db.Productos.CountAsync(x => x.IdCategoria == id);
            return n > 0
                ? $"No se pudo eliminar esta categoría porque tiene {n} producto(s) asociado(s)."
                : null;
        }

        private async Task<string?> UnidadMedidaAsync(int id)
        {
            var n = await _db.Productos.CountAsync(x => x.IdMedida == id);
            return n > 0
                ? $"No se pudo eliminar esta unidad de medida porque tiene {n} producto(s) asociado(s)."
                : null;
        }

        private async Task<string?> GastoCategoriaAsync(int id)
        {
            var n = await _db.Gastos.CountAsync(x => x.IdCategoria == id);
            return n > 0
                ? $"No se pudo eliminar esta categoría de gasto porque tiene {n} gasto(s) asociado(s)."
                : null;
        }

        private async Task<string?> ProvinciaAsync(int id)
        {
            var partes = new List<string>();
            var cli = await _db.Clientes.CountAsync(x => x.IdProvincia == id);
            if (cli > 0) partes.Add($"{cli} cliente(s)");
            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdProvincia == id);
            if (est > 0) partes.Add($"{est} establecimiento(s)");
            var partidos = await _db.Partidos.CountAsync(x => x.IdProvincia == id);
            if (partidos > 0) partes.Add($"{partidos} partido(s)");
            var loc = await _db.Localidades.CountAsync(x => x.IdProvincia == id);
            if (loc > 0) partes.Add($"{loc} localidad(es)");
            return Mensaje("esta provincia", partes);
        }

        private async Task<string?> PartidoAsync(int id)
        {
            var partes = new List<string>();
            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdPartido == id);
            if (est > 0) partes.Add($"{est} establecimiento(s)");
            var loc = await _db.Localidades.CountAsync(x => x.IdPartido == id);
            if (loc > 0) partes.Add($"{loc} localidad(es)");
            return Mensaje("este partido", partes);
        }

        private async Task<string?> LocalidadAsync(int id)
        {
            var partes = new List<string>();
            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdLocalidad == id);
            if (est > 0) partes.Add($"{est} establecimiento(s)");
            return Mensaje("esta localidad", partes);
        }

        private async Task<string?> ClienteEstadoAsync(int id)
        {
            var n = await _db.Clientes.CountAsync(x => x.IdEstado == id);
            return n > 0
                ? $"No se pudo eliminar este estado de cliente porque tiene {n} cliente(s) asociado(s)."
                : null;
        }

        private async Task<string?> ClienteMotivoAsync(int id)
        {
            var n = await _db.Clientes.CountAsync(x => x.IdMotivo == id);
            return n > 0
                ? $"No se pudo eliminar este motivo porque tiene {n} cliente(s) asociado(s)."
                : null;
        }

        private async Task<string?> ClienteCalificacionAsync(int id)
        {
            var n = await _db.Clientes.CountAsync(x => x.IdCalificacion == id);
            return n > 0
                ? $"No se pudo eliminar esta calificación porque tiene {n} cliente(s) asociado(s)."
                : null;
        }

        private async Task<string?> DiaAsync(int id)
        {
            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdDiaRecoleccion == id);
            if (est > 0)
                return $"No se pudo eliminar este día porque tiene {est} establecimiento(s) asociado(s).";

            var dias = await _db.ClientesEstablecimientosDias.CountAsync(x => x.IdDia == id);
            if (dias > 0)
                return $"No se pudo eliminar este día porque tiene {dias} horario(s) de recolección asociado(s).";

            return null;
        }

        private async Task<string?> SemanaAsync(int id)
        {
            var n = await _db.ClientesEstablecimientos.CountAsync(x => x.IdSemanaRecoleccion == id);
            return n > 0
                ? $"No se pudo eliminar esta semana porque tiene {n} establecimiento(s) asociado(s)."
                : null;
        }

        private async Task<string?> EntregaEstadoAsync(int id)
        {
            var n = await _db.ClientesEntregas.CountAsync(x => x.IdEstado == id);
            return n > 0
                ? $"No se pudo eliminar este estado porque tiene {n} entrega(s) asociada(s)."
                : null;
        }

        private async Task<string?> ClienteProfesionAsync(int id)
        {
            var cli = await _db.Clientes.CountAsync(x => x.IdProfesion == id);
            if (cli > 0)
                return $"No se pudo eliminar esta profesión porque tiene {cli} cliente(s) asociado(s).";

            var fer = await _db.FeriadosProfesiones.CountAsync(x => x.IdProfesion == id);
            if (fer > 0)
                return $"No se pudo eliminar esta profesión porque tiene {fer} feriado(s) asociado(s).";

            return null;
        }

        private async Task<string?> TipoContratoAsync(int id)
        {
            var n = await _db.Contratos.CountAsync(x => x.IdTipoContrato == id);
            return n > 0
                ? $"No se pudo eliminar este tipo de contrato porque tiene {n} contrato(s) asociado(s)."
                : null;
        }

        private async Task<string?> UsuarioEstadoAsync(int id)
        {
            var n = await _db.Usuarios.CountAsync(x => x.IdEstado == id);
            return n > 0
                ? $"No se pudo eliminar este estado de usuario porque tiene {n} usuario(s) asociado(s)."
                : null;
        }

        private async Task<string?> UsuarioRolAsync(int id)
        {
            var usuarios = await _db.Usuarios.CountAsync(x => x.IdRol == id);
            if (usuarios > 0)
                return $"No se pudo eliminar este rol porque tiene {usuarios} usuario(s) asociado(s).";

            var permisos = await _db.UsuariosRolesPermisos.CountAsync(x => x.IdRol == id);
            if (permisos > 0)
                return "No se pudo eliminar este rol porque tiene permisos configurados.";

            return null;
        }

        private static string? Mensaje(string entidad, List<string> partes)
        {
            if (partes.Count == 0)
                return null;

            return $"No se pudo eliminar {entidad} porque tiene {string.Join(", ", partes)} asociados.";
        }
    }
}
