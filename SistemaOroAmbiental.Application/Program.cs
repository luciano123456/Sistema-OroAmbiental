using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        o.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

builder.Services.AddRazorPages().AddRazorRuntimeCompilation();

builder.Services.AddDbContext<SistemaOroAmbientalContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("SistemaDB")));

builder.Services.AddScoped(typeof(IConfiguracionNombreRepository<>), typeof(ConfiguracionNombreRepository<>));
builder.Services.AddScoped(typeof(IConfiguracionNombreService<>), typeof(ConfiguracionNombreService<>));

builder.Services.AddScoped<IUsuariosRepository<User>, UsuariosRepository>();
builder.Services.AddScoped<IUsuariosService, UsuariosService>();

builder.Services.AddScoped<ILoginRepository<User>, LoginRepository>();
builder.Services.AddScoped<ILoginService, LoginService>();

builder.Services.AddScoped<IUsuariosPermisosRepository, UsuariosPermisosRepository>();
builder.Services.AddScoped<IUsuariosPermisosService, UsuariosPermisosService>();

builder.Services.AddScoped<IRolesRepository<UsuariosRol>, RolesRepository>();
builder.Services.AddScoped<IRolesService, RolesService>();

builder.Services.AddScoped<IClientesRepository, ClientesRepository>();
builder.Services.AddScoped<IClientesService, ClientesService>();

builder.Services.AddScoped<IClientesContactosRepository, ClientesContactosRepository>();
builder.Services.AddScoped<IClientesContactosService, ClientesContactosService>();

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

builder.Services.AddScoped<IEstadosUsuariosRepository, EstadosUsuariosRepository>();
builder.Services.AddScoped<IEstadosUsuariosService, EstadosUsuariosService>();

builder.Services.AddScoped<IProductosCategoriasRepository, ProductosCategoriasRepository>();
builder.Services.AddScoped<IProductosCategoriasService, ProductosCategoriasService>();

builder.Services.AddScoped<IProvinciasRepository, ProvinciasRepository>();
builder.Services.AddScoped<IProvinciasService, ProvinciasService>();

builder.Services.AddScoped<ICondicionesIvaRepository, CondicionesIvaRepository>();
builder.Services.AddScoped<ICondicionesIvaService, CondicionesIvaService>();

builder.Services.AddScoped<ISemanasRepository, SemanasRepository>();
builder.Services.AddScoped<ISemanasService, SemanasService>();

builder.Services.AddScoped<IUnidadesMedidaRepository, UnidadesMedidaRepository>();
builder.Services.AddScoped<IUnidadesMedidaService, UnidadesMedidaService>();

builder.Services.AddScoped<IUsuariosRolesRepository, UsuariosRolesRepository>();
builder.Services.AddScoped<IUsuariosRolesService, UsuariosRolesService>();

builder.Services.AddScoped<IRolRepository, RolRepository>();
builder.Services.AddScoped<IRolService, RolService>();

builder.Services.AddScoped<IGastosCategoriasRepository, GastosCategoriasRepository>();
builder.Services.AddScoped<IGastosCategoriasService, GastosCategoriasService>();

builder.Services.AddScoped<ISucursalesRepository, SucursalesRepository>();
builder.Services.AddScoped<ISucursalesService, SucursalesService>();

builder.Services.AddScoped<IListasPreciosRepository, ListasPreciosRepository>();
builder.Services.AddScoped<IListasPreciosService, ListasPreciosService>();

builder.Services.AddScoped<ICuentasRepository, CuentasRepository>();
builder.Services.AddScoped<ICuentasService, CuentasService>();

builder.Services.AddScoped<IProductosPreciosRepository, ProductosPreciosRepository>();
builder.Services.AddScoped<IProductosPreciosService, ProductosPreciosService>();

builder.Services.AddScoped<IProductosRepository, ProductosRepository>();
builder.Services.AddScoped<IProductosService, ProductosService>();

builder.Services.AddScoped<IProveedoresRepository, ProveedoresRepository>();
builder.Services.AddScoped<IProveedoresService, ProveedoresService>();

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
                Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:SecretKey"]!))
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

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Login}/{action=Index}/{id?}");

app.Run();
