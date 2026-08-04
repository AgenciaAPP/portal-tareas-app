import { graphFetch } from '../../../lib/graph';

function validarPassword(request) {
  const authHeader = request.headers.get('x-admin-password');
  return authHeader === process.env.ADMIN_PASSWORD;
}

async function obtenerItemConfig() {
  const siteId = process.env.SITE_ID;
  const listConfig = process.env.LIST_ID_CONFIG;
  const resp = await graphFetch(
    `/sites/${siteId}/lists/${listConfig}/items?expand=fields`
  );
  if (!resp.value || resp.value.length === 0) {
    throw new Error('No hay ningún registro de configuración en la lista');
  }
  return resp.value[0]; // se asume un único registro
}

export async function GET(request) {
  if (!validarPassword(request)) {
    return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const item = await obtenerItemConfig();
  const f = item.fields;

  return Response.json({
    correoJefe: f.CorreoJefe || '',
    correoRemitente: f.CorreoRemitente || '',
    modoPrueba: !!f.ModoPrueba,
    correoPruebas: f.CorreoPruebas || '',
    diasAviso1: f.DiasAviso1 ?? 3,
    diasAviso2: f.DiasAviso2 ?? 1,
  });
}

export async function PATCH(request) {
  if (!validarPassword(request)) {
    return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const body = await request.json();
  const item = await obtenerItemConfig();

  const siteId = process.env.SITE_ID;
  const listConfig = process.env.LIST_ID_CONFIG;

  await graphFetch(
    `/sites/${siteId}/lists/${listConfig}/items/${item.id}/fields`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        CorreoJefe: body.correoJefe,
        CorreoRemitente: body.correoRemitente,
        ModoPrueba: body.modoPrueba,
        CorreoPruebas: body.correoPruebas,
        DiasAviso1: body.diasAviso1,
        DiasAviso2: body.diasAviso2,
      }),
    }
  );

  return Response.json({ success: true });
}
