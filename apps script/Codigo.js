// OBJETO CON PROVINCIAS Y MUNICIPIOS (Ordenados alfabéticamente)
const DATA_UBICACIONES = {
  "Artemisa": ["Alquízar", "Artemisa", "Bahía Honda", "Bauta", "Caimito", "Candelaria", "Guanajay", "Güira de Melena", "Mariel", "San Antonio de los Baños", "San Cristóbal"],
  "Camagüey": ["Camagüey", "Carlos Manuel de Céspedes", "Esmeralda", "Florida", "Guáimaro", "Jimaguayú", "Minas", "Najasa", "Nuevitas", "Santa Cruz del Sur", "Sibanicú", "Sierra de Cubitas", "Vertientes"],
  "Ciego de Ávila": ["Baraguá", "Bolivia", "Chambas", "Ciego de Ávila", "Ciro Redondo", "Florencia", "Majagua", "Morón", "Primero de Enero", "Venezuela"],
  "Cienfuegos": ["Abreus", "Aguada de Pasajeros", "Cienfuegos", "Cruces", "Cumanayagua", "Lajas", "Palmira", "Rodas"],
  "Granma": ["Bartolomé Masó", "Bayamo", "Buey Arriba", "Campechuela", "Cauto Cristo", "Guisa", "Jiguaní", "Manzanillo", "Media Luna", "Niquero", "Pilón", "Río Cauto", "Yara"],
  "Guantánamo": ["Baracoa", "Caimanera", "El Salvador", "Guantánamo", "Imías", "Maisí", "Manuel Tames", "Niceto Pérez", "San Antonio del Sur", "Yateras"],
  "Holguín": ["Antilla", "Báguanos", "Banes", "Cacocum", "Calixto García", "Cueto", "Frank País", "Gibara", "Holguín", "Mayarí", "Moa", "Rafael Freyre", "Sagua de Tánamo", "Urbano Noris"],
  "Isla de la Juventud": ["Isla de la Juventud"],
  "La Habana": ["Arroyo Naranjo", "Boyeros", "Centro Habana", "Cerro", "Cotorro", "Diez de Octubre", "Guanabacoa", "La Habana del Este", "La Habana Vieja", "La Lisa", "Marianao", "Playa", "Plaza de la Revolución", "Regla", "San Miguel del Padrón"],
  "Las Tunas": ["Amancio", "Colombia", "Jesús Menéndez", "Jobabo", "Las Tunas", "Majibacoa", "Manatí", "Puerto Padre"],
  "Matanzas": ["Calimete", "Cárdenas", "Ciénaga de Zapata", "Colón", "Jagüey Grande", "Jovellanos", "Limonar", "Los Arabos", "Martí", "Matanzas", "Pedro Betancourt", "Perico", "Unión de Reyes"],
  "Mayabeque": ["Batabanó", "Bejucal", "Güines", "Jaruco", "Madruga", "Melena del Sur", "Nueva Paz", "Quivicán", "San José de las Lajas", "San Nicolás", "Santa Cruz del Norte"],
  "Pinar del Río": ["Consolación del Sur", "Guane", "La Palma", "Los Palacios", "Mantua", "Minas de Matahambre", "Pinar del Río", "San Juan y Martínez", "San Luis", "Sandino", "Viñales"],
  "Sancti Spíritus": ["Cabaiguán", "Fomento", "Jatibonico", "La Sierpe", "Sancti Spíritus", "Taguasco", "Trinidad", "Yaguajay"],
  "Santiago de Cuba": ["Contramaestre", "Guamá", "Mella", "Palma Soriano", "San Luis", "Santiago de Cuba", "Segundo Frente", "Songo - La Maya", "Tercer Frente"],
  "Villa Clara": ["Caibarién", "Camajuaní", "Cifuentes", "Corralillo", "Encrucijada", "Manicaragua", "Placetas", "Quemado de Güines", "Ranchuelo", "Remedios", "Sagua la Grande", "Santa Clara", "Santo Domingo"]
};

// DICCIONARIO DE ABREVIATURAS PARA NOMBRES DE HOJA
const ABREVIATURAS = {
  "Artemisa": "ART", "Camagüey": "CMG", "Ciego de Ávila": "CAV", "Cienfuegos": "CFG",
  "Granma": "GRM", "Guantánamo": "GTM", "Holguín": "HLG", "Isla de la Juventud": "ISJ",
  "La Habana": "HAB", "Las Tunas": "LTU", "Matanzas": "MAT", "Mayabeque": "MAY",
  "Pinar del Río": "PRI", "Sancti Spíritus": "SSP", "Santiago de Cuba": "SCU", "Villa Clara": "VCL"
};

function getLocalidades() {
  return DATA_UBICACIONES;
}

// ESTA FUNCION PERMITE RECARGAR LA PÁGINA SIN PANTALLA BLANCA
function getAppUrl() {
  return ScriptApp.getService().getUrl();
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Literaturas Bíblicas - Registro')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function cargarPaginaLogin() {
  return HtmlService.createHtmlOutputFromFile('Index').getContent();
}

function cargarPaginaFormulario() {
  return HtmlService.createHtmlOutputFromFile('Formulario').getContent();
}

function registrarUsuario(user, pass) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Usuarios") || ss.insertSheet("Usuarios");
  if (sheet.getLastRow() === 0) sheet.appendRow(["Usuario", "Contraseña"]);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim().toLowerCase() === user.toString().trim().toLowerCase()) return "EXISTE";
  }
  sheet.appendRow([user, pass]);
  return "OK";
}

function iniciarSesion(user, pass) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Usuarios");
  if (!sheet) return "NO_EXISTE";
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim().toLowerCase() === user.toString().trim().toLowerCase()) {
      return data[i][1].toString() === pass.toString() ? "OK" : "PASS_ERROR";
    }
  } 
  return "NO_EXISTE";
}

function guardarDatos(usuarioActivo, datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nombreProvincia = datos[3];
  const nombreHoja = ABREVIATURAS[nombreProvincia];
  
  if (!nombreHoja) return "Error crítico: Provincia desconocida.";

  const userLower = usuarioActivo.toString().trim().toLowerCase();

  // RECORRER TODAS LAS HOJAS Y LIMPIAR A-L DEL USUARIO + COMPACTAR
  const todasAbrev = Object.values(ABREVIATURAS);
  for (let i = 0; i < todasAbrev.length; i++) {
    let s = ss.getSheetByName(todasAbrev[i]);
    if (s && s.getLastRow() > 1) {
      
      let data = s.getRange("A:L").getValues();

      // FILTRAR: quitar filas del usuario y filas vacías
      let nuevaData = [];
      nuevaData.push(data[0]); // encabezado

      for (let r = 1; r < data.length; r++) {
        let fila = data[r];
        let usuarioFila = fila[0] ? fila[0].toString().trim().toLowerCase() : "";

        if (usuarioFila !== userLower && fila.join("").trim() !== "") {
          nuevaData.push(fila);
        }
      }

      // LIMPIAR A-L COMPLETO (excepto encabezado)
      if (s.getLastRow() > 1) {
        s.getRange(2, 1, s.getLastRow(), 12).clearContent();
      }

      // REESCRIBIR DATOS COMPACTADOS
      if (nuevaData.length > 1) {
        s.getRange(1, 1, nuevaData.length, 12).setValues(nuevaData);
      }
    }
  }

  // CREAR HOJA SI NO EXISTE
  let sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) {
    sheet = ss.insertSheet(nombreHoja);
    sheet.appendRow([
      "Usuario", "Nombre Pastor", "Nombre de la Iglesia", "Denominación", "Provincia", 
      "Municipio", "Lugar", "No. de Teléfono", "Letra Grande", 
      "Letra Pequeña", "Ilustradas", "Cayado del Pastor"
    ]);
    
    let hojas = ss.getSheets();
    let hojasProvincias = hojas.filter(h => todasAbrev.includes(h.getName())).sort((a, b) => a.getName().localeCompare(b.getName()));
    hojasProvincias.forEach((h, index) => {
      ss.setActiveSheet(h);
      ss.moveActiveSheet(index + 2);
    });
  }

  // BUSCAR ÚLTIMA FILA REAL (YA SIN HUECOS)
  const rango = sheet.getRange("A:L").getValues();
  const lastRow = rango.filter(fila => fila.join("").trim() !== "").length;

  // INSERTAR NUEVOS DATOS
  sheet.getRange(lastRow + 1, 1, 1, 1 + datos.length)
    .setValues([[usuarioActivo, ...datos]]);
  
  return "Su solicitud de literatura ha sido enviada correctamente y será atendida como corresponde.";
}

function getDatosExistentes(usuarioActivo) {
  if (!usuarioActivo) return null;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userLower = usuarioActivo.toString().trim().toLowerCase();
  
  const todasAbrev = Object.values(ABREVIATURAS);
  for (let i = 0; i < todasAbrev.length; i++) {
    let sheet = ss.getSheetByName(todasAbrev[i]);
    if (sheet && sheet.getLastRow() >= 2) {
      const data = sheet.getDataRange().getValues();
      for (let r = 1; r < data.length; r++) {
        if (data[r][0] && data[r][0].toString().trim().toLowerCase() === userLower) {
          return {
            pastor: data[r][1] || '',
            iglesia: data[r][2] || '',
            denominacion: data[r][3] || '',
            provincia: data[r][4] || '',
            municipio: data[r][5] || '',
            lugar: data[r][6] || '',
            telefono: data[r][7] || '',
            letraGrande: data[r][8] !== "" ? data[r][8] : '0',
            letraPequena: data[r][9] !== "" ? data[r][9] : '0',
            ilustradas: data[r][10] !== "" ? data[r][10] : '0',
            cayado: data[r][11] !== "" ? data[r][11] : '0'
          };
        }
      }
    }
  }
  return null;
}