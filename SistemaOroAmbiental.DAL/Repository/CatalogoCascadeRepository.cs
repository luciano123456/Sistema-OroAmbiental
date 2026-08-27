using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class CatalogoCascadeRepository : ICatalogoCascadeRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public CatalogoCascadeRepository(SistemaOroAmbientalContext db)
        {
            _db = db;
        }

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasAsync<T>(int id) where T : class
            => typeof(T).Name switch
            {
                nameof(Dia) => DiaDeps(id),
                nameof(Semana) => SemanaDeps(id),
                nameof(Banco) => BancoDeps(id),
                nameof(CondicionesIva) => CondicionIvaDeps(id),
                nameof(ProductosCategoria) => ProductoCategoriaDeps(id),
                nameof(UnidadesMedida) => UnidadMedidaDeps(id),
                nameof(GastosCategoria) => GastoCategoriaDeps(id),
                nameof(Provincia) => ProvinciaDeps(id),
                nameof(Partido) => PartidoDeps(id),
                nameof(Localidad) => LocalidadDeps(id),
                nameof(ClientesEstado) => ClienteEstadoDeps(id),
                nameof(ClientesMotivo) => ClienteMotivoDeps(id),
                nameof(ClientesCalificacion) => ClienteCalificacionDeps(id),
                nameof(ClientesProfesion) => ClienteProfesionDeps(id),
                nameof(ClientesActividad) => ClienteActividadDeps(id),
                nameof(ClientesTipoGenerador) => TipoGeneradorDeps(id),
                nameof(TiposContrato) => TipoContratoDeps(id),
                nameof(EntregasEstado) => EntregaEstadoDeps(id),
                nameof(UsuariosEstado) => UsuarioEstadoDeps(id),
                nameof(UsuariosRol) => UsuarioRolDeps(id),
                nameof(Sucursal) => SucursalDeps(id),
                nameof(ListasPrecio) => ListaPrecioDeps(id),
                nameof(TiposPago) => TipoPagoDeps(id),
                nameof(Cuenta) => CuentaDeps(id),
                nameof(Camion) => CamionDeps(id),
                _ => Task.FromResult(InfoVacio())
            };

        public async Task EliminarEnCascadaAsync<T>(int id) where T : class
        {
            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                switch (typeof(T).Name)
                {
                    case nameof(Dia): await DiaCascada(id); break;
                    case nameof(Semana): await SemanaCascada(id); break;
                    case nameof(Banco): await BancoCascada(id); break;
                    case nameof(CondicionesIva): await CondicionIvaCascada(id); break;
                    case nameof(ProductosCategoria): await ProductoCategoriaCascada(id); break;
                    case nameof(UnidadesMedida): await UnidadMedidaCascada(id); break;
                    case nameof(GastosCategoria): await GastoCategoriaCascada(id); break;
                    case nameof(Provincia): await ProvinciaCascada(id); break;
                    case nameof(Partido): await PartidoCascada(id); break;
                    case nameof(Localidad): await LocalidadCascada(id); break;
                    case nameof(ClientesEstado): await ClienteEstadoCascada(id); break;
                    case nameof(ClientesMotivo): await ClienteMotivoCascada(id); break;
                    case nameof(ClientesCalificacion): await ClienteCalificacionCascada(id); break;
                    case nameof(ClientesProfesion): await ClienteProfesionCascada(id); break;
                    case nameof(ClientesActividad): await ClienteActividadCascada(id); break;
                    case nameof(ClientesTipoGenerador): await TipoGeneradorCascada(id); break;
                    case nameof(TiposContrato): await TipoContratoCascada(id); break;
                    case nameof(EntregasEstado): await EntregaEstadoCascada(id); break;
                    case nameof(UsuariosEstado): await UsuarioEstadoCascada(id); break;
                    case nameof(UsuariosRol): await UsuarioRolCascada(id); break;
                    case nameof(Sucursal): await SucursalCascada(id); break;
                    case nameof(ListasPrecio): await ListaPrecioCascada(id); break;
                    case nameof(TiposPago): await TipoPagoCascada(id); break;
                    case nameof(Cuenta): await CuentaCascada(id); break;
                    case nameof(Camion): await CamionCascada(id); break;
                    default:
                        throw new InvalidOperationException("Este catálogo no tiene eliminación en cascada.");
                }

                await trx.CommitAsync();
            }
            catch
            {
                await trx.RollbackAsync();
                throw;
            }
        }

        #region Días / Semanas

        private async Task<DependenciasEliminacionInfo> DiaDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var reasig = await BuscarReasignacionAsync<Dia>(id);
            var permite = true;

            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdDiaRecoleccion == id);
            if (est > 0)
            {
                if (reasig == null)
                {
                    permite = false;
                    items.Add(Item("establecimientos", "Establecimientos (día principal)", est,
                        "Cambiá el día de recolección de cada establecimiento. No hay otro día para reasignar."));
                }
                else
                {
                    items.Add(Item("establecimientos", "Establecimientos (día principal)", est,
                        $"Se reasignará el día de recolección a «{reasig.Value.Nombre}»."));
                }
            }

            var extra = await _db.ClientesEstablecimientosDias.CountAsync(x => x.IdDia == id);
            if (extra > 0)
                items.Add(Item("horarios", "Horarios de recolección adicionales", extra,
                    "Se quitarán esos días extra de cada establecimiento."));

            var mf = await ContarManifiestosDia(id);
            if (mf > 0)
                items.Add(Item("manifiestos", "Manifiestos", mf,
                    "Se desvinculará el día en los manifiestos (no se borran)."));

            var matriz = await _db.RecorridosMatriz.CountAsync(x => x.IdDia == id);
            if (matriz > 0)
                items.Add(Item("matriz", "Filas de hoja de ruta", matriz,
                    "Se eliminarán las filas de ruta de este día."));

            var cont = await _db.RecorridosManifiestosContador.CountAsync(x => x.IdDia == id);
            if (cont > 0)
                items.Add(Item("contador", "Contadores de manifiestos", cont,
                    "Se eliminarán los contadores de este día."));

            var paradas = await _db.ClientesRecorridos.CountAsync(x => x.IdDia == id);
            if (paradas > 0)
                items.Add(Item("paradas", "Paradas de hoja de ruta", paradas,
                    "Se eliminarán las paradas de este día en las hojas de ruta."));

            var libro = await _db.LibroDiarioMovimientos.CountAsync(x => x.IdDia == id);
            if (libro > 0)
                items.Add(Item("libro", "Movimientos de libro diario", libro,
                    "Se desvinculará el día en los movimientos (no se borran)."));

            return Armar("este día", items, permite);
        }

        private async Task DiaCascada(int id)
        {
            var reasig = await BuscarReasignacionAsync<Dia>(id);

            var extra = await _db.ClientesEstablecimientosDias.Where(x => x.IdDia == id).ToListAsync();
            var extraIds = extra.Select(x => x.Id).ToList();
            if (extraIds.Count > 0)
            {
                var horarios = await _db.ClientesEstablecimientosDiasHorarios
                    .Where(x => extraIds.Contains(x.IdEstablecimientoDia))
                    .ToListAsync();
                _db.ClientesEstablecimientosDiasHorarios.RemoveRange(horarios);
                _db.ClientesEstablecimientosDias.RemoveRange(extra);
            }

            var ests = await _db.ClientesEstablecimientos.Where(x => x.IdDiaRecoleccion == id).ToListAsync();
            if (ests.Count > 0)
            {
                if (reasig == null)
                    throw new InvalidOperationException("No hay otro día para reasignar los establecimientos.");
                foreach (var e in ests)
                    e.IdDiaRecoleccion = reasig.Value.Id;
            }

            foreach (var m in await _db.RecorridosManifiestos.Where(x => x.IdDia == id).ToListAsync())
                m.IdDia = null;

            foreach (var mov in await _db.LibroDiarioMovimientos.Where(x => x.IdDia == id).ToListAsync())
                mov.IdDia = null;

            _db.RecorridosMatriz.RemoveRange(await _db.RecorridosMatriz.Where(x => x.IdDia == id).ToListAsync());
            _db.RecorridosManifiestosContador.RemoveRange(
                await _db.RecorridosManifiestosContador.Where(x => x.IdDia == id).ToListAsync());
            _db.ClientesRecorridos.RemoveRange(
                await _db.ClientesRecorridos.Where(x => x.IdDia == id).ToListAsync());

            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.Dias, id, "el día");
        }

        private async Task<DependenciasEliminacionInfo> SemanaDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var reasig = await BuscarReasignacionAsync<Semana>(id);
            var permite = true;

            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdSemanaRecoleccion == id);
            if (est > 0)
            {
                if (reasig == null)
                {
                    permite = false;
                    items.Add(Item("establecimientos", "Establecimientos", est,
                        "Cambiá la semana de recolección. No hay otra semana para reasignar."));
                }
                else
                {
                    items.Add(Item("establecimientos", "Establecimientos", est,
                        $"Se reasignará la semana de recolección a «{reasig.Value.Nombre}»."));
                }
            }

            var mf = await _db.RecorridosManifiestos.CountAsync(x => x.IdSemana == id);
            if (mf > 0)
                items.Add(Item("manifiestos", "Manifiestos", mf, "Se desvinculará la semana en los manifiestos."));

            var matriz = await _db.RecorridosMatriz.CountAsync(x => x.IdSemana == id);
            if (matriz > 0)
                items.Add(Item("matriz", "Filas de hoja de ruta", matriz, "Se eliminarán las filas de ruta de esta semana."));

            var cont = await _db.RecorridosManifiestosContador.CountAsync(x => x.IdSemana == id);
            if (cont > 0)
                items.Add(Item("contador", "Contadores de manifiestos", cont, "Se eliminarán los contadores de esta semana."));

            var paradas = await _db.ClientesRecorridos.CountAsync(x => x.IdSemana == id);
            if (paradas > 0)
                items.Add(Item("paradas", "Paradas de hoja de ruta", paradas,
                    "Se eliminarán las paradas de esta semana en las hojas de ruta."));

            var libro = await _db.LibroDiarioMovimientos.CountAsync(x => x.IdSemana == id);
            if (libro > 0)
                items.Add(Item("libro", "Movimientos de libro diario", libro,
                    "Se desvinculará la semana en los movimientos (no se borran)."));

            return Armar("esta semana", items, permite);
        }

        private async Task SemanaCascada(int id)
        {
            var reasig = await BuscarReasignacionAsync<Semana>(id);
            var ests = await _db.ClientesEstablecimientos.Where(x => x.IdSemanaRecoleccion == id).ToListAsync();
            if (ests.Count > 0)
            {
                if (reasig == null)
                    throw new InvalidOperationException("No hay otra semana para reasignar los establecimientos.");
                foreach (var e in ests)
                    e.IdSemanaRecoleccion = reasig.Value.Id;
            }

            foreach (var m in await _db.RecorridosManifiestos.Where(x => x.IdSemana == id).ToListAsync())
                m.IdSemana = null;

            foreach (var mov in await _db.LibroDiarioMovimientos.Where(x => x.IdSemana == id).ToListAsync())
                mov.IdSemana = null;

            _db.RecorridosMatriz.RemoveRange(await _db.RecorridosMatriz.Where(x => x.IdSemana == id).ToListAsync());
            _db.RecorridosManifiestosContador.RemoveRange(
                await _db.RecorridosManifiestosContador.Where(x => x.IdSemana == id).ToListAsync());
            _db.ClientesRecorridos.RemoveRange(
                await _db.ClientesRecorridos.Where(x => x.IdSemana == id).ToListAsync());

            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.Semanas, id, "la semana");
        }

        #endregion

        #region Lookups simples (SET NULL)

        private async Task<DependenciasEliminacionInfo> BancoDeps(int id)
        {
            var n = await _db.Proveedores.CountAsync(x => x.IdBanco == id);
            return n == 0
                ? InfoVacio()
                : Armar("este banco", new List<DependenciaEliminacionItem>
                {
                    Item("proveedores", "Proveedores", n, "Se quitará el banco de cada proveedor (los proveedores se mantienen).")
                }, true);
        }

        private async Task BancoCascada(int id)
        {
            foreach (var p in await _db.Proveedores.Where(x => x.IdBanco == id).ToListAsync())
                p.IdBanco = null;
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.Bancos, id, "el banco");
        }

        private async Task<DependenciasEliminacionInfo> ClienteEstadoDeps(int id)
            => await DepsSetNull("este estado de cliente",
                await _db.Clientes.CountAsync(x => x.IdEstado == id),
                "Clientes", "Se quitará el estado de cada cliente.");

        private async Task ClienteEstadoCascada(int id)
        {
            foreach (var c in await _db.Clientes.Where(x => x.IdEstado == id).ToListAsync())
                c.IdEstado = null;
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.ClientesEstados, id, "el estado");
        }

        private async Task<DependenciasEliminacionInfo> ClienteMotivoDeps(int id)
            => await DepsSetNull("este motivo",
                await _db.Clientes.CountAsync(x => x.IdMotivo == id),
                "Clientes", "Se quitará el motivo de cada cliente.");

        private async Task ClienteMotivoCascada(int id)
        {
            foreach (var c in await _db.Clientes.Where(x => x.IdMotivo == id).ToListAsync())
                c.IdMotivo = null;
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.ClientesMotivos, id, "el motivo");
        }

        private async Task<DependenciasEliminacionInfo> ClienteCalificacionDeps(int id)
            => await DepsSetNull("esta calificación",
                await _db.Clientes.CountAsync(x => x.IdCalificacion == id),
                "Clientes", "Se quitará la calificación de cada cliente.");

        private async Task ClienteCalificacionCascada(int id)
        {
            foreach (var c in await _db.Clientes.Where(x => x.IdCalificacion == id).ToListAsync())
                c.IdCalificacion = null;
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.ClientesCalificaciones, id, "la calificación");
        }

        private async Task<DependenciasEliminacionInfo> TipoContratoDeps(int id)
            => await DepsSetNull("este tipo de contrato",
                await _db.Contratos.CountAsync(x => x.IdTipoContrato == id),
                "Contratos", "Se quitará el tipo de cada contrato (los contratos se mantienen).");

        private async Task TipoContratoCascada(int id)
        {
            foreach (var c in await _db.Contratos.Where(x => x.IdTipoContrato == id).ToListAsync())
                c.IdTipoContrato = null;
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.TiposContratos, id, "el tipo de contrato");
        }

        private async Task<DependenciasEliminacionInfo> EntregaEstadoDeps(int id)
            => await DepsSetNull("este estado de entrega",
                await _db.ClientesEntregas.CountAsync(x => x.IdEstado == id),
                "Entregas", "Se quitará el estado de cada entrega.");

        private async Task EntregaEstadoCascada(int id)
        {
            foreach (var e in await _db.ClientesEntregas.Where(x => x.IdEstado == id).ToListAsync())
                e.IdEstado = null;
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.EntregasEstados, id, "el estado");
        }

        private async Task<DependenciasEliminacionInfo> TipoPagoDeps(int id)
            => await DepsSetNull("este tipo de pago",
                await _db.ListasPrecios.CountAsync(x => x.IdTipoPago == id),
                "Listas de precio", "Se quitará el tipo de pago de cada lista.");

        private async Task TipoPagoCascada(int id)
        {
            foreach (var l in await _db.ListasPrecios.Where(x => x.IdTipoPago == id).ToListAsync())
                l.IdTipoPago = null;
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.TiposPagos, id, "el tipo de pago");
        }

        private async Task<DependenciasEliminacionInfo> TipoGeneradorDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var cli = await _db.Clientes.CountAsync(x => x.IdTipoGenerador == id);
            if (cli > 0)
                items.Add(Item("clientes", "Clientes", cli, "Se quitará el tipo de generador de cada cliente."));
            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdTipoGenerador == id);
            if (est > 0)
                items.Add(Item("establecimientos", "Establecimientos", est, "Se quitará el tipo de generador de cada establecimiento."));
            return Armar("este tipo de generador", items, true);
        }

        private async Task TipoGeneradorCascada(int id)
        {
            foreach (var c in await _db.Clientes.Where(x => x.IdTipoGenerador == id).ToListAsync())
                c.IdTipoGenerador = null;
            foreach (var e in await _db.ClientesEstablecimientos.Where(x => x.IdTipoGenerador == id).ToListAsync())
                e.IdTipoGenerador = null;
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.ClientesTiposGenerador, id, "el tipo de generador");
        }

        private async Task<DependenciasEliminacionInfo> ClienteProfesionDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var cli = await _db.Clientes.CountAsync(x => x.IdProfesion == id);
            if (cli > 0)
                items.Add(Item("clientes", "Clientes", cli, "Se quitará la profesión de cada cliente."));
            var fer = await _db.FeriadosProfesiones.CountAsync(x => x.IdProfesion == id);
            if (fer > 0)
                items.Add(Item("feriados", "Feriados asociados", fer, "Se quitará esta profesión de los feriados."));
            return Armar("esta profesión", items, true);
        }

        private async Task ClienteProfesionCascada(int id)
        {
            foreach (var c in await _db.Clientes.Where(x => x.IdProfesion == id).ToListAsync())
                c.IdProfesion = null;
            _db.FeriadosProfesiones.RemoveRange(
                await _db.FeriadosProfesiones.Where(x => x.IdProfesion == id).ToListAsync());
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.ClientesProfesiones, id, "la profesión");
        }

        private async Task<DependenciasEliminacionInfo> ClienteActividadDeps(int id)
            => await DepsSetNull("esta actividad",
                await _db.ClientesEstablecimientos.CountAsync(x => x.IdActividad == id),
                "Establecimientos", "Se quitará la actividad de cada establecimiento.");

        private async Task ClienteActividadCascada(int id)
        {
            foreach (var e in await _db.ClientesEstablecimientos.Where(x => x.IdActividad == id).ToListAsync())
                e.IdActividad = null;
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.ClientesActividades, id, "la actividad");
        }

        private async Task<DependenciasEliminacionInfo> LocalidadDeps(int id)
            => await DepsSetNull("esta localidad",
                await _db.ClientesEstablecimientos.CountAsync(x => x.IdLocalidad == id),
                "Establecimientos", "Se quitará la localidad de cada establecimiento.");

        private async Task LocalidadCascada(int id)
        {
            foreach (var e in await _db.ClientesEstablecimientos.Where(x => x.IdLocalidad == id).ToListAsync())
                e.IdLocalidad = null;
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.Localidades, id, "la localidad");
        }

        #endregion

        #region Reasignación (FK obligatoria)

        private async Task<DependenciasEliminacionInfo> ProductoCategoriaDeps(int id)
            => await DepsReasignar<ProductosCategoria>(id, "esta categoría",
                await _db.Productos.CountAsync(x => x.IdCategoria == id),
                "Productos", "categoría");

        private async Task ProductoCategoriaCascada(int id)
        {
            await ReasignarRequerido<ProductosCategoria, Producto>(id,
                x => x.IdCategoria == id, (x, nuevo) => x.IdCategoria = nuevo,
                "categoría", "productos");
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.ProductosCategorias, id, "la categoría");
        }

        private async Task<DependenciasEliminacionInfo> UnidadMedidaDeps(int id)
            => await DepsReasignar<UnidadesMedida>(id, "esta unidad de medida",
                await _db.Productos.CountAsync(x => x.IdMedida == id),
                "Productos", "unidad de medida");

        private async Task UnidadMedidaCascada(int id)
        {
            await ReasignarRequerido<UnidadesMedida, Producto>(id,
                x => x.IdMedida == id, (x, nuevo) => x.IdMedida = nuevo,
                "unidad de medida", "productos");
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.UnidadesMedida, id, "la unidad de medida");
        }

        private async Task<DependenciasEliminacionInfo> GastoCategoriaDeps(int id)
            => await DepsReasignar<GastosCategoria>(id, "esta categoría de gasto",
                await _db.Gastos.CountAsync(x => x.IdCategoria == id),
                "Gastos", "categoría");

        private async Task GastoCategoriaCascada(int id)
        {
            await ReasignarRequerido<GastosCategoria, Gasto>(id,
                x => x.IdCategoria == id, (x, nuevo) => x.IdCategoria = nuevo,
                "categoría", "gastos");
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.GastosCategorias, id, "la categoría");
        }

        private async Task<DependenciasEliminacionInfo> UsuarioEstadoDeps(int id)
            => await DepsReasignar<UsuariosEstado>(id, "este estado de usuario",
                await _db.Usuarios.CountAsync(x => x.IdEstado == id),
                "Usuarios", "estado");

        private async Task UsuarioEstadoCascada(int id)
        {
            await ReasignarRequerido<UsuariosEstado, User>(id,
                x => x.IdEstado == id, (x, nuevo) => x.IdEstado = nuevo,
                "estado", "usuarios");
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.UsuariosEstados, id, "el estado");
        }

        private async Task<DependenciasEliminacionInfo> UsuarioRolDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var reasig = await BuscarReasignacionAsync<UsuariosRol>(id);
            var usuarios = await _db.Usuarios.CountAsync(x => x.IdRol == id);
            var permite = true;

            if (usuarios > 0)
            {
                if (reasig == null)
                {
                    permite = false;
                    items.Add(Item("usuarios", "Usuarios", usuarios,
                        "Cambiá el rol de cada usuario. No hay otro rol para reasignar."));
                }
                else
                {
                    items.Add(Item("usuarios", "Usuarios", usuarios,
                        $"Se reasignará el rol a «{reasig.Value.Nombre}»."));
                }
            }

            var permisos = await _db.UsuariosRolesPermisos.CountAsync(x => x.IdRol == id);
            if (permisos > 0)
                items.Add(Item("permisos", "Permisos del rol", permisos, "Se eliminará la configuración de permisos de este rol."));

            return Armar("este rol", items, permite);
        }

        private async Task UsuarioRolCascada(int id)
        {
            await ReasignarRequerido<UsuariosRol, User>(id,
                x => x.IdRol == id, (x, nuevo) => x.IdRol = nuevo,
                "rol", "usuarios");
            _db.UsuariosRolesPermisos.RemoveRange(
                await _db.UsuariosRolesPermisos.Where(x => x.IdRol == id).ToListAsync());
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.UsuariosRoles, id, "el rol");
        }

        private async Task<DependenciasEliminacionInfo> CondicionIvaDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var reasig = await BuscarReasignacionAsync<CondicionesIva>(id);
            var permite = true;

            var cli = await _db.Clientes.CountAsync(x => x.IdCondicionIva == id);
            if (cli > 0)
                items.Add(Item("clientes", "Clientes", cli, "Se quitará la condición de IVA de cada cliente."));

            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdCondicionIva == id);
            if (est > 0)
                items.Add(Item("establecimientos", "Establecimientos", est, "Se quitará la condición de IVA de cada establecimiento."));

            var prov = await _db.Proveedores.CountAsync(x => x.IdCondicionIva == id);
            if (prov > 0)
            {
                if (reasig == null)
                {
                    permite = false;
                    items.Add(Item("proveedores", "Proveedores", prov,
                        "Cambiá la condición de IVA. No hay otra para reasignar."));
                }
                else
                {
                    items.Add(Item("proveedores", "Proveedores", prov,
                        $"Se reasignará la condición de IVA a «{reasig.Value.Nombre}»."));
                }
            }

            return Armar("esta condición de IVA", items, permite);
        }

        private async Task CondicionIvaCascada(int id)
        {
            foreach (var c in await _db.Clientes.Where(x => x.IdCondicionIva == id).ToListAsync())
                c.IdCondicionIva = null;
            foreach (var e in await _db.ClientesEstablecimientos.Where(x => x.IdCondicionIva == id).ToListAsync())
                e.IdCondicionIva = null;
            await ReasignarRequerido<CondicionesIva, Proveedore>(id,
                x => x.IdCondicionIva == id, (x, nuevo) => x.IdCondicionIva = nuevo,
                "condición de IVA", "proveedores");
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.CondicionesIvas, id, "la condición de IVA");
        }

        #endregion

        #region Geo / sucursal / cuenta / lista / camión

        private async Task<DependenciasEliminacionInfo> ProvinciaDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var cli = await _db.Clientes.CountAsync(x => x.IdProvincia == id);
            if (cli > 0)
                items.Add(Item("clientes", "Clientes", cli, "Se quitará la provincia de cada cliente."));
            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdProvincia == id);
            if (est > 0)
                items.Add(Item("establecimientos", "Establecimientos", est, "Se quitará la provincia de cada establecimiento."));
            var partidos = await _db.Partidos.CountAsync(x => x.IdProvincia == id);
            if (partidos > 0)
                items.Add(Item("partidos", "Partidos", partidos, "Se eliminarán los partidos de esta provincia."));
            var loc = await _db.Localidades.CountAsync(x => x.IdProvincia == id);
            if (loc > 0)
                items.Add(Item("localidades", "Localidades", loc, "Se eliminarán las localidades de esta provincia."));
            return Armar("esta provincia", items, true);
        }

        private async Task ProvinciaCascada(int id)
        {
            var partidoIds = await _db.Partidos.Where(x => x.IdProvincia == id).Select(x => x.Id).ToListAsync();
            var locIds = await _db.Localidades
                .Where(x => x.IdProvincia == id || (x.IdPartido != null && partidoIds.Contains(x.IdPartido.Value)))
                .Select(x => x.Id)
                .ToListAsync();

            foreach (var c in await _db.Clientes.Where(x => x.IdProvincia == id).ToListAsync())
                c.IdProvincia = null;
            foreach (var e in await _db.ClientesEstablecimientos.Where(x => x.IdProvincia == id).ToListAsync())
                e.IdProvincia = null;
            foreach (var e in await _db.ClientesEstablecimientos
                .Where(x => x.IdPartido != null && partidoIds.Contains(x.IdPartido.Value)).ToListAsync())
                e.IdPartido = null;
            foreach (var e in await _db.ClientesEstablecimientos
                .Where(x => x.IdLocalidad != null && locIds.Contains(x.IdLocalidad.Value)).ToListAsync())
                e.IdLocalidad = null;

            _db.Localidades.RemoveRange(await _db.Localidades.Where(x => locIds.Contains(x.Id)).ToListAsync());
            _db.Partidos.RemoveRange(await _db.Partidos.Where(x => partidoIds.Contains(x.Id)).ToListAsync());
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.Provincias, id, "la provincia");
        }

        private async Task<DependenciasEliminacionInfo> PartidoDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdPartido == id);
            if (est > 0)
                items.Add(Item("establecimientos", "Establecimientos", est, "Se quitará el partido de cada establecimiento."));
            var loc = await _db.Localidades.CountAsync(x => x.IdPartido == id);
            if (loc > 0)
                items.Add(Item("localidades", "Localidades", loc, "Se eliminarán las localidades de este partido."));
            return Armar("este partido", items, true);
        }

        private async Task PartidoCascada(int id)
        {
            var locIds = await _db.Localidades.Where(x => x.IdPartido == id).Select(x => x.Id).ToListAsync();
            foreach (var e in await _db.ClientesEstablecimientos.Where(x => x.IdPartido == id).ToListAsync())
                e.IdPartido = null;
            foreach (var e in await _db.ClientesEstablecimientos
                .Where(x => x.IdLocalidad != null && locIds.Contains(x.IdLocalidad.Value)).ToListAsync())
                e.IdLocalidad = null;
            _db.Localidades.RemoveRange(await _db.Localidades.Where(x => locIds.Contains(x.Id)).ToListAsync());
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.Partidos, id, "el partido");
        }

        private async Task<DependenciasEliminacionInfo> SucursalDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var reasig = await BuscarReasignacionAsync<Sucursal>(id);
            var permite = true;

            var clientes = await _db.Clientes.CountAsync(x => x.IdSucursal == id);
            if (clientes > 0)
            {
                if (reasig == null)
                {
                    permite = false;
                    items.Add(Item("clientes", "Clientes", clientes,
                        "Cambiá la sucursal de cada cliente. No hay otra sucursal para reasignar."));
                }
                else
                {
                    items.Add(Item("clientes", "Clientes", clientes,
                        $"Se reasignará la sucursal a «{reasig.Value.Nombre}»."));
                }
            }

            var inv = await _db.Inventarios.CountAsync(x => x.IdSucursal == id);
            if (inv > 0)
            {
                if (reasig == null) permite = false;
                items.Add(Item("inventario", "Inventario", inv,
                    reasig == null
                        ? "No hay otra sucursal a la que mover el inventario."
                        : $"Se reasignará el inventario a «{reasig.Value.Nombre}»."));
            }

            var cuentas = await _db.Cuentas.CountAsync(x => x.IdSucursal == id);
            if (cuentas > 0)
            {
                if (reasig == null) permite = false;
                items.Add(Item("cuentas", "Cuentas", cuentas,
                    reasig == null
                        ? "No hay otra sucursal a la que mover las cuentas."
                        : $"Se reasignarán las cuentas a «{reasig.Value.Nombre}»."));
            }

            var us = await _db.UsuariosSucursales.CountAsync(x => x.IdSucursal == id);
            if (us > 0)
                items.Add(Item("usuarios", "Asignaciones de usuarios", us, "Se quitará esta sucursal de los usuarios."));

            return Armar("esta sucursal", items, permite);
        }

        private async Task SucursalCascada(int id)
        {
            await ReasignarRequerido<Sucursal, Cliente>(id,
                x => x.IdSucursal == id, (x, nuevo) => x.IdSucursal = nuevo, "sucursal", "clientes");
            await ReasignarRequerido<Sucursal, Inventario>(id,
                x => x.IdSucursal == id, (x, nuevo) => x.IdSucursal = nuevo, "sucursal", "inventario");
            await ReasignarRequerido<Sucursal, Cuenta>(id,
                x => x.IdSucursal == id, (x, nuevo) => x.IdSucursal = nuevo, "sucursal", "cuentas");
            _db.UsuariosSucursales.RemoveRange(
                await _db.UsuariosSucursales.Where(x => x.IdSucursal == id).ToListAsync());
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.Sucursales, id, "la sucursal");
        }

        private async Task<DependenciasEliminacionInfo> ListaPrecioDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdListaPrecio == id);
            if (est > 0)
                items.Add(Item("establecimientos", "Establecimientos", est, "Se quitará la lista de cada establecimiento."));
            var precios = await _db.ProductosPrecios.CountAsync(x => x.IdListaPrecio == id);
            if (precios > 0)
                items.Add(Item("precios", "Precios de productos", precios, "Se eliminarán los precios de esta lista."));
            var cep = await _db.ClientesEstablecimientosProductos.CountAsync(x => x.IdListaPrecio == id);
            if (cep > 0)
                items.Add(Item("cep", "Productos de establecimiento", cep, "Se quitará la lista de esos productos."));
            var ent = await _db.ClientesEntregasProductos.CountAsync(x => x.IdListaPrecio == id);
            if (ent > 0)
                items.Add(Item("entregas", "Líneas de entrega", ent, "Se desvinculará la lista (las entregas se mantienen)."));
            var rec = await _db.ClientesEntregasProductosRecuperados.CountAsync(x => x.IdListaPrecio == id);
            if (rec > 0)
                items.Add(Item("recuperados", "Líneas de recuperados", rec, "Se desvinculará la lista."));
            return Armar("esta lista de precios", items, true);
        }

        private async Task ListaPrecioCascada(int id)
        {
            foreach (var e in await _db.ClientesEstablecimientos.Where(x => x.IdListaPrecio == id).ToListAsync())
                e.IdListaPrecio = null;
            foreach (var p in await _db.ClientesEstablecimientosProductos.Where(x => x.IdListaPrecio == id).ToListAsync())
                p.IdListaPrecio = null;
            foreach (var p in await _db.ClientesEntregasProductos.Where(x => x.IdListaPrecio == id).ToListAsync())
                p.IdListaPrecio = null;
            foreach (var p in await _db.ClientesEntregasProductosRecuperados.Where(x => x.IdListaPrecio == id).ToListAsync())
                p.IdListaPrecio = null;
            _db.ProductosPrecios.RemoveRange(await _db.ProductosPrecios.Where(x => x.IdListaPrecio == id).ToListAsync());
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.ListasPrecios, id, "la lista de precios");
        }

        private async Task<DependenciasEliminacionInfo> CuentaDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var reasig = await BuscarReasignacionAsync<Cuenta>(id);
            var permite = true;

            void AddReq(string clave, string etiqueta, int n, string entidad)
            {
                if (n <= 0) return;
                if (reasig == null)
                {
                    permite = false;
                    items.Add(Item(clave, etiqueta, n, $"Cambiá {entidad}. No hay otra cuenta para reasignar."));
                }
                else
                {
                    items.Add(Item(clave, etiqueta, n, $"Se reasignará a «{reasig.Value.Nombre}»."));
                }
            }

            AddReq("gastos", "Gastos", await _db.Gastos.CountAsync(x => x.IdCuenta == id), "los gastos");
            AddReq("cajas", "Cajas", await _db.CajasSaldos.CountAsync(x => x.IdCuenta == id), "las cajas");
            AddReq("cobros", "Cobros de clientes", await _db.ClientesCobros.CountAsync(x => x.IdCuenta == id), "los cobros");
            AddReq("pagos", "Pagos a proveedores", await _db.ProveedoresPagos.CountAsync(x => x.IdCuenta == id), "los pagos");
            return Armar("esta cuenta", items, permite);
        }

        private async Task CuentaCascada(int id)
        {
            await ReasignarRequerido<Cuenta, Gasto>(id, x => x.IdCuenta == id, (x, n) => x.IdCuenta = n, "cuenta", "gastos");
            await ReasignarRequerido<Cuenta, CajasSaldo>(id, x => x.IdCuenta == id, (x, n) => x.IdCuenta = n, "cuenta", "cajas");
            await ReasignarRequerido<Cuenta, ClientesCobro>(id, x => x.IdCuenta == id, (x, n) => x.IdCuenta = n, "cuenta", "cobros");
            await ReasignarRequerido<Cuenta, ProveedoresPago>(id, x => x.IdCuenta == id, (x, n) => x.IdCuenta = n, "cuenta", "pagos");
            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.Cuentas, id, "la cuenta");
        }

        private async Task<DependenciasEliminacionInfo> CamionDeps(int id)
        {
            var items = new List<DependenciaEliminacionItem>();
            var est = await _db.ClientesEstablecimientos.CountAsync(x => x.IdCamion == id);
            if (est > 0)
                items.Add(Item("establecimientos", "Establecimientos", est, "Se quitará el camión de cada establecimiento."));
            var extra = await _db.ClientesEstablecimientosDias.CountAsync(x => x.IdCamion == id);
            if (extra > 0)
                items.Add(Item("dias", "Días de recolección", extra, "Se quitará el camión de esos días extra."));
            var ent = await _db.ClientesEntregas.CountAsync(x => x.IdCamion == id);
            if (ent > 0)
                items.Add(Item("entregas", "Entregas", ent, "Se desvinculará el camión de las entregas (se mantienen)."));

            var mf = 0;
            var cont = 0;
            var matriz = 0;
            try
            {
                mf = await _db.RecorridosManifiestos.CountAsync(x => x.IdCamion == id);
                cont = await _db.RecorridosManifiestosContador.CountAsync(x => x.IdCamion == id);
                matriz = await _db.RecorridosMatriz.CountAsync(x => x.IdCamion == id);
            }
            catch
            {
            }

            if (mf > 0)
                items.Add(Item("manifiestos", "Manifiestos", mf, "Se eliminarán los manifiestos de este camión."));
            if (cont > 0)
                items.Add(Item("contador", "Contadores de manifiestos", cont, "Se eliminarán los contadores."));
            if (matriz > 0)
                items.Add(Item("matriz", "Filas de hoja de ruta", matriz, "Se eliminarán las filas de ruta de este camión."));

            var paradas = await _db.ClientesRecorridos.CountAsync(x => x.IdCamion == id);
            if (paradas > 0)
                items.Add(Item("paradas", "Paradas de hoja de ruta", paradas,
                    "Se eliminarán las paradas de este camión en las hojas de ruta."));

            var libro = await _db.LibroDiarioMovimientos.CountAsync(x => x.IdCamion == id);
            if (libro > 0)
                items.Add(Item("libro", "Movimientos de libro diario", libro,
                    "Se desvinculará el camión en los movimientos (no se borran)."));

            return Armar("este camión", items, true);
        }

        private async Task CamionCascada(int id)
        {
            foreach (var e in await _db.ClientesEstablecimientos.Where(x => x.IdCamion == id).ToListAsync())
                e.IdCamion = null;
            foreach (var d in await _db.ClientesEstablecimientosDias.Where(x => x.IdCamion == id).ToListAsync())
                d.IdCamion = null;
            foreach (var e in await _db.ClientesEntregas.Where(x => x.IdCamion == id).ToListAsync())
                e.IdCamion = null;
            foreach (var mov in await _db.LibroDiarioMovimientos.Where(x => x.IdCamion == id).ToListAsync())
                mov.IdCamion = null;

            _db.RecorridosManifiestos.RemoveRange(
                await _db.RecorridosManifiestos.Where(x => x.IdCamion == id).ToListAsync());
            _db.RecorridosManifiestosContador.RemoveRange(
                await _db.RecorridosManifiestosContador.Where(x => x.IdCamion == id).ToListAsync());
            _db.RecorridosMatriz.RemoveRange(
                await _db.RecorridosMatriz.Where(x => x.IdCamion == id).ToListAsync());
            _db.ClientesRecorridos.RemoveRange(
                await _db.ClientesRecorridos.Where(x => x.IdCamion == id).ToListAsync());

            await _db.SaveChangesAsync();
            await BorrarCatalogo(_db.Camiones, id, "el camión");
        }

        #endregion

        #region Helpers

        private async Task<int> ContarManifiestosDia(int id)
        {
            try
            {
                return await _db.RecorridosManifiestos.CountAsync(x => x.IdDia == id);
            }
            catch
            {
                return 0;
            }
        }

        private async Task<(int Id, string Nombre)?> BuscarReasignacionAsync<T>(int idActual) where T : class
        {
            var actual = await _db.Set<T>().FindAsync(idActual);
            if (actual == null) return null;

            var nombre = actual.GetType().GetProperty("Nombre")?.GetValue(actual)?.ToString() ?? "";

            var candidatos = await _db.Set<T>().AsNoTracking()
                .Where(x => EF.Property<int>(x, "Id") != idActual)
                .Select(x => new
                {
                    Id = EF.Property<int>(x, "Id"),
                    Nombre = EF.Property<string>(x, "Nombre")
                })
                .ToListAsync();

            if (candidatos.Count == 0)
                return null;

            var mismo = candidatos.FirstOrDefault(x =>
                string.Equals(x.Nombre, nombre, StringComparison.OrdinalIgnoreCase));
            var elegido = mismo ?? candidatos.OrderBy(x => x.Id).First();
            return (elegido.Id, elegido.Nombre ?? "");
        }

        private async Task ReasignarRequerido<TCat, TEnt>(
            int idActual,
            System.Linq.Expressions.Expression<Func<TEnt, bool>> pred,
            Action<TEnt, int> setId,
            string nombreCatalogo,
            string nombreEntidades)
            where TCat : class
            where TEnt : class
        {
            var entidades = await _db.Set<TEnt>().Where(pred).ToListAsync();
            if (entidades.Count == 0)
                return;

            var reasig = await BuscarReasignacionAsync<TCat>(idActual);
            if (reasig == null)
            {
                throw new InvalidOperationException(
                    $"No hay otro valor de {nombreCatalogo} para reasignar {nombreEntidades}.");
            }

            foreach (var e in entidades)
                setId(e, reasig.Value.Id);
        }

        private async Task BorrarCatalogo<T>(DbSet<T> set, int id, string etiqueta) where T : class
        {
            var entity = await set.FindAsync(id);
            if (entity == null)
                throw new InvalidOperationException($"No se encontró {etiqueta}.");
            set.Remove(entity);
            await _db.SaveChangesAsync();
        }

        private static Task<DependenciasEliminacionInfo> DepsSetNull(string entidad, int n, string etiqueta, string accion)
        {
            if (n <= 0)
                return Task.FromResult(InfoVacio());

            return Task.FromResult(Armar(entidad, new List<DependenciaEliminacionItem>
            {
                Item(etiqueta.ToLowerInvariant(), etiqueta, n, accion)
            }, true));
        }

        private async Task<DependenciasEliminacionInfo> DepsReasignar<TCat>(
            int id, string entidad, int n, string etiqueta, string catalogo)
            where TCat : class
        {
            if (n <= 0)
                return InfoVacio();

            var reasig = await BuscarReasignacionAsync<TCat>(id);
            if (reasig == null)
            {
                return Armar(entidad, new List<DependenciaEliminacionItem>
                {
                    Item(etiqueta.ToLowerInvariant(), etiqueta, n,
                        $"Cambiá el/la {catalogo} de cada registro. No hay otro valor para reasignar.")
                }, false);
            }

            return Armar(entidad, new List<DependenciaEliminacionItem>
            {
                Item(etiqueta.ToLowerInvariant(), etiqueta, n,
                    $"Se reasignará a «{reasig.Value.Nombre}».")
            }, true);
        }

        private static DependenciaEliminacionItem Item(string clave, string etiqueta, int cantidad, string accion)
            => new()
            {
                Clave = clave,
                Etiqueta = etiqueta,
                Cantidad = cantidad,
                AccionManual = accion
            };

        private static DependenciasEliminacionInfo InfoVacio()
            => new() { TipoCascada = "desvincular", PermiteCascada = true };

        private static DependenciasEliminacionInfo Armar(
            string entidad,
            List<DependenciaEliminacionItem> items,
            bool permiteCascada)
        {
            if (items.Count == 0)
                return InfoVacio();

            var partes = items.Select(i => $"{i.Cantidad} {i.Etiqueta.ToLower()}");
            var pasos = string.Join("\n", items.Select((i, n) => $"{n + 1}. {i.AccionManual}"));

            var resumen = permiteCascada
                ? $"Tenés asociados: {string.Join(", ", partes)}. ¿Querés desvincularlos o reasignarlos y eliminar {entidad}?"
                : $"No se puede eliminar {entidad} en cascada porque tiene: {string.Join(", ", partes)}. Reasigná esos registros a otro valor del catálogo.";

            return new DependenciasEliminacionInfo
            {
                Items = items,
                MensajeResumen = resumen,
                InstruccionesPasoAPaso = "Podés hacerlo manualmente:\n" + pasos,
                TipoCascada = "desvincular",
                PermiteCascada = permiteCascada
            };
        }

        #endregion
    }
}
