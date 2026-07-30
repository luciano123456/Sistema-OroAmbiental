/*
  006 — Domicilio desglosado (TXT planta) + Tipo de generador.
  Calle (40), Número (13) según archivo de intercambio.
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.ClientesTiposGenerador', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientesTiposGenerador (
        Id      INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Codigo  VARCHAR(2) NOT NULL,
        Nombre  VARCHAR(100) NOT NULL,
        CONSTRAINT UQ_ClientesTiposGenerador_Codigo UNIQUE (Codigo)
    );
END;

IF COL_LENGTH('dbo.Clientes', 'Calle') IS NULL
    ALTER TABLE dbo.Clientes ADD Calle VARCHAR(100) NULL;

IF COL_LENGTH('dbo.Clientes', 'Numero') IS NULL
    ALTER TABLE dbo.Clientes ADD Numero VARCHAR(20) NULL;

IF COL_LENGTH('dbo.Clientes', 'PisoDepartamento') IS NULL
    ALTER TABLE dbo.Clientes ADD PisoDepartamento VARCHAR(50) NULL;

IF COL_LENGTH('dbo.Clientes', 'IdTipoGenerador') IS NULL
    ALTER TABLE dbo.Clientes ADD IdTipoGenerador INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Clientes_ClientesTiposGenerador')
    ALTER TABLE dbo.Clientes ADD CONSTRAINT FK_Clientes_ClientesTiposGenerador
        FOREIGN KEY (IdTipoGenerador) REFERENCES dbo.ClientesTiposGenerador(Id);

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'Calle') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD Calle VARCHAR(100) NULL;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'Numero') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD Numero VARCHAR(20) NULL;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'PisoDepartamento') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD PisoDepartamento VARCHAR(50) NULL;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'IdTipoGenerador') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD IdTipoGenerador INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ClientesEstablecimientos_ClientesTiposGenerador')
    ALTER TABLE dbo.ClientesEstablecimientos ADD CONSTRAINT FK_ClientesEstablecimientos_ClientesTiposGenerador
        FOREIGN KEY (IdTipoGenerador) REFERENCES dbo.ClientesTiposGenerador(Id);

GO

/* Migrar domicilio legado a Calle (TXT usa calle en campo de 40).
   Debe ir en batch aparte: SQL Server compila todo el batch antes de ejecutar ALTER TABLE. */
IF COL_LENGTH('dbo.Clientes', 'Calle') IS NOT NULL
BEGIN
    UPDATE dbo.Clientes
    SET Calle = LTRIM(RTRIM(Domicilio))
    WHERE Calle IS NULL AND Domicilio IS NOT NULL AND LTRIM(RTRIM(Domicilio)) <> '';
END;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'Calle') IS NOT NULL
BEGIN
    UPDATE dbo.ClientesEstablecimientos
    SET Calle = LTRIM(RTRIM(Domicilio))
    WHERE Calle IS NULL AND Domicilio IS NOT NULL AND LTRIM(RTRIM(Domicilio)) <> '';
END;

GO

PRINT '006_ClientesDomicilioTipoGenerador.sql ejecutado correctamente.';
