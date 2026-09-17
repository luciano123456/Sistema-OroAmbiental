-- Auditoría de eliminaciones (simple y en cascada).
-- Ejecutar en la base del sistema.

IF OBJECT_ID('dbo.EliminacionesLog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EliminacionesLog (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EliminacionesLog PRIMARY KEY,
        Fecha DATETIME2 NOT NULL CONSTRAINT DF_EliminacionesLog_Fecha DEFAULT (SYSDATETIME()),
        IdUsuario INT NULL,
        UsuarioNombre NVARCHAR(100) NULL,
        Entidad NVARCHAR(120) NOT NULL,
        IdEntidad INT NULL,
        NombreEntidad NVARCHAR(250) NULL,
        Tipo NVARCHAR(20) NOT NULL,
        Detalle NVARCHAR(MAX) NULL,
        Ip NVARCHAR(64) NULL
    );

    CREATE INDEX IX_EliminacionesLog_Fecha
        ON dbo.EliminacionesLog (Fecha DESC);

    CREATE INDEX IX_EliminacionesLog_Entidad
        ON dbo.EliminacionesLog (Entidad, IdEntidad);
END
GO
