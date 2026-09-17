-- Estado comercial / licencia por establecimiento.
-- Dia y semana de recoleccion pasan a ser opcionales.

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'IdEstado') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD IdEstado INT NULL;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'IdMotivo') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD IdMotivo INT NULL;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'MotivoDetalle') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD MotivoDetalle VARCHAR(500) NULL;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'IdCalificacion') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD IdCalificacion INT NULL;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'FechaInicio') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD FechaInicio DATE NULL;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'FechaLicenciaDesde') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD FechaLicenciaDesde DATE NULL;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'FechaLicenciaHasta') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD FechaLicenciaHasta DATE NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ClientesEstablecimientos_ClientesEstados')
    ALTER TABLE dbo.ClientesEstablecimientos
        ADD CONSTRAINT FK_ClientesEstablecimientos_ClientesEstados
        FOREIGN KEY (IdEstado) REFERENCES dbo.ClientesEstados (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ClientesEstablecimientos_ClientesMotivos')
    ALTER TABLE dbo.ClientesEstablecimientos
        ADD CONSTRAINT FK_ClientesEstablecimientos_ClientesMotivos
        FOREIGN KEY (IdMotivo) REFERENCES dbo.ClientesMotivos (Id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ClientesEstablecimientos_ClientesCalificaciones')
    ALTER TABLE dbo.ClientesEstablecimientos
        ADD CONSTRAINT FK_ClientesEstablecimientos_ClientesCalificaciones
        FOREIGN KEY (IdCalificacion) REFERENCES dbo.ClientesCalificaciones (Id);
GO

UPDATE e
SET
    e.IdEstado = COALESCE(e.IdEstado, c.IdEstado),
    e.IdMotivo = COALESCE(e.IdMotivo, c.IdMotivo),
    e.MotivoDetalle = COALESCE(e.MotivoDetalle, c.MotivoDetalle),
    e.IdCalificacion = COALESCE(e.IdCalificacion, c.IdCalificacion),
    e.FechaInicio = COALESCE(e.FechaInicio, c.FechaInicio),
    e.FechaLicenciaDesde = COALESCE(e.FechaLicenciaDesde, c.FechaLicenciaDesde),
    e.FechaLicenciaHasta = COALESCE(e.FechaLicenciaHasta, c.FechaLicenciaHasta)
FROM dbo.ClientesEstablecimientos e
INNER JOIN dbo.Clientes c ON c.Id = e.IdCliente;
GO

ALTER TABLE dbo.ClientesEstablecimientos ALTER COLUMN IdDiaRecoleccion INT NULL;
ALTER TABLE dbo.ClientesEstablecimientos ALTER COLUMN IdSemanaRecoleccion INT NULL;
GO
