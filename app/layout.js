export const metadata = {
  title: 'Portal de Tareas - Agencia APP',
  description: 'Consulta y actualización de tareas asignadas',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
