// EJEMPLOS DE LA GUÍA PARA IA (datos reales: los usa guiaia.js, tools/gen-guia-ia.mjs y los tests).
// Cada sección se escribe como una lista en el orden de los huecos de la variante:
//   texto -> hueco de texto/título · { texto, enlace } -> botón · null -> imagen (se omite: queda de relleno).
// El test los aplica con el importador y comprueba que no haya avisos, que TODOS los textos estén
// rellenados y que cada enlace #ancla del navbar/footer apunte a una sección que existe.

/** Convierte la lista de valores en el mapa { "1": …, "2": … } del plan (los null se omiten). */
function sec(bloque, variante, lista, extra = {}) {
  const valores = {};
  lista.forEach((v, i) => { if (v !== null) valores[i + 1] = v; });
  return { bloque, variante, valores, ...extra };
}
const b = (texto, enlace) => ({ texto, enlace });

const cafeteria = () => ({
  plan: 1, titulo: 'Café Almendro', secciones: [
    sec('navbar', 'claro', ['Café Almendro', b('Inicio', '#inicio'), b('Qué servimos', '#servicios'), b('La carta', '#precios'), b('Visítanos', '#contacto'), b('Reservar mesa', '#contacto')]),
    sec('hero', 'fondo', ['Café de especialidad en el centro del barrio', 'Tostamos cada semana, horneamos cada mañana y abrimos la puerta todo el día.', b('Reservar mesa', '#contacto')],
      { fondo: 'https://ejemplo.com/fotos/cafe-almendro.jpg' }),
    sec('services', 'tarjetas', ['Lo que servimos', 'Café de origen', 'Granos de fincas locales, tostados cada semana en casa.', 'Panadería', 'Pan y repostería horneados cada mañana.', 'Desayunos', 'Platos sencillos con ingredientes de la zona.']),
    sec('gallery', 'cuadricula', ['Un día en la barra', null, null, null, null, null, null]),
    sec('testimonials', 'tarjetas', ['Lo que dicen en la barra', '“El mejor flat white que he probado en la ciudad.”', 'Camila Solís', 'Diseñadora', '“Vengo a trabajar por las mañanas y siempre hay lugar.”', 'Diego Araya', 'Programador', '“El pan sale caliente y el trato es de casa.”', 'Paula Quesada', 'Maestra']),
    sec('pricing', 'lista', ['La carta', 'Espresso', 'Doble, de origen único', '₡1.800', 'Capuchino', 'Con leche entera o de almendra', '₡2.400', 'Desayuno', 'Gallo pinto, huevo y café', '₡4.500']),
    sec('contact', 'simple', ['Pasa a tomar un café', 'Abrimos todos los días, de 7:00 a 17:00, en el centro.', b('Reserva por WhatsApp', 'https://wa.me/50612345678')]),
    sec('footer', 'columnas', ['Café Almendro', 'Café de especialidad y pan recién horneado.', 'Explora', b('Inicio', '#inicio'), b('Qué servimos', '#servicios'), b('La carta', '#precios'), 'Escríbenos', 'hola@cafealmendro.com', '+506 2222 3333']),
  ],
});

const masajes = () => ({
  plan: 1, titulo: 'Estudio Magnolia', secciones: [
    sec('navbar', 'boton', ['Estudio Magnolia', b('Terapias', '#servicios'), b('Tarifas', '#precios'), b('Visítanos', '#contacto'), b('Agendar cita', '#contacto')]),
    sec('hero', 'dividido', ['Bienestar sin prisa', 'Masajes y terapias en un espacio tranquilo, a tu ritmo.', b('Agendar cita', '#contacto'), null]),
    sec('services', 'lista', ['Cómo es tu visita', '01', 'Nos conocemos', 'Nos cuentas qué molestias o metas tienes.', '02', 'Elegimos la terapia', 'Ajustamos el masaje a lo que tu cuerpo necesita.', '03', 'Descansas', 'Una hora sin pantallas y con aromas suaves.']),
    sec('pricing', 'dos', ['Sesiones y bonos', 'Sesión individual', '₡25.000', '60 minutos', 'Aromaterapia incluida', b('Reservar', '#contacto'), 'Bono de 5 sesiones', '₡110.000', '5 sesiones de 60 minutos', 'Válido por 3 meses', b('Reservar bono', '#contacto')]),
    sec('contact', 'dividido', ['Agenda tu masaje', 'Escríbenos y reservamos el horario que mejor te quede.', '+506 8888 7777', 'hola@estudiomagnolia.com', 'Escazú, San José', b('Escríbenos por WhatsApp', 'https://wa.me/50688887777')]),
    sec('footer', 'centrado', ['Estudio Magnolia', b('Inicio', '#inicio'), b('Terapias', '#servicios'), b('Contacto', '#contacto'), '© 2026 Estudio Magnolia. Todos los derechos reservados.']),
  ],
});

/** Los dos planes de ejemplo (el primero también se guarda en docs/plan-ejemplo.json). */
export const ejemplosPlan = () => [cafeteria(), masajes()];
