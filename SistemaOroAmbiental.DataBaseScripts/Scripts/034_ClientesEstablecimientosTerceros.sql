-- Pagadores terceros por establecimiento + origen del cobro.
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'ClientesEstablecimientosTerceros' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.ClientesEstablecimientosTerceros (
        Id                      INT IDENTITY(1,1) NOT NULL,
        IdEstablecimiento       INT NOT NULL,
        Nombre                  VARCHAR(100) NOT NULL,
        Cuit                    VARCHAR(20) NULL,
        Telefono                VARCHAR(50) NULL,
        Email                   VARCHAR(100) NULL,
        Banco                   VARCHAR(80) NULL,
        CbuAlias                VARCHAR(40) NULL,
        Observaciones           VARCHAR(500) NULL,
        Activo                  BIT NOT NULL CONSTRAINT DF_ClientesEstablecimientosTerceros_Activo DEFAULT (1),
        IdUsuarioRegistra       INT NOT NULL,
        FechaUsuarioRegistra    DATETIME NOT NULL,
        IdUsuarioModifica       INT NULL,
        FechaUsuarioModifica    DATETIME NULL,
        CONSTRAINT PK_ClientesEstablecimientosTerceros PRIMARY KEY (Id),
        CONSTRAINT FK_ClientesEstablecimientosTerceros_Establecimientos
            FOREIGN KEY (IdEstablecimiento) REFERENCES dbo.ClientesEstablecimientos (Id),
        CONSTRAINT FK_ClientesEstablecimientosTercerosUsuariosIdUsuarioRegistra
            FOREIGN KEY (IdUsuarioRegistra) REFERENCES dbo.Usuarios (Id),
        CONSTRAINT FK_ClientesEstablecimientosTercerosUsuariosIdUsuarioModifica
            FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios (Id)
    );

    CREATE INDEX IX_ClientesEstablecimientosTerceros_IdEstablecimiento
        ON dbo.ClientesEstablecimientosTerceros (IdEstablecimiento);
END
GO

IF COL_LENGTH('dbo.ClientesCobros', 'IdTercero') IS NULL
BEGIN
    ALTER TABLE dbo.ClientesCobros ADD IdTercero INT NULL;

    ALTER TABLE dbo.ClientesCobros WITH CHECK ADD CONSTRAINT FK_ClientesCobros_Terceros
        FOREIGN KEY (IdTercero) REFERENCES dbo.ClientesEstablecimientosTerceros (Id);

    CREATE INDEX IX_ClientesCobros_IdTercero ON dbo.ClientesCobros (IdTercero);
END
GO

IF COL_LENGTH('dbo.ClientesCobros', 'EsPagoTercero') IS NULL
BEGIN
    ALTER TABLE dbo.ClientesCobros ADD EsPagoTercero BIT NOT NULL
        CONSTRAINT DF_ClientesCobros_EsPagoTercero DEFAULT (0);
END
GO

IF COL_LENGTH('dbo.ClientesCobros', 'IdTercero') IS NOT NULL
   AND COL_LENGTH('dbo.ClientesCobros', 'EsPagoTercero') IS NOT NULL
BEGIN
    UPDATE dbo.ClientesCobros
    SET EsPagoTercero = 1
    WHERE IdTercero IS NOT NULL AND EsPagoTercero = 0;
END
GO
