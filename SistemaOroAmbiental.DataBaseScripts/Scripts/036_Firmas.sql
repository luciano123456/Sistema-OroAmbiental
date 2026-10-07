/*
  036 — Firmas de la empresa (ABM + sello en contratos Word).
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Firmas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Firmas (
        Id                    INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Nombre                VARCHAR(120) NOT NULL,
        FirmaArchivo          VARCHAR(260) NULL,
        Activo                BIT NOT NULL CONSTRAINT DF_Firmas_Activo DEFAULT (1),
        IdUsuarioRegistra     INT NOT NULL,
        FechaUsuarioRegistra  DATETIME NOT NULL,
        IdUsuarioModifica     INT NULL,
        FechaUsuarioModifica  DATETIME NULL,
        CONSTRAINT FK_Firmas_Usuarios_Registra FOREIGN KEY (IdUsuarioRegistra) REFERENCES dbo.Usuarios(Id),
        CONSTRAINT FK_Firmas_Usuarios_Modifica FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios(Id)
    );
END
GO

PRINT '036_Firmas.sql ejecutado.';
