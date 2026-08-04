import { graphFetch } from '../../../../lib/graph';
import { obtenerConfig } from '../../../../lib/config';

function diasRestantes(fechaFin) {
  const hoy = new Date();
  const fin = new Date(fechaFin);
  hoy.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);
  const diffMs = fin.getTime() - hoy.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

async function enviarCorreo(config, destinatario, asunto, contenidoHtml) {
  const destinoFinal = config.modoPrueba ? config.correoPruebas : destinatario;
  const mensaje = {
    message: {
      subject: asunto,
      body: { contentType: 'HTML', content: contenidoHtml },
      toRecipients: [{ emailAddress: { address: destinoFinal } }],
    },
  };
  await graphFetch(`/users/${config.correoRemitente}/sendMail`, {
    method: 'POST',
    body: JSON.stringify(mensaje),
  });
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const config = await obtenerConfig();

  const siteId = process.env.SITE_ID;
  const listTareas = process.env.LIST_ID_TAREAS;
  const listContactos = process.env.LIST_ID_CONTACTOS;

  const contactosResp = await graphFetch(
    `/sites/${siteId}/lists/${listContactos}/items?expand=fields`
  );
  const mapaCorreos = {};
  for (const item of contactosResp.value) {
    mapaCorreos[item.fields.Title] = item.fields.Correo;
  }

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

    if (dias === config.diasAviso1 && yaEnviado === '') {
      await enviarCorreo(
        config,
        correoResponsable,
        `Recordatorio: quedan ${config.diasAviso1} días para finalizar "${f.Title}"`,
        `<p>Le quedan <strong>${config.diasAviso1} días</strong> para finalizar la tarea "<strong>${f.Title}</strong>", con fecha límite ${new Date(f.FechaFin).toLocaleDateString('es-CO')}.</p>`
      );
      await graphFetch(`/sites/${siteId}/lists/${listTareas}/items/${item.id}/fields`, {
        method: 'PATCH',
        body: JSON.stringify({ RecordatorioEnviado: 'aviso1' }),
      });
      resultados.push({ tarea: f.Title, accion: `correo aviso1 (${config.diasAviso1}d) enviado` });
    } else if (dias === config.diasAviso2 && yaEnviado === 'aviso1') {
      await enviarCorreo(
        config,
        correoResponsable,
        `Recordatorio: queda ${config.diasAviso2} día(s) para finalizar "${f.Title}"`,
        `<p>Le queda <strong>${config.diasAviso2} día(s)</strong> para finalizar la tarea "<strong>${f.Title}</strong>", con fecha límite ${new Date(f.FechaFin).toLocaleDateString('es-CO')}.</p>`
      );
      await graphFetch(`/sites/${siteId}/lists/${listTareas}/items/${item.id}/fields`, {
        method: 'PATCH',
        body: JSON.stringify({ RecordatorioEnviado: 'aviso2' }),
      });
      resultados.push({ tarea: f.Title, accion: `correo aviso2 (${config.diasAviso2}d) enviado` });
    } else if (dias <= 0) {
      await enviarCorreo(
        config,
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
