import { graphFetch } from '../../../lib/graph';

export async function POST(request) {
  const formData = await request.formData();

  const itemId = formData.get('itemId');
  const nombre = formData.get('nombre');
  const tarea = formData.get('tarea');
  const comentario = formData.get('comentario') || '';
  const archivo = formData.get('archivo'); // puede venir vacío

  if (!itemId || !nombre || !tarea) {
    return Response.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const siteId = process.env.SITE_ID;
  const listTareas = process.env.LIST_ID_TAREAS;
  const fechaHoy = new Date().toISOString();

  // 1. Actualizar el elemento en SharePoint
  await graphFetch(
    `/sites/${siteId}/lists/${listTareas}/items/${itemId}/fields`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        Estado: 'Finalizado',
        FechaFinalizacion: fechaHoy,
        ComentarioFinalizacion: comentario,
      }),
    }
  );

  // 2. Preparar el correo
  const attachments = [];
  if (archivo && archivo.size > 0) {
    const bytes = await archivo.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    attachments.push({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: archivo.name,
      contentType: archivo.type || 'application/octet-stream',
      contentBytes: base64,
    });
  }

  const mensaje = {
    message: {
      subject: `Tarea finalizada: ${tarea}`,
      body: {
        contentType: 'HTML',
        content: `
          <p><strong>${nombre}</strong> ha marcado como <strong>finalizada</strong> la siguiente tarea:</p>
          <p><strong>Tarea:</strong> ${tarea}</p>
          <p><strong>Comentario:</strong> ${comentario || '(sin comentario)'}</p>
          <p><strong>Fecha de finalización:</strong> ${new Date(fechaHoy).toLocaleDateString('es-CO')}</p>
        `,
      },
      toRecipients: [
        { emailAddress: { address: process.env.CORREO_JEFE } },
      ],
      attachments,
    },
  };

  await graphFetch(
    `/users/${process.env.CORREO_REMITENTE}/sendMail`,
    {
      method: 'POST',
      body: JSON.stringify(mensaje),
    }
  );

  return Response.json({ success: true });
}
