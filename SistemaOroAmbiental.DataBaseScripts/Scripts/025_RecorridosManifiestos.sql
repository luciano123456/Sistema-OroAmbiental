/*
  025 — Historial de manifiestos generados por unidad (camión).
        Cada manifiesto impreso/generado queda registrado para
        consultarlo y reimprimirlo desde la ficha del camión.
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.RecorridosManifiestos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecorridosManifiestos (
        Id                         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        IdCamion                   INT NOT NULL,
        IdSemana                   INT NULL,
        IdDia                      INT NULL,
        IdClienteRecorrido         INT NULL,
        IdCliente                  INT NULL,
        IdEstablecimiento          INT NULL,
        Numero                     INT NOT NULL,
        Nombre                     NVARCHAR(120) NOT NULL,
        RazonSocial                NVARCHAR(200) NULL,
        Cuit                       NVARCHAR(30) NULL,
        IdEstablecimientoCliente   NVARCHAR(40) NULL,
        Direccion                  NVARCHAR(250) NULL,
        Localidad                  NVARCHAR(120) NULL,
        Telefono                   NVARCHAR(40) NULL,
        Cantidad                   NVARCHAR(40) NULL,
        Zona                       NVARCHAR(120) NULL,
        FechaGeneracion            DATETIME NOT NULL,
        IdUsuario                  INT NULL,
        CONSTRAINT FK_RecorridosManifiestos_Camiones FOREIGN KEY (IdCamion) REFERENCES dbo.Camiones(Id),
        CONSTRAINT FK_RecorridosManifiestos_Semanas FOREIGN KEY (IdSemana) REFERENCES dbo.Semanas(Id),
        CONSTRAINT FK_RecorridosManifiestos_Dias FOREIGN KEY (IdDia) REFERENCES dbo.Dias(Id),
        CONSTRAINT FK_RecorridosManifiestos_Usuarios FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuarios(Id)
    );

    CREATE INDEX IX_RecorridosManifiestos_CamionFecha
        ON dbo.RecorridosManifiestos(IdCamion, FechaGeneracion DESC);

    CREATE INDEX IX_RecorridosManifiestos_CamionNumero
        ON dbo.RecorridosManifiestos(IdCamion, Numero DESC);

    PRINT N'OK: RecorridosManifiestos creada.';
END
ELSE
    PRINT N'Skip: RecorridosManifiestos ya existe.';
GO

PRINT N'025_RecorridosManifiestos finalizado.';
GO
