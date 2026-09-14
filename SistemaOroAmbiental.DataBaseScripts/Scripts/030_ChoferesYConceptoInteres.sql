/*
  030 — Choferes (ABM Transporte + firma) y concepto de interés más largo.
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Choferes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Choferes (
        Id                    INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Nombre                VARCHAR(120) NOT NULL,
        Dni                   VARCHAR(20) NULL,
        FirmaArchivo          VARCHAR(260) NULL,
        Activo                BIT NOT NULL CONSTRAINT DF_Choferes_Activo DEFAULT (1),
        IdUsuarioRegistra     INT NOT NULL,
        FechaUsuarioRegistra  DATETIME NOT NULL,
        IdUsuarioModifica     INT NULL,
        FechaUsuarioModifica  DATETIME NULL,
        CONSTRAINT FK_Choferes_Usuarios_Registra FOREIGN KEY (IdUsuarioRegistra) REFERENCES dbo.Usuarios(Id),
        CONSTRAINT FK_Choferes_Usuarios_Modifica FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios(Id)
    );
END
GO

IF COL_LENGTH('dbo.ClientesCuentaCorrienteMovimientos', 'Concepto') IS NOT NULL
BEGIN
    ALTER TABLE dbo.ClientesCuentaCorrienteMovimientos ALTER COLUMN Concepto VARCHAR(400) NOT NULL;
END
GO

PRINT '030_ChoferesYConceptoInteres.sql ejecutado.';
