/*
  Productos recuperados de entregas — tabla separada de ClientesEntregasProductos.
  ClientesEntregasProductos solo admite TipoMovimiento 1 (Entrega) y 2 (Retiro).
  Ejecutar en la base de datos del sistema.
*/

IF OBJECT_ID(N'dbo.ClientesEntregasProductosRecuperados', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientesEntregasProductosRecuperados (
        Id                    INT IDENTITY(1,1) NOT NULL,
        IdEntrega             INT NOT NULL,
        IdProducto            INT NOT NULL,
        Cantidad              DECIMAL(18, 2) NOT NULL,
        PrecioVenta           DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_PrecioVenta DEFAULT (0),
        CostoUnitario         DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_CostoUnitario DEFAULT (0),
        PorcDescuento         DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_PorcDescuento DEFAULT (0),
        DescUnitario          DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_DescUnitario DEFAULT (0),
        DescTotal             DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_DescTotal DEFAULT (0),
        PrecioVentacDesc      DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_PrecioVentacDesc DEFAULT (0),
        SubtotalcDesc         DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_SubtotalcDesc DEFAULT (0),
        PorcIVA               DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_PorcIVA DEFAULT (0),
        IVAUnitario           DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_IVAUnitario DEFAULT (0),
        TotalIVA              DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_TotalIVA DEFAULT (0),
        PrecioVentaFinal      DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_PrecioVentaFinal DEFAULT (0),
        SubtotalFinal         DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_SubtotalFinal DEFAULT (0),
        SubtotalCosto         DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_SubtotalCosto DEFAULT (0),
        Ganancia              DECIMAL(18, 2) NOT NULL CONSTRAINT DF_CEPR_Ganancia DEFAULT (0),
        IdUsuarioRegistra     INT NOT NULL,
        FechaUsuarioRegistra  DATETIME NOT NULL,
        IdUsuarioModifica     INT NULL,
        FechaUsuarioModifica  DATETIME NULL,
        CONSTRAINT PK_ClientesEntregasProductosRecuperados PRIMARY KEY (Id),
        CONSTRAINT FK_CEPR_ClientesEntregas FOREIGN KEY (IdEntrega)
            REFERENCES dbo.ClientesEntregas (Id),
        CONSTRAINT FK_CEPR_Productos FOREIGN KEY (IdProducto)
            REFERENCES dbo.Productos (Id),
        CONSTRAINT FK_CEPR_Usuarios_Registra FOREIGN KEY (IdUsuarioRegistra)
            REFERENCES dbo.Usuarios (Id),
        CONSTRAINT FK_CEPR_Usuarios_Modifica FOREIGN KEY (IdUsuarioModifica)
            REFERENCES dbo.Usuarios (Id),
        CONSTRAINT UQ_CEPR_Entrega_Producto UNIQUE (IdEntrega, IdProducto)
    );

    CREATE INDEX IX_CEPR_IdEntrega ON dbo.ClientesEntregasProductosRecuperados (IdEntrega);
    CREATE INDEX IX_CEPR_IdProducto ON dbo.ClientesEntregasProductosRecuperados (IdProducto);
END
GO

/* Migrar líneas que se guardaron erróneamente como TipoMovimiento = 3 en ClientesEntregasProductos */
IF COL_LENGTH('dbo.ClientesEntregasProductos', 'TipoMovimiento') IS NOT NULL
BEGIN
    INSERT INTO dbo.ClientesEntregasProductosRecuperados (
        IdEntrega, IdProducto, Cantidad, PrecioVenta, CostoUnitario, PorcDescuento,
        DescUnitario, DescTotal, PrecioVentacDesc, SubtotalcDesc, PorcIVA, IVAUnitario,
        TotalIVA, PrecioVentaFinal, SubtotalFinal, SubtotalCosto, Ganancia,
        IdUsuarioRegistra, FechaUsuarioRegistra, IdUsuarioModifica, FechaUsuarioModifica
    )
    SELECT
        p.IdEntrega, p.IdProducto, p.Cantidad, p.PrecioVenta, p.CostoUnitario, p.PorcDescuento,
        p.DescUnitario, p.DescTotal, p.PrecioVentacDesc, p.SubtotalcDesc, p.PorcIVA, p.IVAUnitario,
        p.TotalIVA, p.PrecioVentaFinal, p.SubtotalFinal, p.SubtotalCosto, p.Ganancia,
        p.IdUsuarioRegistra, p.FechaUsuarioRegistra, p.IdUsuarioModifica, p.FechaUsuarioModifica
    FROM dbo.ClientesEntregasProductos p
    WHERE p.TipoMovimiento = 3
      AND NOT EXISTS (
          SELECT 1 FROM dbo.ClientesEntregasProductosRecuperados r
          WHERE r.IdEntrega = p.IdEntrega AND r.IdProducto = p.IdProducto
      );

    DELETE FROM dbo.ClientesEntregasProductos WHERE TipoMovimiento = 3;
END
GO

/* Asegurar que operación solo use 1 y 2 */
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_ClientesEntregasProductos_TipoMovimiento'
)
BEGIN
    ALTER TABLE dbo.ClientesEntregasProductos
    ADD CONSTRAINT CK_ClientesEntregasProductos_TipoMovimiento
        CHECK (TipoMovimiento IN (1, 2));
END
GO
