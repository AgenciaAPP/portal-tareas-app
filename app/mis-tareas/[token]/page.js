'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const URL_POWERBI =
  'https://app.powerbi.com/view?r=eyJrIjoiMDFiMWRkOTctMWZlYS00NjhhLWJmYzEtYjY1YmIzMWIzNmRjIiwidCI6ImZlNWQ1MzNlLWZiZmUtNDMxNy05ZDJlLWVlMjVhYzU0NmFiMyIsImMiOjR9&pageName=e685e786a004ac09803c';

export default function MisTareasPage() {
  const { token } = useParams();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [tareaActiva, setTareaActiva] = useState(null);
  const [comentario, setComentario] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`/api/tareas?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setDatos(data);
        }
        setCargando(false);
      })
      .catch(() => {
        setError('Ocurrió un error al cargar las tareas');
        setCargando(false);
      });
  }, [token]);

  async function finalizarTarea(e) {
    e.preventDefault();

    if (archivo && archivo.size > 3 * 1024 * 1024) {
      alert('El archivo adjunto no debe superar los 3 MB. Por favor selecciona uno más liviano.');
      return;
    }

    setEnviando(true);

    const formData = new FormData();
    formData.append('itemId', tareaActiva.id);
    formData.append('nombre', datos.nombre);
    formData.append('tarea', tareaActiva.tarea);
    formData.append('comentario', comentario);
    if (archivo) formData.append('archivo', archivo);

    const res = await fetch('/api/finalizar', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      setDatos((prev) => ({
        ...prev,
        tareas: prev.tareas.map((t) =>
          t.id === tareaActiva.id
            ? { ...t, estado: 'Finalizado', comentarioFinalizacion: comentario }
            : t
        ),
      }));
      setTareaActiva(null);
      setComentario('');
      setArchivo(null);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Ocurrió un error al finalizar la tarea. Intenta de nuevo.');
    }
    setEnviando(false);
  }

  if (cargando) {
    return <div style={estilos.contenedor}>Cargando tus tareas...</div>;
  }

  if (error) {
    return (
      <div style={estilos.contenedor}>
        <p style={{ color: 'red' }}>{error}</p>
        <p>Verifica que el link recibido en tu correo esté completo.</p>
      </div>
    );
  }

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.header}>
        <h1 style={estilos.titulo}>Hola, {datos.nombre}</h1>
        <p>Este es el listado de tus tareas asignadas.</p>
        <a href={URL_POWERBI} target="_blank" rel="noopener noreferrer" style={estilos.linkPBI}>
          Ver tablero de indicadores (Power BI)
        </a>
      </div>

      {datos.tareas.length === 0 && <p>No tienes tareas asignadas por el momento.</p>}

      {datos.tareas.map((t) => (
        <div key={t.id} style={estilos.tarjeta}>
          <div style={estilos.tarjetaHeader}>
            <strong>{t.tarea}</strong>
            <span style={estilos[estadoColor(t.estado)]}>{t.estado}</span>
          </div>
          {t.observacion && <p style={estilos.observacion}>{t.observacion}</p>}
          <p style={estilos.fecha}>
            Fecha límite: {new Date(t.fechaFin).toLocaleDateString('es-CO')}
          </p>

          {t.estado === 'En proceso' && (
            <button style={estilos.boton} onClick={() => setTareaActiva(t)}>
              Finalizar
            </button>
          )}

          {t.estado === 'Finalizado' && t.comentarioFinalizacion && (
            <p style={estilos.comentarioFinal}>Comentario: {t.comentarioFinalizacion}</p>
          )}
        </div>
      ))}

      {tareaActiva && (
        <div style={estilos.overlay}>
          <div style={estilos.modal}>
            <h3>Finalizar: {tareaActiva.tarea}</h3>
            <form onSubmit={finalizarTarea}>
              <label style={estilos.label}>Comentario</label>
              <textarea
                style={estilos.textarea}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={4}
              />
              <label style={estilos.label}>Adjuntar evidencia (opcional, máx. 3 MB)</label>
              <input
                type="file"
                onChange={(e) => setArchivo(e.target.files[0])}
                style={{ marginBottom: '15px' }}
              />
              <div style={estilos.modalBotones}>
                <button
                  type="button"
                  style={estilos.botonSecundario}
                  onClick={() => setTareaActiva(null)}
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button type="submit" style={estilos.boton} disabled={enviando}>
                  {enviando ? 'Enviando...' : 'Confirmar finalización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function estadoColor(estado) {
  if (estado === 'Finalizado') return 'badgeGris';
  if (estado === 'Atrasado') return 'badgeRojo';
  return 'badgeVerde';
}

const estilos = {
  contenedor: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '30px 20px',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    color: '#333',
  },
  header: { marginBottom: '30px', borderBottom: '2px solid #002d72', paddingBottom: '15px' },
  titulo: { color: '#002d72', margin: 0 },
  linkPBI: { color: '#002d72', fontWeight: 'bold', fontSize: '14px' },
  tarjeta: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '18px',
    marginBottom: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  tarjetaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  observacion: { color: '#555', fontSize: '14px', margin: '8px 0' },
  fecha: { fontSize: '13px', color: '#777' },
  boton: {
    background: '#002d72',
    color: '#fff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '5px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
  },
  botonSecundario: {
    background: '#eee',
    color: '#333',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '5px',
    cursor: 'pointer',
    marginRight: '10px',
  },
  badgeVerde: { background: '#e6f4ea', color: '#1e7e34', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
  badgeRojo: { background: '#fdecea', color: '#c0392b', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
  badgeGris: { background: '#eee', color: '#666', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
  comentarioFinal: { fontSize: '13px', color: '#555', fontStyle: 'italic', marginTop: '8px' },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: { background: '#fff', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '450px' },
  label: { display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' },
  textarea: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc' },
  modalBotones: { display: 'flex', justifyContent: 'flex-end' },
};
