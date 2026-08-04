import { graphFetch } from '../../../../lib/graph';

function diasRestantes(fechaFin) {
  const hoy = new Date();
  const fin = new Date(fechaFin);
  hoy.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);
  const diffMs = fin.getTime() - hoy.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

async function enviarCorreo(destinatario, asunto, contenidoHtml) {
  const destinoFinal = process.env.TEST_EMAIL_OVERRIDE || destinatario;
  const mensaje = {
    message: {
      subject: asunto,
      body: { contentType: 'HTML', content: contenidoHtml },
      toRecipients: [{ emailAddress: { address: destinoFinal } }],
    },
  };
  await graphFetch(`/users/${process.env.CORREO_REMITENTE}/sendMail`, {
    method: 'POST',
    body: JSON.stringify(mensaje),
  });
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const siteId = process.env.SITE_ID;
  const listTareas = process.env.LIST_ID_TAREAS;
  const listContactos = process.env.LIST_ID_CONTACTOS;

  // 1. Traer todos los contactos (para armar el mapa Nombre -> Correo)
  const contactosResp = await graphFetch(
    `/sites/${siteId}/lists/${listContactos}/items?expand=fields`
  );
  const mapaCorreos = {};
  for (const item of contactosResp.value) {
    mapaCorreos[item.fields.Title] = item.fields.Correo;
  }

  // 2. Traer las tareas en proceso
  const filtro = encodeURIComponent(`fields/Estado eq 'En proceso'`);
  const tareasResp = await graphFetch(
    `/sites/${siteId}/lists/${listTareas}/items?expand=fields&$filter=${filtro}`
  );

  const resultados = [];

  for (const item of tareasResp.value) {
    const f = item.fields;
    const dias = diasRestantes(f.FechaFin);
    const correoResponsable = mapaCorreos[f.Responsable];
    const yaEnviado = f.RecordatorioEnviado || '';

    if (!correoResponsable) {
      resultados.push({ tarea: f.Title, omitida: true, motivo: 'sin correo asociado' });
      continue;
    }

    // Caso: faltan 3 días
    if (dias === 3 && yaEnviado === '') {
      await enviarCorreo(
        correoResponsable,
        `Recordatorio: quedan 3 días para finalizar "${f.Title}"`,
        `<p>Le quedan <strong>3 días</strong> para finalizar la tarea "<strong>${f.Title}</strong>", con fecha límite ${new Date(f.FechaFin).toLocaleDateString('es-CO')}.</p>`
      );
      await graphFetch(`/sites/${siteId}/lists/${listTareas}/items/${item.id}/fields`, {
        method: 'PATCH',
        body: JSON.stringify({ RecordatorioEnviado: '3dias' }),
      });
      resultados.push({ tarea: f.Title, accion: 'correo 3 dias enviado' });
    }

    // Caso: falta 1 día
    else if (dias === 1 && yaEnviado === '3dias') {
      await enviarCorreo(
        correoResponsable,
        `Recordatorio: queda 1 día para finalizar "${f.Title}"`,
        `<p>Le queda <strong>1 día</strong> para finalizar la tarea "<strong>${f.Title}</strong>", con fecha límite ${new Date(f.FechaFin).toLocaleDateString('es-CO')}.</p>`
      );
      await graphFetch(`/sites/${siteId}/lists/${listTareas}/items/${item.id}/fields`, {
        method: 'PATCH',
        body: JSON.stringify({ RecordatorioEnviado: '1dia' }),
      });
      resultados.push({ tarea: f.Title, accion: 'correo 1 dia enviado' });
    }

    // Caso: venció
    else if (dias <= 0) {
      await enviarCorreo(
        correoResponsable,
        `Tarea vencida: "${f.Title}"`,
        `<p>La tarea "<strong>${f.Title}</strong>" venció el ${new Date(f.FechaFin).toLocaleDateString('es-CO')} y sigue sin finalizarse.</p>`
      );
      await graphFetch(`/sites/${siteId}/lists/${listTareas}/items/${item.id}/fields`, {
        method: 'PATCH',
        body: JSON.stringify({ Estado: 'Atrasado', RecordatorioEnviado: 'vencido' }),
      });
      resultados.push({ tarea: f.Title, accion: 'marcada como Atrasado, correo enviado' });
    }
  }

  return Response.json({ ejecutado: true, resultados });
}
