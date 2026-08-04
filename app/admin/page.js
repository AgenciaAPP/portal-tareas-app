'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [errorLogin, setErrorLogin] = useState('');
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function iniciarSesion(e) {
    e.preventDefault();
    setCargando(true);
    setErrorLogin('');

    const res = await fetch('/api/config', {
      headers: { 'x-admin-password': password },
    });

    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      setAutenticado(true);
    } else {
      setErrorLogin('Contraseña incorrecta');
    }
    setCargando(false);
  }

  async function guardarConfig(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');

    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: {
        'x-admin-password': password,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (res.ok) {
      setMensaje('Configuración guardada correctamente.');
    } else {
      setMensaje('Ocurrió un error al guardar. Intenta de nuevo.');
    }
    setGuardando(false);
  }

  if (!autenticado) {
    return (
      <div style={estilos.contenedorLogin}>
        <form onSubmit={iniciarSesion} style={estilos.cajaLogin}>
          <h2 style={estilos.titulo}>Panel de administración</h2>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={estilos.input}
          />
          {errorLogin && <p style={{ color: 'red', fontSize: '14px' }}>{errorLogin}</p>}
          <button type="submit" style={estilos.boton} disabled={cargando}>
            {cargando ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={estilos.contenedor}>
      <h2 style={estilos.titulo}>Configuración del Portal de Tareas</h2>

      <form onSubmit={guardarConfig}>
        <label style={estilos.label}>Correo del jefe (recibe notificación de finalización)</label>
        <input
          type="email"
          style={estilos.input}
          value={config.correoJefe}
          onChange={(e) => setConfig({ ...config, correoJefe: e.target.value })}
        />

        <label style={estilos.label}>Correo remitente institucional</label>
        <input
          type="email"
          style={estilos.input}
          value={config.correoRemitente}
          onChange={(e) => setConfig({ ...config, correoRemitente: e.target.value })}
        />

        <label style={estilos.labelCheckbox}>
          <input
            type="checkbox"
            checked={config.modoPrueba}
            onChange={(e) => setConfig({ ...config, modoPrueba: e.target.checked })}
          />
          {' '}Modo prueba activo (todos los correos se redirigen al correo de pruebas)
        </label>

        <label style={estilos.label}>Correo de pruebas</label>
        <input
          type="email"
          style={estilos.input}
          value={config.correoPruebas}
          onChange={(e) => setConfig({ ...config, correoPruebas: e.target.value })}
        />

        <label style={estilos.label}>Días de anticipación - primer aviso</label>
        <input
          type="number"
          style={estilos.input}
          value={config.diasAviso1}
          onChange={(e) => setConfig({ ...config, diasAviso1: Number(e.target.value) })}
        />

        <label style={estilos.label}>Días de anticipación - segundo aviso</label>
        <input
          type="number"
          style={estilos.input}
          value={config.diasAviso2}
          onChange={(e) => setConfig({ ...config, diasAviso2: Number(e.target.value) })}
        />

        <button type="submit" style={estilos.boton} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>

        {mensaje && <p style={{ marginTop: '15px' }}>{mensaje}</p>}
      </form>
    </div>
  );
}

const estilos = {
  contenedorLogin: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  cajaLogin: {
    background: '#fff',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    width: '320px',
  },
  contenedor: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '30px 20px',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  titulo: { color: '#002d72', marginBottom: '20px' },
  label: { display: 'block', marginTop: '15px', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' },
  labelCheckbox: { display: 'block', marginTop: '20px', fontSize: '14px' },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  },
  boton: {
    background: '#002d72',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '20px',
  },
};
