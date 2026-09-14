let gridChoferes;
let modalChofer;
let firmaPad = null;
let firmaDirty = false;
let quitarFirma = false;

const columnConfigChoferes = [
    { index: 2, filterType: "text" },
    { index: 3, filterType: "text" }
];

registrarFiltrosGrilla("grd_Choferes", columnConfigChoferes);

$(document).ready(() => {
    modalChofer = new bootstrap.Modal(document.getElementById("modalEdicionChofer"));
    initFirmaPad();
    listaChoferes();

    $("#chkActivoChofer").on("change", function () {
        $("#lblActivoChofer").text(this.checked ? "Activo" : "Inactivo");
    });
});

function authChf() {
    return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
}

async function listaChoferes() {
    const paginaActual = gridChoferes != null ? gridChoferes.page() : 0;
    const response = await fetch("/Choferes/Lista", { headers: authChf() });
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    await configurarDataTableChoferes(data);
    if (paginaActual > 0) gridChoferes.page(paginaActual).draw("page");
}

async function configurarDataTableChoferes(data) {
    if (!gridChoferes) {
        gridChoferes = $("#grd_Choferes").DataTable({
            data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            autoWidth: false,
            columnDefs: typeof columnDefsGridLista === "function" ? columnDefsGridLista() : [],
            scrollX: true,
            scrollCollapse: true,
            columns: [
                columnaGridAcciones({
                    ver: "verChofer",
                    editar: "editarChofer",
                    eliminar: "eliminarChofer"
                }, "Choferes"),
                columnaGridId(),
                { data: "Nombre" },
                { data: "Dni", defaultContent: "" },
                {
                    data: "FirmaUrl",
                    defaultContent: "",
                    orderable: false,
                    render: function (v, type, row) {
                        const url = v || row.FirmaUrl || "";
                        if (!url && !row.FirmaArchivo) return "—";
                        if (type === "export" || type === "print") return "Sí";
                        const src = url || `${row.FirmaArchivo}?v=${Date.now()}`;
                        return `<img class="chf-firma-thumb" src="${src}" alt="Firma" />`;
                    }
                },
                typeof columnaGridActivo === "function" ? columnaGridActivo("Choferes") : { data: "Activo" }
            ],
            createdRow: function (row, rowData) {
                if (typeof createdRowEstiloActivoGrilla === "function") {
                    createdRowEstiloActivoGrilla(row, rowData);
                }
            },
            dom: "Bfrtip",
            buttons: getBotonesExportacion(gridChoferes, "Choferes"),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                await initFiltrosGrillaListaEnInitComplete(api, "#grd_Choferes", columnConfigChoferes, {}, {
                    afterFilters: () => {
                        configurarMenuColumnasDataTable(gridChoferes, "#configColumnasMenu", "Choferes_Columnas", "#grd_Choferes");
                        $("#kpiCantChoferes").text(data.length);
                    }
                });
            }
        });
    } else {
        gridChoferes.clear().rows.add(data).draw();
        $("#kpiCantChoferes").text(Array.isArray(data) ? data.length : 0);
    }
}

function initFirmaPad() {
    const canvas = document.getElementById("canvasFirmaChofer");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const pos = (ev) => {
        const r = canvas.getBoundingClientRect();
        const x = (("clientX" in ev ? ev.clientX : ev.touches[0].clientX) - r.left) * (canvas.width / r.width);
        const y = (("clientY" in ev ? ev.clientY : ev.touches[0].clientY) - r.top) * (canvas.height / r.height);
        return { x, y };
    };

    let drawing = false;
    const start = (ev) => {
        ev.preventDefault();
        drawing = true;
        firmaDirty = true;
        quitarFirma = false;
        const p = pos(ev);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    };
    const move = (ev) => {
        if (!drawing) return;
        ev.preventDefault();
        const p = pos(ev);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    };
    const end = () => { drawing = false; };

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointerleave", end);
    canvas.addEventListener("pointercancel", end);

    $("#btnLimpiarFirmaChofer").on("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        firmaDirty = false;
    });
    $("#btnQuitarFirmaChofer").on("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        firmaDirty = false;
        quitarFirma = true;
    });
    $("#fileFirmaChofer").on("change", function () {
        const file = this.files && this.files[0];
        this.value = "";
        if (!file) return;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
            firmaDirty = true;
            quitarFirma = false;
        };
        img.src = URL.createObjectURL(file);
    });

    firmaPad = { canvas, ctx };
}

function canvasVacio() {
    const canvas = firmaPad?.canvas;
    if (!canvas) return true;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return false;
    }
    return true;
}

function nuevoChofer() {
    $("#txtIdChofer").val("0");
    $("#txtNombreChofer").val("");
    $("#txtDniChofer").val("");
    $("#chkActivoChofer").prop("checked", true).trigger("change");
    $("#modalEdicionChoferLabel").text("Nuevo chofer");
    $("#btnGuardarChofer").text("Registrar");
    firmaPad?.ctx.clearRect(0, 0, firmaPad.canvas.width, firmaPad.canvas.height);
    firmaDirty = false;
    quitarFirma = false;
    modalChofer.show();
}

function verChofer(id) { editarChofer(id); }

async function editarChofer(id) {
    const response = await fetch(`/Choferes/EditarInfo?id=${id}`, { headers: authChf() });
    if (!response.ok) {
        errorModal("No se pudo cargar el chofer.");
        return;
    }
    const modelo = await response.json();
    $("#txtIdChofer").val(modelo.Id);
    $("#txtNombreChofer").val(modelo.Nombre || "");
    $("#txtDniChofer").val(modelo.Dni || "");
    $("#chkActivoChofer").prop("checked", modelo.Activo !== false).trigger("change");
    $("#modalEdicionChoferLabel").text("Editar chofer");
    $("#btnGuardarChofer").text("Guardar");
    firmaPad?.ctx.clearRect(0, 0, firmaPad.canvas.width, firmaPad.canvas.height);
    firmaDirty = false;
    quitarFirma = false;
    if (modelo.FirmaUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = firmaPad.canvas;
            const ctx = firmaPad.ctx;
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        };
        img.src = modelo.FirmaUrl;
    }
    modalChofer.show();
}

async function guardarChofer() {
    const nombre = ($("#txtNombreChofer").val() || "").trim();
    if (!nombre) {
        errorModal("El nombre es obligatorio.");
        return;
    }
    const id = parseInt($("#txtIdChofer").val(), 10) || 0;
    const payload = {
        Id: id,
        Nombre: nombre,
        Dni: ($("#txtDniChofer").val() || "").trim(),
        Activo: $("#chkActivoChofer").is(":checked"),
        QuitarFirma: quitarFirma,
        FirmaBase64: (!quitarFirma && firmaDirty && !canvasVacio()) ? firmaPad.canvas.toDataURL("image/png") : null
    };
    const url = id > 0 ? "/Choferes/Actualizar" : "/Choferes/Insertar";
    const method = id > 0 ? "PUT" : "POST";
    const response = await fetch(url, { method, headers: authChf(), body: JSON.stringify(payload) });
    const data = await response.json();
    if (!data?.valor) {
        errorModal(data?.mensaje || "No se pudo guardar.");
        return;
    }
    modalChofer.hide();
    if (typeof exitoModal === "function") exitoModal(data.mensaje || "Chofer guardado.");
    await listaChoferes();
}

async function eliminarChofer(id) {
    const ok = typeof confirmarModal === "function"
        ? await confirmarModal("¿Eliminar este chofer?")
        : confirm("¿Eliminar este chofer?");
    if (!ok) return;
    const response = await fetch(`/Choferes/Eliminar?id=${id}`, { method: "DELETE", headers: authChf() });
    const data = await response.json();
    if (!data?.valor) {
        errorModal(data?.mensaje || "No se pudo eliminar.");
        return;
    }
    if (typeof exitoModal === "function") exitoModal(data.mensaje || "Chofer eliminado.");
    await listaChoferes();
}
