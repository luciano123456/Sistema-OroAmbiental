-- Tabla de contactos de proveedores (misma estructura que ClientesContactos)
-- Ejecutar en la base Sistema Oro Ambiental antes de usar el módulo.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'ProveedoresContactos' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.ProveedoresContactos (
        Id                      INT IDENTITY(1,1) NOT NULL,
        IdProveedor             INT NOT NULL,
        Nombre                  VARCHAR(100) NOT NULL,
        Puesto                  VARCHAR(100) NULL,
        Telefono                VARCHAR(50) NULL,
        TelefonoAlt             VARCHAR(50) NULL,
        Email                   VARCHAR(100) NULL,
        IdUsuarioRegistra       INT NOT NULL,
        FechaUsuarioRegistra    DATETIME NOT NULL,
        IdUsuarioModifica       INT NULL,
        FechaUsuarioModifica    DATETIME NULL,
        CONSTRAINT PK_ProveedoresContactos PRIMARY KEY (Id),
        CONSTRAINT FK_ProveedoresContactos_Proveedores
            FOREIGN KEY (IdProveedor) REFERENCES dbo.Proveedores (Id),
        CONSTRAINT FK_ProveedoresContactosUsuariosIdUsuarioRegistra
            FOREIGN KEY (IdUsuarioRegistra) REFERENCES dbo.Usuarios (Id),
        CONSTRAINT FK_ProveedoresContactosUsuariosIdUsuarioModifica
            FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios (Id)
    );

    CREATE INDEX IX_ProveedoresContactos_IdProveedor
        ON dbo.ProveedoresContactos (IdProveedor);
END
GO
