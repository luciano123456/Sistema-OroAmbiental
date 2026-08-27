/*
  028 — Certificados de tratamiento de residuos patogénicos por cliente.
        Vinculados al historial de manifiestos (RecorridosManifiestos).
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.CertificadosTratamientoContador', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CertificadosTratamientoContador (
        Id                         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UltimoNumeroCertificado    INT NOT NULL CONSTRAINT DF_CertTratCont_Cert DEFAULT (0),
        UltimoNumeroOrden          INT NOT NULL CONSTRAINT DF_CertTratCont_Orden DEFAULT (0),
        IdUsuarioModifica          INT NULL,
        FechaUsuarioModifica       DATETIME NOT NULL CONSTRAINT DF_CertTratCont_Fecha DEFAULT (GETDATE()),
        CONSTRAINT FK_CertTratCont_Usuarios FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios(Id)
    );

    INSERT INTO dbo.CertificadosTratamientoContador (UltimoNumeroCertificado, UltimoNumeroOrden, FechaUsuarioModifica)
    VALUES (0, 0, GETDATE());

    PRINT N'OK: CertificadosTratamientoContador creada.';
END
ELSE
    PRINT N'Skip: CertificadosTratamientoContador ya existe.';
GO

IF OBJECT_ID(N'dbo.ClientesCertificadosTratamiento', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientesCertificadosTratamiento (
        Id                         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        IdCliente                  INT NOT NULL,
        IdEstablecimiento          INT NULL,
        IdManifiestoHistorial      INT NULL,
        NumeroManifiesto           INT NOT NULL,
        NumeroCertificado          INT NOT NULL,
        NumeroOrdenOperaciones     INT NOT NULL,
        FechaEmision               DATE NOT NULL,
        FechaTratamiento           DATE NOT NULL,
        Cantidad                   NVARCHAR(40) NOT NULL,
        RazonSocial                NVARCHAR(200) NOT NULL,
        CheNro                     NVARCHAR(40) NULL,
        Calle                      NVARCHAR(120) NULL,
        NumeroCalle                NVARCHAR(20) NULL,
        Piso                       NVARCHAR(40) NULL,
        Localidad                  NVARCHAR(120) NULL,
        Cuit                       NVARCHAR(30) NULL,
        RutaPdf                    NVARCHAR(500) NOT NULL,
        NombreArchivo              NVARCHAR(200) NOT NULL,
        FechaGeneracion            DATETIME NOT NULL,
        IdUsuario                  INT NULL,
        IdCamion                   INT NULL,
        IdSemana                   INT NULL,
        IdDia                      INT NULL,
        CONSTRAINT FK_ClientesCertTrat_Clientes FOREIGN KEY (IdCliente) REFERENCES dbo.Clientes(Id),
        CONSTRAINT FK_ClientesCertTrat_Establecimientos FOREIGN KEY (IdEstablecimiento) REFERENCES dbo.ClientesEstablecimientos(Id),
        CONSTRAINT FK_ClientesCertTrat_Manifiestos FOREIGN KEY (IdManifiestoHistorial) REFERENCES dbo.RecorridosManifiestos(Id),
        CONSTRAINT FK_ClientesCertTrat_Usuarios FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuarios(Id),
        CONSTRAINT FK_ClientesCertTrat_Camiones FOREIGN KEY (IdCamion) REFERENCES dbo.Camiones(Id)
    );

    CREATE INDEX IX_ClientesCertTrat_ClienteFecha
        ON dbo.ClientesCertificadosTratamiento(IdCliente, FechaGeneracion DESC);

    CREATE INDEX IX_ClientesCertTrat_NumeroCert
        ON dbo.ClientesCertificadosTratamiento(NumeroCertificado DESC);

    CREATE INDEX IX_ClientesCertTrat_Manifiesto
        ON dbo.ClientesCertificadosTratamiento(IdManifiestoHistorial);

    PRINT N'OK: ClientesCertificadosTratamiento creada.';
END
ELSE
    PRINT N'Skip: ClientesCertificadosTratamiento ya existe.';
GO

PRINT N'028_ClientesCertificadosTratamiento finalizado.';
GO
