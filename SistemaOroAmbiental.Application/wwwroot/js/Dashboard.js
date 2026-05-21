document.addEventListener("DOMContentLoaded", () => {
    renderUser();
    renderDashboard();
});

/* =========================
   USER
========================= */

function renderUser() {

    const user = JSON.parse(localStorage.getItem("userSession"));
    if (!user) return;

    const nombre = `${user.Nombre || ""} ${user.Apellido || ""}`.trim();

    document.getElementById("dashboardUser").innerText = nombre;
}

/* =========================
   LOGOUT (MISMO ESTILO TUYO)
========================= */

function logout() {

    localStorage.removeItem("userSession");

    // si usas token
    if (window.token) token = null;

    window.location.href = "/Login";
}

/* =========================
   DASHBOARD
========================= */

function renderDashboard() {

    Permisos.init();

    const cont = document.getElementById("dashboardModulos");
    cont.innerHTML = "";

    const user = JSON.parse(localStorage.getItem("userSession"));

    // 🔴 1. NO HAY USER
    if (!user) {
        window.location.href = "/Login";
        return;
    }

    // 🔴 2. USER SIN PERMISOS (NULL / UNDEFINED)
    if (!user.Permisos) {
        renderSinPermisos(cont);
        return;
    }

    const modulos = user.Permisos.filter(m =>
        (m.Permisos || []).some(p =>
            p.Codigo?.toLowerCase() === "ver" && p.Activo
        )
    );

    // 🔴 3. SIN ACCESO A NADA
    if (modulos.length === 0) {
        renderSinPermisos(cont);
        return;
    }

    // 🟢 NORMAL
    modulos.forEach(m => {

        const nombre = m.Modulo || m.CodigoModulo || "Modulo";

        cont.innerHTML += `
            <div class="dash-card" onclick="goTo('${obtenerUrlModulo(nombre)}')">

                <div class="dash-icon" style="background:${colorModulo(nombre)}">
                    <i class="fa ${iconoModulo(nombre)}"></i>
                </div>

                <div class="dash-title">
                    ${nombre}
                </div>

            </div>
        `;
    });
}

function renderSinPermisos(cont) {

    cont.innerHTML = `
        <div class="dash-empty-pro">

            <div class="dash-empty-card">

                <div class="dash-empty-icon-pro">
                    <i class="fa fa-lock"></i>
                </div>

                <div class="dash-empty-title-pro">
                    Acceso restringido
                </div>

                <div class="dash-empty-text-pro">
                    No tenés permisos para acceder a ningún módulo.<br>
                    Si creés que esto es un error, hablá con un administrador.
                </div>

                <button class="dash-empty-btn" onclick="location.reload()">
                    Reintentar
                </button>

            </div>

        </div>
    `;
}

/* =========================
   NAV
========================= */

function goTo(url) {
    window.location.href = url;
}

/* =========================
   URLS
========================= */

function obtenerUrlModulo(nombre) {

    const n = nombre.toLowerCase();

    const map = {
        "personal": "/Personal",
        "personal cc": "/PersonalCuentaCorriente",
        "personal sueldos": "/PersonalSueldos",

        "clientes": "/Clientes",
        "clientes cc": "/ClientesCuentaCorriente",

        "artistas": "/Artistas",
        "artistas cc": "/ArtistasCuentaCorriente",

        "ventas": "/Ventas",
        "cajas": "/Caja",
        "monedas": "/PaisesMoneda",
        "tareas": "/Tareas",
        "gastos": "/Gastos",
        "usuarios": "/Usuarios",
        "ubicaciones": "/Ubicaciones",

        "productoras": "/Productoras"
    };

    return map[n] || "/";
}

/* =========================
   ICONOS
========================= */

function iconoModulo(nombre) {

    const n = nombre.toLowerCase();

    const map = {
        "personal": "fa-users",
        "personal cc": "fa-address-card",
        "personal sueldos": "fa-money",

        "clientes": "fa-user",
        "clientes cc": "fa-address-book",

        "artistas": "fa-music",
        "artistas cc": "fa-id-card",

        "ventas": "fa-shopping-cart",
        "cajas": "fa-cash-register",
        "monedas": "fa-dollar-sign",
        "tareas": "fa-tasks",
        "gastos": "fa-credit-card",
        "usuarios": "fa-lock",
        "ubicaciones": "fa-map-marker-alt",
        "productoras": "fa-building"
    };

    return map[n] || "fa-cube";
}

/* =========================
   COLORES
========================= */

function colorModulo(nombre) {

    const n = nombre.toLowerCase();

    const map = {
        "personal": "#3498db",
        "clientes": "#2ecc71",
        "artistas": "#9b59b6",
        "ventas": "#e67e22",
        "cajas": "#1abc9c",
        "monedas": "#f1c40f",
        "tareas": "#34495e",
        "gastos": "#e74c3c",
        "usuarios": "#7f8c8d",
        "ubicaciones": "#16a085",
        "productoras": "#2980b9"
    };

    return map[n] || "#6c757d";
}