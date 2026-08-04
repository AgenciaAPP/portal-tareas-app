const { graphFetch } = require('./graph');

async function obtenerConfig() {
  const siteId = process.env.SITE_ID;
  const listConfig = process.env.LIST_ID_CONFIG;

  const resp = await graphFetch(
    `/sites/${siteId}/lists/${listConfig}/items?expand=fields`
  );

  if (!resp.value || resp.value.length === 0) {
    // Si por algún motivo no hay registro de configuración, usamos valores por defecto
    return {
      correoJefe: process.env.CORREO_JEFE,
      correoRemitente: process.env.CORREO_REMITENTE,
      modoPrueba: false,
      correoPruebas: '',
      diasAviso1: 3,
      diasAviso2: 1,
    };
  }

  const f = resp.value[0].fields;
  return {
    correoJefe: f.CorreoJefe || process.env.CORREO_JEFE,
    correoRemitente: f.CorreoRemitente || process.env.CORREO_REMITENTE,
    modoPrueba: !!f.ModoPrueba,
    correoPruebas: f.CorreoPruebas || '',
    diasAviso1: f.DiasAviso1 ?? 3,
    diasAviso2: f.DiasAviso2 ?? 1,
  };
}

module.exports = { obtenerConfig };
