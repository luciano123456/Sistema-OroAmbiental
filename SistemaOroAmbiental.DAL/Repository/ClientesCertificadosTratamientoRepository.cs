using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesCertificadosTratamientoRepository : IClientesCertificadosTratamientoRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ClientesCertificadosTratamientoRepository(SistemaOroAmbientalContext db)
        {
            _db = db;
        }

        public async Task<SiguienteNumeroCertificadoDto> ObtenerSiguienteNumero(int ultimoCertificadoUsado, int ultimoOrdenUsado)
        {
            try
            {
                var contador = await _db.CertificadosTratamientoContador.AsNoTracking()
                    .OrderBy(x => x.Id)
                    .FirstOrDefaultAsync();

                var maxCertDb = contador?.UltimoNumeroCertificado ?? 0;
                var maxOrdenDb = contador?.UltimoNumeroOrden ?? 0;

                var maxCertHist = await _db.ClientesCertificadosTratamiento.AsNoTracking()
                    .MaxAsync(x => (int?)x.NumeroCertificado) ?? 0;
                var maxOrdenHist = await _db.ClientesCertificadosTratamiento.AsNoTracking()
                    .MaxAsync(x => (int?)x.NumeroOrdenOperaciones) ?? 0;

                var ultCert = Math.Max(Math.Max(maxCertDb, maxCertHist), ultimoCertificadoUsado);
                var ultOrden = Math.Max(Math.Max(maxOrdenDb, maxOrdenHist), ultimoOrdenUsado);

                return new SiguienteNumeroCertificadoDto
                {
                    NumeroCertificado = ultCert + 1,
                    NumeroOrden = ultOrden + 1
                };
            }
            catch (Exception ex) when (EsTablaFaltante(ex))
            {
                return new SiguienteNumeroCertificadoDto
                {
                    NumeroCertificado = Math.Max(ultimoCertificadoUsado, 0) + 1,
                    NumeroOrden = Math.Max(ultimoOrdenUsado, 0) + 1
                };
            }
        }

        public async Task<List<ClientesCertificadoTratamiento>> ListarPorCliente(int idCliente)
        {
            if (idCliente <= 0)
                return new List<ClientesCertificadoTratamiento>();

            try
            {
                return await _db.ClientesCertificadosTratamiento.AsNoTracking()
                    .Where(x => x.IdCliente == idCliente)
                    .OrderByDescending(x => x.FechaGeneracion)
                    .ThenByDescending(x => x.NumeroCertificado)
                    .ToListAsync();
            }
            catch (Exception ex) when (EsTablaFaltante(ex))
            {
                return new List<ClientesCertificadoTratamiento>();
            }
        }

        public async Task<ClientesCertificadoTratamiento?> Obtener(int id)
        {
            if (id <= 0)
                return null;

            try
            {
                return await _db.ClientesCertificadosTratamiento.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == id);
            }
            catch (Exception ex) when (EsTablaFaltante(ex))
            {
                return null;
            }
        }

        public async Task<List<ClientesCertificadoTratamiento>> InsertarLote(IReadOnlyList<ClientesCertificadoTratamiento> items)
        {
            if (items == null || items.Count == 0)
                return new List<ClientesCertificadoTratamiento>();

            try
            {
                _db.ClientesCertificadosTratamiento.AddRange(items);
                await _db.SaveChangesAsync();
                return items.ToList();
            }
            catch (Exception ex) when (EsTablaFaltante(ex))
            {
                return new List<ClientesCertificadoTratamiento>();
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            if (id <= 0)
                return false;

            try
            {
                var row = await _db.ClientesCertificadosTratamiento.FindAsync(id);
                if (row == null)
                    return false;

                _db.ClientesCertificadosTratamiento.Remove(row);
                await _db.SaveChangesAsync();
                return true;
            }
            catch (Exception ex) when (EsTablaFaltante(ex))
            {
                return false;
            }
        }

        public async Task ActualizarContador(int ultimoCertificado, int ultimoOrden, int idUsuario)
        {
            if (ultimoCertificado <= 0 && ultimoOrden <= 0)
                return;

            try
            {
                var row = await _db.CertificadosTratamientoContador.OrderBy(x => x.Id).FirstOrDefaultAsync();
                if (row == null)
                {
                    _db.CertificadosTratamientoContador.Add(new CertificadosTratamientoContador
                    {
                        UltimoNumeroCertificado = ultimoCertificado,
                        UltimoNumeroOrden = ultimoOrden,
                        IdUsuarioModifica = idUsuario > 0 ? idUsuario : null,
                        FechaUsuarioModifica = DateTime.Now
                    });
                }
                else
                {
                    if (ultimoCertificado > row.UltimoNumeroCertificado)
                        row.UltimoNumeroCertificado = ultimoCertificado;
                    if (ultimoOrden > row.UltimoNumeroOrden)
                        row.UltimoNumeroOrden = ultimoOrden;
                    row.IdUsuarioModifica = idUsuario > 0 ? idUsuario : null;
                    row.FechaUsuarioModifica = DateTime.Now;
                }

                await _db.SaveChangesAsync();
            }
            catch (Exception ex) when (EsTablaFaltante(ex))
            {
            }
        }

        public async Task<List<ClienteDocumentoManifiestoDto>> ListarDocumentosPorCliente(int idCliente)
        {
            if (idCliente <= 0)
                return new List<ClienteDocumentoManifiestoDto>();

            var lista = new List<ClienteDocumentoManifiestoDto>();

            try
            {
                var manifiestos = await _db.RecorridosManifiestos.AsNoTracking()
                    .Include(x => x.IdCamionNavigation)
                    .Include(x => x.IdSemanaNavigation)
                    .Include(x => x.IdDiaNavigation)
                    .Include(x => x.IdUsuarioNavigation)
                    .Where(x => x.IdCliente == idCliente)
                    .OrderByDescending(x => x.FechaGeneracion)
                    .ThenByDescending(x => x.Numero)
                    .ToListAsync();

                var certificados = await _db.ClientesCertificadosTratamiento.AsNoTracking()
                    .Include(x => x.IdCamionNavigation)
                    .Include(x => x.IdUsuarioNavigation)
                    .Where(x => x.IdCliente == idCliente)
                    .ToListAsync();

                var certPorManifiesto = certificados
                    .Where(c => c.IdManifiestoHistorial.HasValue)
                    .GroupBy(c => c.IdManifiestoHistorial!.Value)
                    .ToDictionary(g => g.Key, g => g.OrderByDescending(c => c.FechaGeneracion).First());

                foreach (var m in manifiestos)
                {
                    certPorManifiesto.TryGetValue(m.Id, out var cert);
                    lista.Add(new ClienteDocumentoManifiestoDto
                    {
                        Tipo = "manifiesto",
                        Id = m.Id,
                        IdCamion = m.IdCamion,
                        Camion = m.IdCamionNavigation?.Nombre ?? "",
                        Numero = m.Numero,
                        NumeroManifiesto = m.Numero,
                        RazonSocial = m.RazonSocial ?? m.Nombre ?? "",
                        Cantidad = m.Cantidad ?? "",
                        Recorrido = ArmarRecorridoLabel(m.IdSemanaNavigation?.Nombre, m.IdDiaNavigation?.Nombre, m.Zona),
                        Fecha = m.FechaGeneracion,
                        Usuario = m.IdUsuarioNavigation?.Usuario ?? "",
                        TieneCertificado = cert != null,
                        IdCertificado = cert?.Id
                    });
                }

                var idsManifConCert = certPorManifiesto.Keys.ToHashSet();
                foreach (var c in certificados.Where(c => !c.IdManifiestoHistorial.HasValue || !idsManifConCert.Contains(c.IdManifiestoHistorial.Value)))
                {
                    if (c.IdManifiestoHistorial.HasValue && idsManifConCert.Contains(c.IdManifiestoHistorial.Value))
                        continue;

                    lista.Add(new ClienteDocumentoManifiestoDto
                    {
                        Tipo = "certificado",
                        Id = c.Id,
                        IdCamion = c.IdCamion,
                        Camion = c.IdCamionNavigation?.Nombre ?? "",
                        Numero = c.NumeroCertificado,
                        NumeroCertificado = c.NumeroCertificado,
                        NumeroManifiesto = c.NumeroManifiesto,
                        RazonSocial = c.RazonSocial,
                        Cantidad = c.Cantidad,
                        Recorrido = "",
                        Fecha = c.FechaGeneracion,
                        Usuario = c.IdUsuarioNavigation?.Usuario ?? "",
                        TieneCertificado = true,
                        IdCertificado = c.Id
                    });
                }

                // Certificados vinculados a manifiestos ya listados: agregar fila certificado
                foreach (var cert in certPorManifiesto.Values)
                {
                    lista.Add(new ClienteDocumentoManifiestoDto
                    {
                        Tipo = "certificado",
                        Id = cert.Id,
                        IdCamion = cert.IdCamion,
                        Camion = cert.IdCamionNavigation?.Nombre ?? "",
                        Numero = cert.NumeroCertificado,
                        NumeroCertificado = cert.NumeroCertificado,
                        NumeroManifiesto = cert.NumeroManifiesto,
                        RazonSocial = cert.RazonSocial,
                        Cantidad = cert.Cantidad,
                        Recorrido = "",
                        Fecha = cert.FechaGeneracion,
                        Usuario = cert.IdUsuarioNavigation?.Usuario ?? "",
                        TieneCertificado = true,
                        IdCertificado = cert.Id
                    });
                }

                return lista
                    .OrderByDescending(x => x.Fecha)
                    .ThenByDescending(x => x.Numero)
                    .ToList();
            }
            catch (Exception ex) when (EsTablaFaltante(ex))
            {
                return lista;
            }
        }

        private static string ArmarRecorridoLabel(string? semana, string? dia, string? zona)
        {
            var z = (zona ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(z))
                return z;
            var s = (semana ?? "").Trim();
            var d = (dia ?? "").Trim();
            return $"{s} {d}".Trim();
        }

        private static bool EsTablaFaltante(Exception ex)
        {
            var msg = (ex.InnerException?.Message ?? ex.Message) ?? "";
            if (!msg.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase))
                return false;
            return msg.Contains("ClientesCertificadosTratamiento", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("CertificadosTratamientoContador", StringComparison.OrdinalIgnoreCase);
        }
    }
}
