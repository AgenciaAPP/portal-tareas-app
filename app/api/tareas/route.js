import { graphFetch } from '../../../lib/graph';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return Response.json({ error: 'Token no proporcionado' }, { status: 400 });
  }

  const siteId = process.env.SITE_ID;
  const listContactos = process.env.LIST_ID_CONTACTOS;
  const listTareas = process.env.LIST_ID_TAREAS;

  // 1. Buscar el contacto por token
  const filtroContacto = encodeURIComponent(`fields/Token eq '${token}'`);
  const contactoResp = await graphFetch(
    `/sites/${siteId}/lists/${listContactos}/items?expand=fields&$filter=${filtroContacto}`
  );

  if (!contactoResp.value || contactoResp.value.length === 0) {
    return Response.json({ error: 'Token inválido' }, { status: 404 });
  }

  const contacto = contactoResp.value[0].fields;
  const nombre = contacto.Title;

  // 2. Buscar todas las tareas de esa persona
  const filtroTareas = encodeURIComponent(`fields/Responsable eq '${nombre}'`);
  const tareasResp = await graphFetch(
    `/sites/${siteId}/lists/${listTareas}/items?expand=fields&$filter=${filtroTareas}&$orderby=fields/FechaFin asc`
  );

  const tareas = tareasResp.value.map((item) => ({
    id: item.id,
    tarea: item.fields.Title,
    observacion: item.fields.Observacion || '',
    fechaFin: item.fields.FechaFin,
    estado: item.fields.Estado,
    fechaFinalizacion: item.fields.FechaFinalizacion || null,
    comentarioFinalizacion: item.fields.ComentarioFinalizacion || '',
  }));

  return Response.json({
    nombre,
    correo: contacto.Correo,
    tareas,
  });
}
