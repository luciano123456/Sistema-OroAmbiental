using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IO.Compression;
using SistemaOroAmbiental.Application.Configuration;
using SistemaOroAmbiental.Application.Helpers;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/javascript",
        "text/css",
        "image/svg+xml"
    });
});
builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);

builder.Services.AddMemoryCache();
builder.Services.AddResponseCaching();

builder.Services.AddControllersWithViews()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        o.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddRazorPages().AddRazorRuntimeCompilation();
}
else
{
    builder.Services.AddRazorPages();
}

builder.Services.AddDbContextPool<SistemaOroAmbientalContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("SistemaDB"),
        sql => sql.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null)));

builder.Services.AddScoped(typeof(IConfiguracionNombreRepository<>), typeof(ConfiguracionNombreRepository<>));
builder.Services.AddScoped(typeof(IConfiguracionNombreService<>), typeof(ConfiguracionNombreService<>));
builder.Services.AddScoped<IDeleteConflictChecker, DeleteConflictChecker>();
builder.Services.AddScoped<IEntidadCascadeRepository, EntidadCascadeRepository>();
builder.Services.AddScoped<ICatalogoCascadeRepository, CatalogoCascadeRepository>();

builder.Services.AddScoped<IUsuariosRepository<User>, UsuariosRepository>();
builder.Services.AddScoped<IUsuariosService, UsuariosService>();
builder.Services.AddScoped<IUsuariosConexionesRepository, UsuariosConexionesRepository>();
builder.Services.AddScoped<IUsuariosConexionesService, UsuariosConexionesService>();

builder.Services.AddScoped<IUsuariosSucursalesRepository, UsuariosSucursalesRepository>();
builder.Services.AddScoped<IUsuariosSucursalesService, UsuariosSucursalesService>();

builder.Services.AddScoped<ILoginRepository<User>, LoginRepository>();
builder.Services.AddScoped<ILoginService, LoginService>();

builder.Services.AddScoped<IUsuariosPermisosRepository, UsuariosPermisosRepository>();
builder.Services.AddScoped<IUsuariosPermisosService, UsuariosPermisosService>();

builder.Services.AddScoped<IClientesRepository, ClientesRepository>();
builder.Services.AddScoped<IClientesService, ClientesService>();

builder.Services.AddScoped<IClientesOperativoRepository, ClientesOperativoRepository>();
builder.Services.AddScoped<IClientesOperativoService, ClientesOperativoService>();
builder.Services.AddScoped<IProveedoresOperativoRepository, ProveedoresOperativoRepository>();
builder.Services.AddScoped<IProveedoresOperativoService, ProveedoresOperativoService>();

builder.Services.AddScoped<IClientesContactosRepository, ClientesContactosRepository>();
builder.Services.AddScoped<IClientesContactosService, ClientesContactosService>();

builder.Services.AddScoped<IClientesEstablecimientosRepository, ClientesEstablecimientosRepository>();
builder.Services.AddScoped<IClientesEstablecimientosService, ClientesEstablecimientosService>();

builder.Services.AddScoped<IClientesEstablecimientosContactosRepository, ClientesEstablecimientosContactosRepository>();
builder.Services.AddScoped<IClientesEstablecimientosContactosService, ClientesEstablecimientosContactosService>();

builder.Services.AddScoped<IClientesEstablecimientosProductosRepository, ClientesEstablecimientosProductosRepository>();
builder.Services.AddScoped<IClientesEstablecimientosProductosService, ClientesEstablecimientosProductosService>();

builder.Services.AddScoped<IClientesProfesionesRepository, ClientesProfesionesRepository>();
builder.Services.AddScoped<IClientesProfesionesService, ClientesProfesionesService>();

builder.Services.AddScoped<ICatalogosRepository, CatalogosRepository>();
builder.Services.AddScoped<ICatalogosService, CatalogosService>();

builder.Services.AddScoped<IBancosRepository, BancosRepository>();
builder.Services.AddScoped<IBancosService, BancosService>();

builder.Services.AddScoped<IDiasRepository, DiasRepository>();
builder.Services.AddScoped<IDiasService, DiasService>();

builder.Services.AddScoped<IEntregasEstadosRepository, EntregasEstadosRepository>();
builder.Services.AddScoped<IEntregasEstadosService, EntregasEstadosService>();

builder.Services.AddScoped<IUsuariosEstadosRepository, UsuariosEstadosRepository>();
builder.Services.AddScoped<IUsuariosEstadosService, UsuariosEstadosService>();

builder.Services.AddScoped<IProductosCategoriasRepository, ProductosCategoriasRepository>();
builder.Services.AddScoped<IProductosCategoriasService, ProductosCategoriasService>();

builder.Services.AddScoped<IProvinciasRepository, ProvinciasRepository>();
builder.Services.AddScoped<IProvinciasService, ProvinciasService>();

builder.Services.AddScoped<IPartidosRepository, PartidosRepository>();
builder.Services.AddScoped<IPartidosService, PartidosService>();

builder.Services.AddScoped<ILocalidadesRepository, LocalidadesRepository>();
builder.Services.AddScoped<ILocalidadesService, LocalidadesService>();

builder.Services.AddScoped<ICondicionesIvaRepository, CondicionesIvaRepository>();
builder.Services.AddScoped<ICondicionesIvaService, CondicionesIvaService>();

builder.Services.AddScoped<ISemanasRepository, SemanasRepository>();
builder.Services.AddScoped<ISemanasService, SemanasService>();

builder.Services.AddScoped<IUnidadesMedidaRepository, UnidadesMedidaRepository>();
builder.Services.AddScoped<IUnidadesMedidaService, UnidadesMedidaService>();

builder.Services.AddScoped<IUsuariosRolesRepository, UsuariosRolesRepository>();
builder.Services.AddScoped<IUsuariosRolesService, UsuariosRolesService>();

builder.Services.AddScoped<IGastosCategoriasRepository, GastosCategoriasRepository>();
builder.Services.AddScoped<IGastosCategoriasService, GastosCategoriasService>();

builder.Services.AddScoped<ISucursalesRepository, SucursalesRepository>();
builder.Services.AddScoped<ISucursalesService, SucursalesService>();

builder.Services.AddScoped<IListasPreciosRepository, ListasPreciosRepository>();
builder.Services.AddScoped<IListasPreciosService, ListasPreciosService>();
builder.Services.AddScoped<ITiposPagoRepository, TiposPagoRepository>();
builder.Services.AddScoped<ITiposPagoService, TiposPagoService>();

builder.Services.AddScoped<ICuentasRepository, CuentasRepository>();
builder.Services.AddScoped<ICuentasService, CuentasService>();

builder.Services.AddScoped<IProductosPreciosRepository, ProductosPreciosRepository>();
builder.Services.AddScoped<IProductosPreciosService, ProductosPreciosService>();

builder.Services.AddScoped<IProductosRepository, ProductosRepository>();
builder.Services.AddScoped<IProductosService, ProductosService>();

builder.Services.AddScoped<ICamionesRepository, CamionesRepository>();
builder.Services.AddScoped<ICamionesService, CamionesService>();
builder.Services.AddScoped<IChoferesRepository, ChoferesRepository>();
builder.Services.AddScoped<IChoferesService, ChoferesService>();
builder.Services.AddScoped<ChoferesFirmaStorage>();

builder.Services.AddScoped<IRecorridosRepository, RecorridosRepository>();
builder.Services.AddScoped<IRecorridosService, RecorridosService>();
builder.Services.AddScoped<IClientesCertificadosTratamientoRepository, ClientesCertificadosTratamientoRepository>();
builder.Services.AddScoped<CertificadosTratamientoStorage>();

builder.Services.AddScoped<IProveedoresRepository, ProveedoresRepository>();
builder.Services.AddScoped<IProveedoresService, ProveedoresService>();

builder.Services.AddScoped<IProveedoresContactosRepository, ProveedoresContactosRepository>();
builder.Services.AddScoped<IProveedoresContactosService, ProveedoresContactosService>();

builder.Services.AddScoped<ICajasRepository, CajasRepository>();
builder.Services.AddScoped<ICajasService, CajasService>();

builder.Services.AddScoped<IClientesCuentaCorrienteRepository, ClientesCuentaCorrienteRepository>();
builder.Services.AddScoped<IClientesCuentaCorrienteService, ClientesCuentaCorrienteService>();

builder.Services.AddScoped<IProveedoresCuentaCorrienteRepository, ProveedoresCuentaCorrienteRepository>();
builder.Services.AddScoped<IProveedoresCuentaCorrienteService, ProveedoresCuentaCorrienteService>();

builder.Services.AddScoped<IInventarioRepository, InventarioRepository>();
builder.Services.AddScoped<IInventarioService, InventarioService>();

builder.Services.AddScoped<IComprasRepository, ComprasRepository>();
builder.Services.AddScoped<IComprasService, ComprasService>();

builder.Services.AddScoped<IContratosRepository, ContratosRepository>();
builder.Services.AddScoped<IContratosService, ContratosService>();

builder.Services.AddScoped<IContratosRenovacionesRepository, ContratosRenovacionesRepository>();
builder.Services.AddScoped<IContratosRenovacionesService, ContratosRenovacionesService>();

builder.Services.AddScoped<IContratosDocumentosRepository, ContratosDocumentosRepository>();

builder.Services.AddScoped<IClientesEntregasRepository, ClientesEntregasRepository>();
builder.Services.AddScoped<IClientesEntregasService, ClientesEntregasService>();

builder.Services.AddScoped<IInventarioRecuperadoRepository, InventarioRecuperadoRepository>();
builder.Services.AddScoped<IProductosRecuperadosRepository, ProductosRecuperadosRepository>();
builder.Services.AddScoped<IProductosRecuperadosService, ProductosRecuperadosService>();

builder.Services.AddScoped<IGastosRepository, GastosRepository>();
builder.Services.AddScoped<IGastosService, GastosService>();

builder.Services.AddScoped<ILibroDiarioRepository, LibroDiarioRepository>();
builder.Services.AddScoped<ILibroDiarioService, LibroDiarioService>();

builder.Services.AddScoped<IAnalisisDatosRepository, AnalisisDatosRepository>();
builder.Services.AddScoped<IAnalisisDatosService, AnalisisDatosService>();

var sessionSettings = new SessionSettings();
builder.Configuration.GetSection("SessionSettings").Bind(sessionSettings);
if (sessionSettings.GetDuration() <= TimeSpan.Zero)
{
    throw new InvalidOperationException(
        "Configure SessionSettings:DurationHours y/o SessionSettings:DurationMinutes en appsettings.json");
}
builder.Services.AddSingleton(sessionSettings);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:SecretKey"]!)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder()
        .AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme)
        .RequireAuthenticatedUser()
        .Build();
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseResponseCompression();
app.UseResponseCaching();

app.UseHttpsRedirection();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var path = ctx.Context.Request.Path.Value ?? "";
        if (path.StartsWith("/css/", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/js/", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/lib/", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/Imagenes/", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers.CacheControl = "public,max-age=604800";
        }
    }
});

app.Use(async (context, next) =>
{
    // Igual que Sistema David: forzar charset UTF-8 en HTML antes de enviar headers
    context.Response.OnStarting(() =>
    {
        var ct = context.Response.ContentType;
        if (!string.IsNullOrEmpty(ct)
            && ct.StartsWith("text/html", StringComparison.OrdinalIgnoreCase)
            && !ct.Contains("charset", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.ContentType = ct + "; charset=utf-8";
        }
        return Task.CompletedTask;
    });
    await next();
});

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Login}/{action=Index}/{id?}");

app.Run();
