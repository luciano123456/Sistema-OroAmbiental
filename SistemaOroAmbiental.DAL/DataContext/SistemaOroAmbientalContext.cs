using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.DataContext;

public partial class SistemaOroAmbientalContext : DbContext
{
    public SistemaOroAmbientalContext()
    {
    }

    private readonly IConfiguration _configuration;

    public SistemaOroAmbientalContext(DbContextOptions<SistemaOroAmbientalContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Banco> Bancos { get; set; }

    public virtual DbSet<CajasMovimiento> CajasMovimientos { get; set; }

    public virtual DbSet<CajasSaldo> CajasSaldos { get; set; }

    public virtual DbSet<Camion> Camiones { get; set; }

    public virtual DbSet<RecorridosMatriz> RecorridosMatriz { get; set; }

    public virtual DbSet<ClientesRecorrido> ClientesRecorridos { get; set; }

    public virtual DbSet<ClientesControlMensual> ClientesControlMensuales { get; set; }

    public virtual DbSet<ProveedoresControlMensual> ProveedoresControlMensuales { get; set; }

    public virtual DbSet<LibroDiarioConcepto> LibroDiarioConceptos { get; set; }

    public virtual DbSet<LibroDiarioMovimiento> LibroDiarioMovimientos { get; set; }

    public virtual DbSet<Cliente> Clientes { get; set; }

    public virtual DbSet<ClientesCobro> ClientesCobros { get; set; }

    public virtual DbSet<ClientesContacto> ClientesContactos { get; set; }

    public virtual DbSet<ClientesCuentaCorriente> ClientesCuentaCorrientes { get; set; }

    public virtual DbSet<ClientesCuentaCorrienteMovimiento> ClientesCuentaCorrienteMovimientos { get; set; }

    public virtual DbSet<ClientesEntrega> ClientesEntregas { get; set; }

    public virtual DbSet<ClientesEntregasProducto> ClientesEntregasProductos { get; set; }

    public virtual DbSet<ClientesEntregasProductosRecuperado> ClientesEntregasProductosRecuperados { get; set; }

    public virtual DbSet<ClientesEstablecimiento> ClientesEstablecimientos { get; set; }

    public virtual DbSet<ClientesEstablecimientosContacto> ClientesEstablecimientosContactos { get; set; }

    public virtual DbSet<ClientesEstablecimientosDia> ClientesEstablecimientosDias { get; set; }

    public virtual DbSet<ClientesEstablecimientosDiasHorario> ClientesEstablecimientosDiasHorarios { get; set; }

    public virtual DbSet<ClientesEstablecimientosExcepcione> ClientesEstablecimientosExcepciones { get; set; }

    public virtual DbSet<ClientesEstablecimientosProducto> ClientesEstablecimientosProductos { get; set; }

    public virtual DbSet<ClientesCalificacion> ClientesCalificaciones { get; set; }

    public virtual DbSet<ClientesEstado> ClientesEstados { get; set; }

    public virtual DbSet<ClientesMotivo> ClientesMotivos { get; set; }

    public virtual DbSet<ClientesProfesion> ClientesProfesiones { get; set; }

    public virtual DbSet<ClientesTipoGenerador> ClientesTiposGenerador { get; set; }

    public virtual DbSet<Compra> Compras { get; set; }

    public virtual DbSet<ComprasProducto> ComprasProductos { get; set; }

    public virtual DbSet<CondicionesIva> CondicionesIvas { get; set; }

    public virtual DbSet<Contrato> Contratos { get; set; }

    public virtual DbSet<ContratosDocumento> ContratosDocumentos { get; set; }

    public virtual DbSet<ContratosRenovacion> ContratosRenovaciones { get; set; }

    public virtual DbSet<TiposContrato> TiposContratos { get; set; }

    public virtual DbSet<Cuenta> Cuentas { get; set; }

    public virtual DbSet<Dia> Dias { get; set; }

    public virtual DbSet<EntregasEstado> EntregasEstados { get; set; }

    public virtual DbSet<Localidad> Localidades { get; set; }


    public virtual DbSet<Feriado> Feriados { get; set; }

    public virtual DbSet<FeriadosProfesion> FeriadosProfesiones { get; set; }

    public virtual DbSet<Gasto> Gastos { get; set; }

    public virtual DbSet<GastosCategoria> GastosCategorias { get; set; }

    public virtual DbSet<Inventario> Inventarios { get; set; }

    public virtual DbSet<InventarioMovimiento> InventarioMovimientos { get; set; }

    public virtual DbSet<InventarioRecuperado> InventarioRecuperados { get; set; }

    public virtual DbSet<InventarioRecuperadoMovimiento> InventarioRecuperadoMovimientos { get; set; }

    public virtual DbSet<ListasPrecio> ListasPrecios { get; set; }

    public virtual DbSet<Producto> Productos { get; set; }

    public virtual DbSet<ProductosCategoria> ProductosCategorias { get; set; }

    public virtual DbSet<ProductosPrecio> ProductosPrecios { get; set; }

    public virtual DbSet<ProductosCostoHistorial> ProductosCostoHistorials { get; set; }

    public virtual DbSet<Proveedore> Proveedores { get; set; }

    public virtual DbSet<ProveedoresContacto> ProveedoresContactos { get; set; }

    public virtual DbSet<ProveedoresCuentaCorriente> ProveedoresCuentaCorrientes { get; set; }

    public virtual DbSet<ProveedoresCuentaCorrienteMovimiento> ProveedoresCuentaCorrienteMovimientos { get; set; }

    public virtual DbSet<ProveedoresPago> ProveedoresPagos { get; set; }

    public virtual DbSet<Provincia> Provincias { get; set; }

    public virtual DbSet<Partido> Partidos { get; set; }


    public virtual DbSet<Semana> Semanas { get; set; }

    public virtual DbSet<Sucursal> Sucursales { get; set; }

    public virtual DbSet<UnidadesMedida> UnidadesMedida { get; set; }

    public virtual DbSet<User> Usuarios { get; set; }

    public virtual DbSet<UsuariosEstado> UsuariosEstados { get; set; }

    public virtual DbSet<UsuariosModulo> UsuariosModulos { get; set; }

    public virtual DbSet<UsuariosPermiso> UsuariosPermisos { get; set; }

    public virtual DbSet<UsuariosPermisosUsuario> UsuariosPermisosUsuarios { get; set; }

    public virtual DbSet<UsuariosRol> UsuariosRoles { get; set; }

    public virtual DbSet<UsuariosRolesPermiso> UsuariosRolesPermisos { get; set; }

    public virtual DbSet<UsuariosSucursal> UsuariosSucursales { get; set; }


    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            var connectionString = _configuration.GetConnectionString("SistemaDB");
            optionsBuilder.UseSqlServer(connectionString);
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Banco>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<CajasMovimiento>(entity =>
        {
            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Egreso).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Ingreso).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TipoMovimiento)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCajaNavigation).WithMany(p => p.CajasMovimientos)
                .HasForeignKey(d => d.IdCaja)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CajasMovimientos_CajasSaldos");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.CajasMovimientoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_CajasMovimientosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.CajasMovimientoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CajasMovimientosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<CajasSaldo>(entity =>
        {
            entity.Property(e => e.Saldo).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdCuentaNavigation).WithMany(p => p.CajasSaldos)
                .HasForeignKey(d => d.IdCuenta)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CajasSaldos_Cuentas");
        });

        modelBuilder.Entity<Cliente>(entity =>
        {
            entity.Property(e => e.Activo)
                .IsRequired()
                .HasDefaultValueSql("((1))");
            entity.Property(e => e.CodPostal)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.Cuit)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Domicilio)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Calle)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Numero)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.PisoDepartamento)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Localidad)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.TelefonoAlt)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.MotivoDetalle)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.FechaInicio).HasColumnType("date");
            entity.Property(e => e.FechaLicenciaDesde).HasColumnType("date");
            entity.Property(e => e.FechaLicenciaHasta).HasColumnType("date");

            entity.HasOne(d => d.IdCondicionIvaNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdCondicionIva)
                .HasConstraintName("FK_Clientes_CondicionesIVA");

            entity.HasOne(d => d.IdProfesionNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdProfesion)
                .HasConstraintName("FK_Clientes_ClientesProfesiones");

            entity.HasOne(d => d.IdProvinciaNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdProvincia)
                .HasConstraintName("FK_Clientes_Provincias");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdEstado)
                .HasConstraintName("FK_Clientes_ClientesEstados");

            entity.HasOne(d => d.IdMotivoNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdMotivo)
                .HasConstraintName("FK_Clientes_ClientesMotivos");

            entity.HasOne(d => d.IdCalificacionNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdCalificacion)
                .HasConstraintName("FK_Clientes_ClientesCalificaciones");

            entity.HasOne(d => d.IdTipoGeneradorNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdTipoGenerador)
                .HasConstraintName("FK_Clientes_ClientesTiposGenerador");

            entity.HasOne(d => d.IdLocalidadNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdLocalidad)
                .HasConstraintName("FK_Clientes_Localidades");

            entity.HasOne(d => d.IdPartidoNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdPartido)
                .HasConstraintName("FK_Clientes_Partidos");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Clientes_Sucursales");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClienteIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClienteIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ClientesCobro>(entity =>
        {
            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Importe).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ClientesCobros)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesCobros_Clientes");

            entity.HasOne(d => d.IdCuentaNavigation).WithMany(p => p.ClientesCobros)
                .HasForeignKey(d => d.IdCuenta)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesCobros_Cuentas");

            entity.HasOne(d => d.IdEntregaNavigation).WithMany(p => p.ClientesCobros)
                .HasForeignKey(d => d.IdEntrega)
                .HasConstraintName("FK_ClientesCobros_ClientesEntregas");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClientesCobroIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesCobros_Usuarios1");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClientesCobroIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesCobros_Usuarios");
        });

        modelBuilder.Entity<ClientesContacto>(entity =>
        {
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Puesto)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.TelefonoAlt)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ClientesContactos)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesContactos_Clientes");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClientesContactoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesContactosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClientesContactoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesContactosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ClientesCuentaCorriente>(entity =>
        {
            entity.ToTable("ClientesCuentaCorriente");

            entity.Property(e => e.Saldo).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ClientesCuentaCorrientes)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesCuentaCorriente_Clientes");
        });

        modelBuilder.Entity<ClientesCuentaCorrienteMovimiento>(entity =>
        {
            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Debe).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Haber).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TipoMovimiento)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCuentaCorrienteNavigation).WithMany(p => p.ClientesCuentaCorrienteMovimientos)
                .HasForeignKey(d => d.IdCuentaCorriente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesCuentaCorrienteMovimientos_ClientesCuentaCorriente");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClientesCuentaCorrienteMovimientoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesCuentaCorrienteMovimientosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClientesCuentaCorrienteMovimientoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesCuentaCorrienteMovimientosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ClientesEntrega>(entity =>
        {
            entity.Property(e => e.Descuentos).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.ImporteAbonado).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ImporteTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NotaCliente).HasColumnType("text");
            entity.Property(e => e.NotaInterna).HasColumnType("text");
            entity.Property(e => e.Saldo).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Subtotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TotalIva)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("TotalIVA");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ClientesEntregas)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEntregas_Clientes");

            entity.HasOne(d => d.IdContratoNavigation).WithMany(p => p.ClientesEntregas)
                .HasForeignKey(d => d.IdContrato)
                .HasConstraintName("FK_ClientesEntregas_Contratos");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.ClientesEntregas)
                .HasForeignKey(d => d.IdEstado)
                .HasConstraintName("FK_ClientesEntregas_EntregasEstados");

            entity.HasOne(d => d.IdCamionNavigation).WithMany(p => p.ClientesEntregas)
                .HasForeignKey(d => d.IdCamion)
                .HasConstraintName("FK_ClientesEntregas_Camiones");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClientesEntregaIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesEntregasUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClientesEntregaIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEntregasUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ClientesEntregasProducto>(entity =>
        {
            entity.Property(e => e.TipoMovimiento).HasDefaultValue(1);
            entity.Property(e => e.Cantidad).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CostoUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DescTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DescUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Ganancia).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Ivaunitario)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("IVAUnitario");
            entity.Property(e => e.PorcDescuento).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PorcIva)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("PorcIVA");
            entity.Property(e => e.PrecioVenta).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PrecioVentaFinal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PrecioVentacDesc).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SubtotalCosto).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SubtotalFinal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SubtotalcDesc).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TotalIva)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("TotalIVA");

            entity.HasOne(d => d.IdEntregaNavigation).WithMany(p => p.ClientesEntregasProductos)
                .HasForeignKey(d => d.IdEntrega)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEntregasProductos_ClientesEntregas");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ClientesEntregasProductos)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEntregasProductos_Productos");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClientesEntregasProductoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesEntregasProductosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClientesEntregasProductoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEntregasProductosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ClientesEntregasProductosRecuperado>(entity =>
        {
            entity.ToTable("ClientesEntregasProductosRecuperados");

            entity.HasIndex(e => new { e.IdEntrega, e.IdProducto }, "UQ_CEPR_Entrega_Producto")
                .IsUnique();

            entity.Property(e => e.Cantidad).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CostoUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DescTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DescUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Ganancia).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Ivaunitario)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("IVAUnitario");
            entity.Property(e => e.PorcDescuento).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PorcIva)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("PorcIVA");
            entity.Property(e => e.PrecioVenta).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PrecioVentaFinal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PrecioVentacDesc).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SubtotalCosto).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SubtotalFinal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SubtotalcDesc).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TotalIva)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("TotalIVA");

            entity.HasOne(d => d.IdEntregaNavigation).WithMany(p => p.ClientesEntregasProductosRecuperados)
                .HasForeignKey(d => d.IdEntrega)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CEPR_ClientesEntregas");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ClientesEntregasProductosRecuperados)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CEPR_Productos");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_CEPR_Usuarios_Modifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CEPR_Usuarios_Registra");
        });

        modelBuilder.Entity<ClientesEstablecimiento>(entity =>
        {
            entity.Property(e => e.CodPostal)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.Cuit)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Domicilio)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Calle)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Numero)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.PisoDepartamento)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.HorarioRecoleccionDesde).HasPrecision(0);
            entity.Property(e => e.HorarioRecoleccionHasta).HasPrecision(0);
            entity.Property(e => e.DiasHorarios)
                .HasMaxLength(1000)
                .IsUnicode(false);
            entity.Property(e => e.IdCondicionIva).HasColumnName("IdCondicionIVA");
            entity.Property(e => e.ImpuestoIva).HasColumnName("ImpuestoIVA");
            entity.Property(e => e.Localidad)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.IdEstablecimientoCliente)
                .HasMaxLength(8)
                .IsUnicode(false);

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ClientesEstablecimientos)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientos_Clientes");

            entity.HasOne(d => d.IdCondicionIvaNavigation).WithMany(p => p.ClientesEstablecimientos)
                .HasForeignKey(d => d.IdCondicionIva)
                .HasConstraintName("FK_ClientesEstablecimientos_CondicionesIVA");

            entity.HasOne(d => d.IdTipoGeneradorNavigation).WithMany(p => p.ClientesEstablecimientos)
                .HasForeignKey(d => d.IdTipoGenerador)
                .HasConstraintName("FK_ClientesEstablecimientos_ClientesTiposGenerador");

            entity.HasOne(d => d.IdDiaRecoleccionNavigation).WithMany(p => p.ClientesEstablecimientos)
                .HasForeignKey(d => d.IdDiaRecoleccion)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientos_Dias");

            entity.HasOne(d => d.IdListaPrecioNavigation).WithMany(p => p.ClientesEstablecimientos)
                .HasForeignKey(d => d.IdListaPrecio)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientos_ListasPrecios");

            entity.HasOne(d => d.IdProvinciaNavigation).WithMany(p => p.ClientesEstablecimientos)
                .HasForeignKey(d => d.IdProvincia)
                .HasConstraintName("FK_ClientesEstablecimientos_Provincias");

            entity.HasOne(d => d.IdCamionNavigation).WithMany(p => p.ClientesEstablecimientos)
                .HasForeignKey(d => d.IdCamion)
                .HasConstraintName("FK_ClientesEstablecimientos_Camiones");

            entity.HasOne(d => d.IdLocalidadNavigation).WithMany(p => p.ClientesEstablecimientos)
                .HasForeignKey(d => d.IdLocalidad)
                .HasConstraintName("FK_ClientesEstablecimientos_Localidades");

            entity.HasOne(d => d.IdPartidoNavigation).WithMany(p => p.ClientesEstablecimientos)
                .HasForeignKey(d => d.IdPartido)
                .HasConstraintName("FK_ClientesEstablecimientos_Partidos");

            entity.HasOne(d => d.IdSemanaRecoleccionNavigation).WithMany(p => p.ClientesEstablecimientos)
                .HasForeignKey(d => d.IdSemanaRecoleccion)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientos_Semanas");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClientesEstablecimientoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesEstablecimientosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClientesEstablecimientoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ClientesEstablecimientosContacto>(entity =>
        {
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Puesto)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.TelefonoAlt)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdEstablecimientoNavigation).WithMany(p => p.ClientesEstablecimientosContactos)
                .HasForeignKey(d => d.IdEstablecimiento)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosContactos_ClientesEstablecimientos");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClientesEstablecimientosContactoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesEstablecimientosContactosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClientesEstablecimientosContactoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosContactosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ClientesEstablecimientosDia>(entity =>
        {
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");

            entity.HasOne(d => d.IdDiaNavigation).WithMany(p => p.InverseIdDiaNavigation)
                .HasForeignKey(d => d.IdDia)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosDias_ClientesEstablecimientosDias");

            entity.HasOne(d => d.IdEstablecimientoNavigation).WithMany(p => p.ClientesEstablecimientosDia)
                .HasForeignKey(d => d.IdEstablecimiento)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosDias_ClientesEstablecimientos");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClientesEstablecimientosDiaIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesEstablecimientosDiasUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClientesEstablecimientosDiaIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosDiasUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ClientesEstablecimientosDiasHorario>(entity =>
        {
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.HorarioDesde).HasPrecision(0);
            entity.Property(e => e.HorarioHasta).HasPrecision(0);
            entity.Property(e => e.IdEstablecimientoDia).HasColumnName("IdEstablecimientoDIa");

            entity.HasOne(d => d.IdEstablecimientoDiaNavigation).WithMany(p => p.ClientesEstablecimientosDiasHorarios)
                .HasForeignKey(d => d.IdEstablecimientoDia)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosDiasHorarios_ClientesEstablecimientosDias");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClientesEstablecimientosDiasHorarioIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesEstablecimientosDiasHorariosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClientesEstablecimientosDiasHorarioIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosDiasHorariosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ClientesEstablecimientosExcepcione>(entity =>
        {
            entity.Property(e => e.FechaDesde).HasColumnType("datetime");
            entity.Property(e => e.FechaHasta).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.NotaInterna).HasColumnType("text");

            entity.HasOne(d => d.IdEstablecimientoNavigation).WithMany(p => p.ClientesEstablecimientosExcepciones)
                .HasForeignKey(d => d.IdEstablecimiento)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosExcepciones_ClientesEstablecimientos");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClientesEstablecimientosExcepcioneIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesEstablecimientosExcepcionesUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClientesEstablecimientosExcepcioneIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosExcepcionesUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ClientesEstablecimientosProducto>(entity =>
        {
            entity.Property(e => e.Cantidad).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");

            entity.HasOne(d => d.IdEstablecimientoNavigation).WithMany(p => p.ClientesEstablecimientosProductos)
                .HasForeignKey(d => d.IdEstablecimiento)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosProductos_ClientesEstablecimientos");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ClientesEstablecimientosProductos)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosProductos_Productos");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ClientesEstablecimientosProductoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesEstablecimientosProductosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ClientesEstablecimientosProductoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesEstablecimientosProductosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ClientesProfesion>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(150)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ClientesTipoGenerador>(entity =>
        {
            entity.Property(e => e.Codigo)
                .HasMaxLength(2)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Compra>(entity =>
        {
            entity.Property(e => e.Descuentos).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.ImporteTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NotaInterna).HasColumnType("text");
            entity.Property(e => e.Subtotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TotalIva)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("TotalIVA");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.Compras)
                .HasForeignKey(d => d.IdProveedor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Compras_Proveedores");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.Compras)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Compras_Sucursales");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.CompraIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ComprasUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.CompraIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ComprasUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ComprasProducto>(entity =>
        {
            entity.Property(e => e.Cantidad).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CostoUnitCdesc).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CostoUnitFinal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CostoUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CostoUnitarioAnterior).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.DescTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DescUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Ivatotal)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("IVATotal");
            entity.Property(e => e.Ivaunitario)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("IVAUnitario");
            entity.Property(e => e.PorcDescuento).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PorcIva)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("PorcIVA");
            entity.Property(e => e.SubtotalCdesc).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SubtotalFinal).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdCompraNavigation).WithMany(p => p.ComprasProductos)
                .HasForeignKey(d => d.IdCompra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ComprasProductos_Compras");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ComprasProductos)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ComprasProductos_Productos");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ComprasProductoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ComprasProductosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ComprasProductoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ComprasProductosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<CondicionesIva>(entity =>
        {
            entity.ToTable("CondicionesIVA");

            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ContratosDocumento>(entity =>
        {
            entity.ToTable("Contratos_Documentos");

            entity.Property(e => e.Extension)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.Formato)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.NombreArchivo)
                .HasMaxLength(260)
                .IsUnicode(false);
            entity.Property(e => e.RutaRelativa)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");

            entity.HasOne(d => d.IdContratoNavigation).WithMany(p => p.ContratosDocumentos)
                .HasForeignKey(d => d.IdContrato)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_Contratos_Documentos_Contratos");

            entity.HasOne(d => d.IdTipoContratoNavigation).WithMany(p => p.ContratosDocumentos)
                .HasForeignKey(d => d.IdTipoContrato)
                .HasConstraintName("FK_Contratos_Documentos_Tipos_Contratos");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Contratos_Documentos_Usuarios");
        });

        modelBuilder.Entity<Contrato>(entity =>
        {
            entity.Property(e => e.FechaContrato).HasColumnType("date");
            entity.Property(e => e.FechaInicio).HasColumnType("date");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.FechaVencimiento).HasColumnType("date");

            entity.HasOne(d => d.IdTipoContratoNavigation).WithMany(p => p.Contratos)
                .HasForeignKey(d => d.IdTipoContrato)
                .HasConstraintName("FK_Contratos_Tipos_Contratos");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.Contratos)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Contratos_Clientes");

            entity.HasOne(d => d.IdEstablecimientoNavigation).WithMany(p => p.Contratos)
                .HasForeignKey(d => d.IdEstablecimiento)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Contratos_ClientesEstablecimientos");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ContratoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ContratosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ContratoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ContratosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<TiposContrato>(entity =>
        {
            entity.ToTable("Tipos_Contratos");

            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ContratosRenovacion>(entity =>
        {
            entity.Property(e => e.FechaInicio).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.FechaVencimiento).HasColumnType("date");
            entity.Property(e => e.Tipo)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdContratoNavigation).WithMany(p => p.ContratosRenovaciones)
                .HasForeignKey(d => d.IdContrato)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ContratosRenovaciones_Contratos");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ContratosRenovacioneIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ContratosRenovacionesUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ContratosRenovacioneIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ContratosRenovacionesUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<Cuenta>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.Cuenta)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Cuentas_Sucursales");
        });

        modelBuilder.Entity<Dia>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<EntregasEstado>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Feriado>(entity =>
        {
            entity.Property(e => e.Descripcion)
                .HasMaxLength(150)
                .IsUnicode(false);
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.FeriadoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_FeriadosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.FeriadoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_FeriadosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<FeriadosProfesion>(entity =>
        {
            entity.HasOne(d => d.IdFeriadoNavigation).WithMany(p => p.FeriadosProfesiones)
                .HasForeignKey(d => d.IdFeriado)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_FeriadosProfesiones_Feriados");

            entity.HasOne(d => d.IdProfesionNavigation).WithMany(p => p.FeriadosProfesiones)
                .HasForeignKey(d => d.IdProfesion)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_FeriadosProfesiones_ClientesProfesiones");
        });

        modelBuilder.Entity<Gasto>(entity =>
        {
            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.ImporteNeto).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ImporteTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NotaInterna).HasColumnType("text");
            entity.Property(e => e.NumReferencia)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.OtrosImpuestos).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PorcIva)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("PorcIVA");
            entity.Property(e => e.TotalIva)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("TotalIVA");

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.Gastos)
                .HasForeignKey(d => d.IdCategoria)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Gastos_GastosCategorias");

            entity.HasOne(d => d.IdCuentaNavigation).WithMany(p => p.Gastos)
                .HasForeignKey(d => d.IdCuenta)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Gastos_Cuentas");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.GastoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_GastosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.GastoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GastosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<GastosCategoria>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Inventario>(entity =>
        {
            entity.ToTable("Inventario");

            entity.Property(e => e.Stock).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.Inventarios)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_Productos");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.Inventarios)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventario_Sucursales");
        });

        modelBuilder.Entity<InventarioMovimiento>(entity =>
        {
            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Entrada).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Salida).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TipoMovimiento)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdInventarioNavigation).WithMany(p => p.InventarioMovimientos)
                .HasForeignKey(d => d.IdInventario)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_InventarioMovimientos_Inventario");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.InventarioMovimientoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_InventarioMovimientosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.InventarioMovimientoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_InventarioMovimientosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<InventarioRecuperado>(entity =>
        {
            entity.ToTable("InventarioRecuperado");

            entity.HasIndex(e => new { e.IdSucursal, e.IdProducto }, "UQ_InventarioRecuperado_Sucursal_Producto")
                .IsUnique();

            entity.Property(e => e.Stock).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.InventarioRecuperados)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_InventarioRecuperado_Productos");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.InventarioRecuperados)
                .HasForeignKey(d => d.IdSucursal)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_InventarioRecuperado_Sucursales");
        });

        modelBuilder.Entity<InventarioRecuperadoMovimiento>(entity =>
        {
            entity.ToTable("InventarioRecuperadoMovimiento");

            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Entrada).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Salida).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TipoMovimiento)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdInventarioRecuperadoNavigation).WithMany(p => p.InventarioRecuperadoMovimientos)
                .HasForeignKey(d => d.IdInventarioRecuperado)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_InventarioRecuperadoMovimiento_InventarioRecuperado");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.InventarioRecuperadoMovimientoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_InventarioRecuperadoMovimiento_Usuarios_Modifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.InventarioRecuperadoMovimientoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_InventarioRecuperadoMovimiento_Usuarios_Registra");
        });

        modelBuilder.Entity<ListasPrecio>(entity =>
        {
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ListasPrecioIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ListasPreciosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ListasPrecioIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ListasPreciosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ProductosCostoHistorial>(entity =>
        {
            entity.ToTable("ProductosCostoHistorial");

            entity.Property(e => e.CostoAnterior).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.CostoNuevo).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.Origen)
                .HasMaxLength(30)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCompraNavigation).WithMany()
                .HasForeignKey(d => d.IdCompra)
                .HasConstraintName("FK_ProductosCostoHistorial_Compra");

            entity.HasOne(d => d.IdProductoNavigation).WithMany()
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProductosCostoHistorial_Producto");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuario)
                .HasConstraintName("FK_ProductosCostoHistorial_Usuario");
        });

        modelBuilder.Entity<Producto>(entity =>
        {
            entity.Property(e => e.Activo)
                .IsRequired()
                .HasDefaultValueSql("((1))");
            entity.Property(e => e.CostoUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.Productos)
                .HasForeignKey(d => d.IdCategoria)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Productos_ProductosCategorias");

            entity.HasOne(d => d.IdMedidaNavigation).WithMany(p => p.Productos)
                .HasForeignKey(d => d.IdMedida)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Productos_UnidadesMedida");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ProductoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ProductosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ProductoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProductosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ProductosCategoria>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ProductosPrecio>(entity =>
        {
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.PorcRentabilidad).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PrecioVenta).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdListaPrecioNavigation).WithMany(p => p.ProductosPrecios)
                .HasForeignKey(d => d.IdListaPrecio)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProductosPrecios_ListasPrecios");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ProductosPrecios)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProductosPrecios_Productos");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ProductosPrecioIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ProductosPreciosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ProductosPrecioIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProductosPreciosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ProveedoresContacto>(entity =>
        {
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Puesto)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.TelefonoAlt)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.ProveedoresContactos)
                .HasForeignKey(d => d.IdProveedor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProveedoresContactos_Proveedores");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ProveedoresContactoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ProveedoresContactosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ProveedoresContactoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProveedoresContactosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<Proveedore>(entity =>
        {
            entity.Property(e => e.Activo)
                .IsRequired()
                .HasDefaultValueSql("((1))");
            entity.Property(e => e.AliasBancario)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CbuBancario)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Cuit)
                .HasMaxLength(10)
                .IsFixedLength();
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.IdCondicionIva).HasColumnName("IdCondicionIVA");
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdBancoNavigation).WithMany(p => p.Proveedores)
                .HasForeignKey(d => d.IdBanco)
                .HasConstraintName("FK_Proveedores_Bancos");

            entity.HasOne(d => d.IdCondicionIvaNavigation).WithMany(p => p.Proveedores)
                .HasForeignKey(d => d.IdCondicionIva)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Proveedores_CondicionesIVA");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ProveedoreIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ProveedoresUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ProveedoreIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProveedoresUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ProveedoresCuentaCorriente>(entity =>
        {
            entity.ToTable("ProveedoresCuentaCorriente");

            entity.Property(e => e.Saldo).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.ProveedoresCuentaCorrientes)
                .HasForeignKey(d => d.IdProveedor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProveedoresCuentaCorriente_Proveedores");
        });

        modelBuilder.Entity<ProveedoresCuentaCorrienteMovimiento>(entity =>
        {
            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Debe).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Haber).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TipoMovimiento)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.IdCuentaCorrienteNavigation).WithMany(p => p.ProveedoresCuentaCorrienteMovimientos)
                .HasForeignKey(d => d.IdCuentaCorriente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProveedoresCuentaCorrienteMovimientos_ProveedoresCuentaCorriente");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ProveedoresCuentaCorrienteMovimientoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ProveedoresCuentaCorrienteMovimientosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ProveedoresCuentaCorrienteMovimientoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProveedoresCuentaCorrienteMovimientosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<ProveedoresPago>(entity =>
        {
            entity.Property(e => e.Concepto)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Importe).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdCompraNavigation).WithMany(p => p.ProveedoresPagos)
                .HasForeignKey(d => d.IdCompra)
                .HasConstraintName("FK_ProveedoresPagos_Compras");

            entity.HasOne(d => d.IdCuentaNavigation).WithMany(p => p.ProveedoresPagos)
                .HasForeignKey(d => d.IdCuenta)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProveedoresPagos_Cuentas");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.ProveedoresPagos)
                .HasForeignKey(d => d.IdProveedor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProveedoresPagos_Proveedores");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.ProveedoresPagoIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ProveedoresPagosUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.ProveedoresPagoIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProveedoresPagosUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<Provincia>(entity =>
        {
            entity.Property(e => e.Codigo)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(60)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Partido>(entity =>
        {
            entity.Property(e => e.Codigo)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(120)
                .IsUnicode(false);

            entity.HasOne(d => d.IdProvinciaNavigation).WithMany(p => p.Partidos)
                .HasForeignKey(d => d.IdProvincia)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Partidos_Provincias");
        });

        modelBuilder.Entity<Localidad>(entity =>
        {
            entity.Property(e => e.Codigo)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(120)
                .IsUnicode(false);

            entity.HasOne(d => d.IdPartidoNavigation).WithMany(p => p.Localidades)
                .HasForeignKey(d => d.IdPartido)
                .HasConstraintName("FK_Localidades_Partidos");

            entity.HasOne(d => d.IdProvinciaNavigation).WithMany(p => p.Localidades)
                .HasForeignKey(d => d.IdProvincia)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Localidades_Provincias");
        });

        modelBuilder.Entity<ClientesEstado>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ClientesMotivo>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ClientesCalificacion>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Camion>(entity =>
        {
            entity.Property(e => e.Activo)
                .IsRequired()
                .HasDefaultValueSql("((1))");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Nombre)
                .HasMaxLength(120)
                .IsUnicode(false);

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_Camiones_Usuarios_Modifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Camiones_Usuarios_Registra");
        });

        modelBuilder.Entity<RecorridosMatriz>(entity =>
        {
            entity.ToTable("RecorridosMatriz");
            entity.Property(e => e.Zona).HasMaxLength(120).IsUnicode(false);
            entity.Property(e => e.HorarioSalida).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.HasIndex(e => new { e.IdCamion, e.IdSemana, e.IdDia }).IsUnique();

            entity.HasOne(d => d.IdCamionNavigation).WithMany()
                .HasForeignKey(d => d.IdCamion)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_RecorridosMatriz_Camiones");

            entity.HasOne(d => d.IdSemanaNavigation).WithMany()
                .HasForeignKey(d => d.IdSemana)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_RecorridosMatriz_Semanas");

            entity.HasOne(d => d.IdDiaNavigation).WithMany()
                .HasForeignKey(d => d.IdDia)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_RecorridosMatriz_Dias");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_RecorridosMatriz_UsuReg");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_RecorridosMatriz_UsuMod");
        });

        modelBuilder.Entity<ClientesRecorrido>(entity =>
        {
            entity.ToTable("ClientesRecorridos");
            entity.Property(e => e.Activo).HasDefaultValueSql("((1))");
            entity.Property(e => e.Observacion).HasMaxLength(500).IsUnicode(false);
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ClientesRecorridos)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesRecorridos_Clientes");

            entity.HasOne(d => d.IdEstablecimientoNavigation).WithMany()
                .HasForeignKey(d => d.IdEstablecimiento)
                .HasConstraintName("FK_ClientesRecorridos_Establecimientos");

            entity.HasOne(d => d.IdCamionNavigation).WithMany()
                .HasForeignKey(d => d.IdCamion)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesRecorridos_Camiones");

            entity.HasOne(d => d.IdSemanaNavigation).WithMany()
                .HasForeignKey(d => d.IdSemana)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesRecorridos_Semanas");

            entity.HasOne(d => d.IdDiaNavigation).WithMany()
                .HasForeignKey(d => d.IdDia)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesRecorridos_Dias");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesRecorridos_UsuReg");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesRecorridos_UsuMod");
        });

        modelBuilder.Entity<ClientesControlMensual>(entity =>
        {
            entity.ToTable("ClientesControlMensual");
            entity.Property(e => e.Observaciones).HasMaxLength(500).IsUnicode(false);
            entity.Property(e => e.AbonoEfectivo).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.AbonoTransferencia).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.FechaVisita).HasColumnType("date");
            entity.Property(e => e.FechaTransferencia).HasColumnType("date");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.HasIndex(e => new { e.IdCliente, e.Anio, e.Mes }).IsUnique();

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ClientesControlMensuales)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesControlMensual_Clientes");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ClientesControlMensual_UsuReg");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ClientesControlMensual_UsuMod");
        });

        modelBuilder.Entity<ProveedoresControlMensual>(entity =>
        {
            entity.ToTable("ProveedoresControlMensual");
            entity.Property(e => e.Observaciones).HasMaxLength(500).IsUnicode(false);
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.HasIndex(e => new { e.IdProveedor, e.Anio, e.Mes }).IsUnique();

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.ProveedoresControlMensuales)
                .HasForeignKey(d => d.IdProveedor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProveedoresControlMensual_Proveedores");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ProveedoresControlMensual_UsuReg");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_ProveedoresControlMensual_UsuMod");
        });

        modelBuilder.Entity<LibroDiarioConcepto>(entity =>
        {
            entity.ToTable("LibroDiarioConceptos");
            entity.Property(e => e.Nombre).HasMaxLength(120).IsUnicode(false);
            entity.Property(e => e.TipoStock).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Activo).HasDefaultValueSql("((1))");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");

            entity.HasOne(d => d.IdProductoNavigation).WithMany()
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_LibroDiarioConceptos_Productos");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LibroDiarioConceptos_UsuReg");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_LibroDiarioConceptos_UsuMod");
        });

        modelBuilder.Entity<LibroDiarioMovimiento>(entity =>
        {
            entity.ToTable("LibroDiarioMovimientos");
            entity.Property(e => e.Concepto).HasMaxLength(200).IsUnicode(false);
            entity.Property(e => e.RecorridoTexto).HasMaxLength(120).IsUnicode(false);
            entity.Property(e => e.FormaPago).HasMaxLength(30).IsUnicode(false);
            entity.Property(e => e.TipoStock).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.Unidades).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Debe).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Haber).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PorcIva).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.Iva).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.OtrosImp).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Total).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Saldo).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");

            entity.HasOne(d => d.IdConceptoNavigation).WithMany(p => p.LibroDiarioMovimientos)
                .HasForeignKey(d => d.IdConcepto)
                .HasConstraintName("FK_LibroDiarioMov_Conceptos");

            entity.HasOne(d => d.IdClienteNavigation).WithMany()
                .HasForeignKey(d => d.IdCliente)
                .HasConstraintName("FK_LibroDiarioMov_Clientes");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany()
                .HasForeignKey(d => d.IdProveedor)
                .HasConstraintName("FK_LibroDiarioMov_Proveedores");

            entity.HasOne(d => d.IdCamionNavigation).WithMany()
                .HasForeignKey(d => d.IdCamion)
                .HasConstraintName("FK_LibroDiarioMov_Camiones");

            entity.HasOne(d => d.IdSemanaNavigation).WithMany()
                .HasForeignKey(d => d.IdSemana)
                .HasConstraintName("FK_LibroDiarioMov_Semanas");

            entity.HasOne(d => d.IdDiaNavigation).WithMany()
                .HasForeignKey(d => d.IdDia)
                .HasConstraintName("FK_LibroDiarioMov_Dias");

            entity.HasOne(d => d.IdProductoNavigation).WithMany()
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_LibroDiarioMov_Productos");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LibroDiarioMov_UsuReg");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany()
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_LibroDiarioMov_UsuMod");
        });

        modelBuilder.Entity<Semana>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Sucursal>(entity =>
        {
            entity.Property(e => e.FechaUsuarioModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaUsuarioRegistra).HasColumnType("datetime");
            entity.Property(e => e.Nombre)
                .HasMaxLength(200)
                .IsUnicode(false);

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.SucursaleIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_SucursalesUsuariosIdUsuarioModifica");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.SucursaleIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_SucursalesUsuariosIdUsuarioRegistra");
        });

        modelBuilder.Entity<UnidadesMedida>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.Activo)
                .IsRequired()
                .HasDefaultValueSql("((1))");
            entity.Property(e => e.Apellido)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.CodigoRecuperacion)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.Contrasena)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Correo)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.Direccion)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Dni)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Usuario)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("Usuario");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.IdEstado)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Usuarios_Usuarios_Estados");

            entity.HasOne(d => d.IdRolNavigation).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.IdRol)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Usuarios_Usuarios_Roles");
        });

        modelBuilder.Entity<UsuariosEstado>(entity =>
        {
            entity.ToTable("Usuarios_Estados");

            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<UsuariosModulo>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Usuarios__3214EC07DFC8DC7D");

            entity.ToTable("Usuarios_Modulos");

            entity.Property(e => e.Activo)
                .IsRequired()
                .HasDefaultValueSql("((1))");
            entity.Property(e => e.Codigo)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Grupo)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<UsuariosPermiso>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Usuarios__3214EC07EB5C1DF1");

            entity.ToTable("Usuarios_Permisos");

            entity.Property(e => e.Activo)
                .IsRequired()
                .HasDefaultValueSql("((1))");
            entity.Property(e => e.Codigo)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Descripcion)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);

            entity.HasOne(d => d.IdModuloNavigation).WithMany(p => p.UsuariosPermisos)
                .HasForeignKey(d => d.IdModulo)
                .HasConstraintName("FK_UsuariosPermiso_Modulo");
        });

        modelBuilder.Entity<UsuariosPermisosUsuario>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Usuarios__3214EC075A5406F8");

            entity.ToTable("Usuarios_PermisosUsuario");

            entity.HasIndex(e => new { e.IdUsuario, e.IdModulo, e.IdPermiso }, "UQ_UPU").IsUnique();

            entity.Property(e => e.Activo)
                .IsRequired()
                .HasDefaultValueSql("((1))");
            entity.Property(e => e.FechaModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaRegistra)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.IdModuloNavigation).WithMany(p => p.UsuariosPermisosUsuarios)
                .HasForeignKey(d => d.IdModulo)
                .HasConstraintName("FK_UPU_Modulo");

            entity.HasOne(d => d.IdPermisoNavigation).WithMany(p => p.UsuariosPermisosUsuarios)
                .HasForeignKey(d => d.IdPermiso)
                .HasConstraintName("FK_UPU_Permiso");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.UsuariosPermisosUsuarioIdUsuarioNavigations)
                .HasForeignKey(d => d.IdUsuario)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UPU_User");

            entity.HasOne(d => d.IdUsuarioModificaNavigation).WithMany(p => p.UsuariosPermisosUsuarioIdUsuarioModificaNavigations)
                .HasForeignKey(d => d.IdUsuarioModifica)
                .HasConstraintName("FK_UPU_UserMod");

            entity.HasOne(d => d.IdUsuarioRegistraNavigation).WithMany(p => p.UsuariosPermisosUsuarioIdUsuarioRegistraNavigations)
                .HasForeignKey(d => d.IdUsuarioRegistra)
                .HasConstraintName("FK_UPU_UserReg");
        });

        modelBuilder.Entity<UsuariosRol>(entity =>
        {
            entity.ToTable("Usuarios_Roles");

            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<UsuariosRolesPermiso>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Usuarios__3214EC0700DD89C3");

            entity.ToTable("Usuarios_RolesPermisos");

            entity.HasIndex(e => new { e.IdRol, e.IdModulo, e.IdPermiso }, "UQ_URP").IsUnique();

            entity.Property(e => e.Activo)
                .IsRequired()
                .HasDefaultValueSql("((1))");
            entity.Property(e => e.FechaModifica).HasColumnType("datetime");
            entity.Property(e => e.FechaRegistra)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.IdModuloNavigation).WithMany(p => p.UsuariosRolesPermisos)
                .HasForeignKey(d => d.IdModulo)
                .HasConstraintName("FK_URP_Modulo");

            entity.HasOne(d => d.IdPermisoNavigation).WithMany(p => p.UsuariosRolesPermisos)
                .HasForeignKey(d => d.IdPermiso)
                .HasConstraintName("FK_URP_Permiso");

            entity.HasOne(d => d.IdRolNavigation).WithMany(p => p.UsuariosRolesPermisos)
                .HasForeignKey(d => d.IdRol)
                .HasConstraintName("FK_URP_Rol");
        });

        modelBuilder.Entity<UsuariosSucursal>(entity =>
        {
            entity.ToTable("Usuarios_Sucursales");

            entity.HasOne(d => d.IdSucursalNavigation).WithMany(p => p.UsuariosSucursales)
                .HasForeignKey(d => d.IdSucursal)
                .HasConstraintName("FK_Usuarios_Sucursales_Sucursales");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.UsuariosSucursales)
                .HasForeignKey(d => d.IdUsuario)
                .HasConstraintName("FK_Usuarios_Sucursales_Usuarios_Sucursales");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
