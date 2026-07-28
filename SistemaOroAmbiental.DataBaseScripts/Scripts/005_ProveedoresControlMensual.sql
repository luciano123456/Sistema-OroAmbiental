-- Control mensual por proveedor (observaciones / sin compra)
IF OBJECT_ID(N'dbo.ProveedoresControlMensual', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProveedoresControlMensual (
        Id INT IDENTITY(1,1) NOT NULL,
        IdProveedor INT NOT NULL,
        Anio INT NOT NULL,
        Mes INT NOT NULL,
        SinCompra BIT NOT NULL CONSTRAINT DF_ProveedoresControlMensual_SinCompra DEFAULT (0),
        Observaciones VARCHAR(500) NULL,
        IdUsuarioRegistra INT NOT NULL,
        FechaUsuarioRegistra DATETIME NOT NULL,
        IdUsuarioModifica INT NULL,
        FechaUsuarioModifica DATETIME NULL,
        CONSTRAINT PK_ProveedoresControlMensual PRIMARY KEY (Id),
        CONSTRAINT FK_ProveedoresControlMensual_Proveedores FOREIGN KEY (IdProveedor) REFERENCES dbo.Proveedores (Id),
        CONSTRAINT FK_ProveedoresControlMensual_UsuReg FOREIGN KEY (IdUsuarioRegistra) REFERENCES dbo.Usuarios (Id),
        CONSTRAINT FK_ProveedoresControlMensual_UsuMod FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios (Id)
    );

    CREATE UNIQUE INDEX UX_ProveedoresControlMensual_Prov_Anio_Mes
        ON dbo.ProveedoresControlMensual (IdProveedor, Anio, Mes);
END
GO
