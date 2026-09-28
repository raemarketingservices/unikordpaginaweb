export const LEGAL = {
  titular: "RAE Marketing Services",
  sitio: "UNIKO-RD",
  url: "https://uniko-rd.com",
  correo: "raemarketingservices@gmail.com",
  actualizacion: "28 de septiembre de 2026",
} as const;

export type SeccionLegal = {
  titulo: string;
  parrafos?: string[];
  items?: string[];
};

export type DocLegal = {
  slug: string;
  titulo: string;
  resumen: string;
  secciones: SeccionLegal[];
};

export const DOCS: DocLegal[] = [
  {
    slug: "terminos",
    titulo: "Términos y Condiciones",
    resumen:
      "Reglas de uso de UNIKO-RD para compradores y vendedores, conforme a la legislación dominicana.",
    secciones: [
      {
        titulo: "1. Identificación del titular",
        parrafos: [
          `Este sitio web y el servicio asociado son operados por ${LEGAL.titular} (en adelante, “UNIKO-RD”), con domicilio en la República Dominicana y correo electrónico de contacto ${LEGAL.correo}. Sitio: ${LEGAL.url}.`,
          "La información que se presta electrónicamente conforme a la Ley 177-07 de Comercio Electrónico y Mensajes de Datos se encuentra disponible de forma permanente y accesible en estas páginas.",
        ],
      },
      {
        titulo: "2. Objeto y aceptación",
        parrafos: [
          "UNIKO-RD es un marketplace que conecta compradores con tiendas y prestadores de servicios de Rep. Dominicana. El uso del sitio implica la aceptación plena de estos términos.",
          "Al crear una cuenta usted manifiesta su consentimiento electrónico para celebrar este contrato por medios tecnológicos, tal como lo permite la Ley 177-07. Puede guardar, descargar e imprimir estos términos en cualquier momento desde /legal.",
          "Solo pueden registrarse personas mayores de 18 años con capacidad legal para contratar.",
        ],
      },
      {
        titulo: "3. Registro y cuenta de usuario",
        items: [
          "Los datos de registro (nombres, apellidos, cédula, correo y teléfono) deben ser veraces y estar actualizados.",
          "La cuenta y las credenciales son personales e intransferibles; usted es responsable de conservar su contraseña en secreto.",
          "Debe notificar de inmediato a " +
            LEGAL.correo +
            " cualquier uso no autorizado de su cuenta.",
          "La creación de cuentas falsas, duplicadas o suplantando a terceros está prohibida.",
          "El correo electrónico es el canal oficial de notificación entre UNIKO-RD y el usuario.",
        ],
      },
      {
        titulo: "4. Obligaciones de la tienda o vendedor",
        items: [
          "Publicar información veraz y actualizada sobre productos y servicios: descripción, precio, disponibilidad y condiciones de envío.",
          "Los precios deben expresarse en pesos dominicanos e incluir el ITBIS cuando corresponda, de conformidad con la normativa fiscal dominicana.",
          "Cumplir las obligaciones de Ley 87-01 de Defensa del Consumidor: información clara, entrega en el plazo acordado, garantía y atender devoluciones o reclamaciones.",
          "Cada vendedor es responsable de sus obligaciones fiscales ante la DGII (ITBIS, ISR, emisión de comprobantes fiscales) cuando esté obligado por ley.",
          "Prohibido vender productos ilícitos, prohibidos, peligrosos o que vulneren derechos de terceros.",
          "El vendedor que no esté inscrito ante la DGII debe ofrecer información de contacto clara y cumplir igualmente la normativa de consumidor.",
        ],
      },
      {
        titulo: "5. Compras y contratación entre usuarios",
        parrafos: [
          "El contrato de compraventa o de prestación de servicios se celebra directamente entre el comprador y el vendedor. UNIKO-RD solo facilita la conexión tecnológica entre las partes.",
          "Las condiciones de pago, envío, garantía y devolución se acuerdan entre comprador y vendedor y deben reflejarse en la publicación.",
          "Se recomienda a los compradores verificar la reputación de la tienda y conservar los mensajes y comprobantes de la operación.",
          "Las reseñas deben ser reales; el uso de reseñas falsas o pagadas está prohibido.",
        ],
      },
      {
        titulo: "6. Precios, impuestos y disponibilidad",
        items: [
          "Los precios se muestran en pesos dominicanos (RD$) y, cuando aplique, con el ITBIS incluido.",
          "Las promociones tienen la vigencia indicada en la publicación y están sujetas a disponibilidad.",
          "Los errores tipográficos o de publicación de precio podrán corregirse; si ocurre una compra de buena fe, se contactará al comprador para dar solución.",
          "La disponibilidad es responsabilidad del vendedor; la publicación no garantiza stock permanente.",
        ],
      },
      {
        titulo: "7. Conductas prohibidas",
        items: [
          "Cometer fraude, estafas o suplantación de identidad (sancionables conforme al ordenamiento dominicano, incluida la Ley 253-07).",
          "Publicar contenido ilícito, amenazante, discriminatorio o que infrinja derechos de autor, marcas o privacidad.",
          "Enviar spam, mensajes masivos no solicitados ni realizar publicidad engañosa (Ley 126-02 y Ley 87-01).",
          "Extraer datos del sitio mediante robots o scraping, revender cuentas o interferir con la seguridad del servicio.",
          "Operar fuera de la plataforma para evitar estas reglas una vez establecido el contacto, cuando ello perjudique a los usuarios o a UNIKO-RD.",
        ],
      },
      {
        titulo: "8. Propiedad intelectual",
        parrafos: [
          "La marca UNIKO-RD, el diseño del sitio y su código son propiedad de " +
            LEGAL.titular +
            ".",
          "Al publicar contenido (fotos, descripciones, logotipos), usted concede a UNIKO-RD una licencia limitada para mostrarlo dentro de la plataforma y promocionar el marketplace, conservando la titularidad del mismo.",
        ],
      },
      {
        titulo: "9. Moderación, suspensión y terminación",
        parrafos: [
          "UNIKO-RD puede revisar, moderar o eliminar publicaciones que violen estos términos o la ley, y suspender o cerrar cuentas que incurran en faltas graves o reiteradas.",
          "Antes de una suspensión se evaluará el caso; las decisiones pueden consultarse escribiendo a " +
            LEGAL.correo +
            ".",
          "El usuario puede cerrar su cuenta en cualquier momento enviando una solicitud a dicho correo.",
        ],
      },
      {
        titulo: "10. Responsabilidad",
        parrafos: [
          "UNIKO-RD presta un servicio tecnológico de intermediación. No es parte de la compraventa ni de la prestación de servicios entre usuarios y no garantiza la calidad, legalidad o entrega de los mismos.",
          "No respondemos por daños derivados de la conducta entre usuarios, salvo los límites que imponga la ley. Nada en estos términos limita los derechos irrenunciables del consumidor reconocidos en la Ley 87-01 u otras normas imperativas dominicanas.",
          "El servicio se ofrece “tal cual”; podremos suspenderlo temporalmente por mantenimiento o causas de fuerza mayor, avisando cuando sea razonablemente posible.",
        ],
      },
      {
        titulo: "11. Protección de datos personales",
        parrafos: [
          "El tratamiento de sus datos personales se rige por nuestra Política de Privacidad, elaborada conforme a la Ley 158-13 de Protección de Datos Personales.",
          "Al registrarse usted consiente expresamente la recolección y el uso de sus datos para las finalidades descritas en dicha política.",
        ],
      },
      {
        titulo: "12. Modificaciones",
        parrafos: [
          "Podremos actualizar estos términos; la versión vigente y su fecha de actualización estarán siempre disponibles en " +
            LEGAL.url +
            "/legal/terminos.",
          "Los cambios sustanciales se comunicarán por el sitio o por correo. El uso continuo tras la publicación implica aceptación de la versión nueva.",
        ],
      },
      {
        titulo: "13. Ley aplicable y jurisdicción",
        parrafos: [
          "Estos términos se rigen por las leyes de la República Dominicana. Cualquier controversia se someterá a los tribunales competentes de la República Dominicana, sin perjuicio del fuero que corresponda al consumidor según la Ley 87-01.",
        ],
      },
      {
        titulo: "14. Contacto y reclamaciones",
        parrafos: [
          `Escríbanos a ${LEGAL.correo} para dudas, reclamaciones o ejercer sus derechos de datos personales. También puede acudir a Proconsumidor (Dirección General del Consumidor) en calidad de consumidor.`,
        ],
      },
    ],
  },
  {
    slug: "privacidad",
    titulo: "Política de Privacidad",
    resumen:
      "Cómo recolectamos, usamos y protegemos sus datos personales según la Ley 158-13 de Protección de Datos Personales de Rep. Dominicana.",
    secciones: [
      {
        titulo: "1. Responsable del tratamiento",
        parrafos: [
          `${LEGAL.titular} es responsable del tratamiento de los datos personales que usted proporciona a través de ${LEGAL.url}. Contacto para asuntos de privacidad: ${LEGAL.correo}.`,
          "Esta política cumple con el deber de información de la Ley 158-13 de Protección de Datos Personales.",
        ],
      },
      {
        titulo: "2. Datos que recolectamos",
        items: [
          "Identificación: nombres, apellidos, cédula de identidad y electoral, correo electrónico y teléfono.",
          "Cuenta: tipo de cuenta (usuario o tienda), fecha de creación y aceptación de términos.",
          "Datos de tienda (vendedores): nombre de la tienda, RNC si se informa, provincia, descripción, logotipo y fotos de portada.",
          "Contenido que usted publica: productos, servicios, reseñas y mensajes dentro del sitio.",
          "Técnicos: dirección IP, tipo de navegador y dispositivo, registros de acceso y tecnologías de almacenamiento local descritas en la Política de Cookies.",
        ],
      },
      {
        titulo: "3. Finalidades del tratamiento",
        items: [
          "Crear y gestionar su cuenta y verificar su correo electrónico.",
          "Publicar y operar tiendas, productos y servicios, y mostrar los datos públicos del vendedor a los compradores.",
          "Permitir la comunicación entre compradores y vendedores y la atención de reclamaciones.",
          "Garantizar la seguridad del servicio, prevenir fraude y cumplir obligaciones legales.",
          "Mejorar el funcionamiento del marketplace y atender solicitudes de soporte.",
          "Enviar promociones y ofertas únicamente si usted lo autorizó con el consentimiento específico de marketing, el cual puede revocar en cualquier momento.",
        ],
      },
      {
        titulo: "4. Base jurídica del tratamiento",
        parrafos: [
          "Tratamos sus datos sobre la base de: (i) su consentimiento expreso, libre, informado y específico otorgado al marcar las casillas de aceptación durante el registro (art. 21 de la Ley 158-13); (ii) la ejecución del contrato de uso del servicio; y (iii) el cumplimiento de obligaciones legales.",
          "El consentimiento para el marketing es opcional y su negativo no impide el registro.",
        ],
      },
      {
        titulo: "5. Derechos de los titulares (ARCO)",
        parrafos: [
          "Usted tiene derecho a conocer qué datos suyos tratamos, a rectificarlos cuando sean inexactos, a cancelarlos cuando ya no sean necesarios y a oponerse a determinados tratamientos.",
          "Para ejercer esos derechos escriba a " +
            LEGAL.correo +
            " con el asunto “Derechos ARCO”, indicando su nombre completo, correo de la cuenta y la solicitud concreta. Podremos pedirle información razonable para verificar su identidad.",
          "Atenderemos su solicitud en un plazo razonable. Si no queda conforme, puede presentar una reclamación ante la Dirección General de Protección de Datos Personales de la República Dominicana.",
          "Puede además revocar su consentimiento (incluido el de marketing) en cualquier momento, sin efectos retroactivos.",
        ],
      },
      {
        titulo: "6. Conservación de los datos",
        parrafos: [
          "Conservamos sus datos mientras su cuenta esté activa y, después, durante los plazos exigidos por obligaciones legales o fiscales, o para atender reclamaciones.",
          "Cerrada la cuenta, eliminaremos o anonimizaremos sus datos en un plazo razonable, salvo obligación legal de conservarlos.",
        ],
      },
      {
        titulo: "7. Destinatarios y transferencias",
        items: [
          "Otros usuarios: los datos de la tienda (nombre, ubicación, reseñas, fotos) son públicos por diseño del marketplace.",
          "Proveedores tecnológicos: alojamiento en la nube y gestión de la base de datos (Supabase) que operan bajo nuestras instrucciones.",
          "Autoridades: solo cuando exista mandato legal o requerimiento válido.",
          "UNIKO-RD no vende ni alquila sus datos personales a terceros.",
        ],
      },
      {
        titulo: "8. Seguridad",
        parrafos: [
          "Aplicamos medidas técnicas y organizativas: comunicación cifrada (HTTPS), contraseñas protegidas mediante cifrado irreversible, acceso restringido a la información y monitoreo del servicio.",
          "Ningún sistema es infalible; usaremos los medios razonables para proteger sus datos y avisaremos de incidentes conforme a la ley.",
        ],
      },
      {
        titulo: "9. Datos de menores y cédula",
        parrafos: [
          "El servicio está dirigido exclusivamente a mayores de 18 años. Si detectamos una cuenta de un menor, la eliminaremos a solicitud del titular o de su representante.",
          "La cédula se recolecta únicamente para fines de identificación y verificación (especialmente de vendedores), se trata con cuidado reforzado y no se publica en el perfil.",
        ],
      },
      {
        titulo: "10. Cookies y tecnologías similares",
        parrafos: [
          "Utilizamos cookies y almacenamiento local para mantener la sesión y recordar preferencias, conforme a nuestra Política de Cookies.",
        ],
      },
      {
        titulo: "11. Cambios a esta política",
        parrafos: [
          "Actualizaremos esta política cuando cambien nuestras prácticas o la ley. La versión vigente y su fecha estarán siempre en " +
            LEGAL.url +
            "/legal/privacidad.",
        ],
      },
      {
        titulo: "12. Contacto",
        parrafos: [`Para cualquier consulta de privacidad: ${LEGAL.correo}.`],
      },
    ],
  },
  {
    slug: "cookies",
    titulo: "Política de Cookies",
    resumen:
      "Qué tecnologías de almacenamiento usa UNIKO-RD y cómo controlarlas desde tu navegador.",
    secciones: [
      {
        titulo: "1. Qué son",
        parrafos: [
          "Las cookies y tecnologías similares (almacenamiento local del navegador) son archivos pequeños que permiten recordar información de tu visita y mantener funciones esenciales, como la sesión iniciada.",
        ],
      },
      {
        titulo: "2. Tecnologías que usamos",
        items: [
          "Técnicas/necesarias: token de sesión de tu cuenta (Supabase Auth) para mantenerte conectado, y preferencias básicas del sitio. Sin ellas, no podrías iniciar sesión.",
          "Funcionales: carrito de compras y favoritos guardados en tu navegador para que no se pierdan al navegar.",
          "Analíticas: actualmente no usamos cookies analíticas ni herramientas de terceros para rastrear tu comportamiento con fines publicitarios.",
          "Publicidad: no usamos cookies de publicidad ni compartimos tus datos con redes publicitarias.",
        ],
      },
      {
        titulo: "3. Contenido de terceros",
        parrafos: [
          "El sitio carga la tipografía Montserrat desde Google Fonts; tu navegador conectará con los servidores de Google al renderizar el texto. No usamos otras integraciones de terceros que instalen cookies.",
        ],
      },
      {
        titulo: "4. Cómo controlarlas",
        items: [
          "Puedes borrar cookies y datos de sitios desde la configuración de tu navegador (Chrome, Firefox, Safari u Edge).",
          "Puedes bloquear cookies; si bloqueas las técnicas, no podrás iniciar sesión ni usar funciones esenciales.",
          "El modo incógnito o privado evita que se guarden datos al cerrar la ventana.",
          "No existe un banner de cookies porque no instalamos cookies de terceros con fines de marketing; esta política te informa conforme a la Ley 158-13.",
        ],
      },
      {
        titulo: "5. Actualizaciones",
        parrafos: [
          `Última actualización: ${LEGAL.actualizacion}. Cualquier cambio se publicará en ${LEGAL.url}/legal/cookies.`,
        ],
      },
    ],
  },
  {
    slug: "aviso",
    titulo: "Aviso de Comercio Electrónico",
    resumen:
      "Información del prestador del servicio y del usuario conforme a la Ley 177-07 y derechos del consumidor (Ley 87-01).",
    secciones: [
      {
        titulo: "1. Datos del prestador",
        items: [
          "Titular: " + LEGAL.titular,
          "Servicio: marketplace UNIKO-RD",
          "Sitio: " + LEGAL.url,
          "Correo de contacto: " + LEGAL.correo,
          "Jurisdicción: República Dominicana",
        ],
      },
      {
        titulo: "2. Información precontractual",
        parrafos: [
          "Conforme a la Ley 177-07, antes de celebrar cualquier contrato electrónico se pone a su disposición la información esencial de la operación: descripción del bien o servicio, precio total con ITBIS cuando aplique, condiciones de envío, identificación de la tienda vendedora y mecanismos de contacto y reclamación.",
          "La confirmación de la recepción de su pedido o mensaje se realiza por medios electrónicos (pantalla y correo).",
        ],
      },
      {
        titulo: "3. Rol de UNIKO-RD",
        parrafos: [
          "UNIKO-RD es un intermediario tecnológico que pone a disposición un espacio de conexión entre comerciantes y consumidores. El contrato de consumo se celebra entre el comprador y la tienda vendedora, quien es la responsable de la oferta, la entrega y la garantía.",
        ],
      },
      {
        titulo: "4. Derechos del consumidor",
        items: [
          "A recibir información clara, veraz y oportuna sobre los bienes y servicios (Ley 87-01).",
          "A que el precio ofertado sea el precio total a pagar, con los impuestos incluidos cuando corresponda.",
          "A la calidad, garantía y a la solución de reclamaciones frente al proveedor.",
          "A acudir a Proconsumidor (Dirección General del Consumidor) si sus derechos no son atendidos.",
        ],
      },
      {
        titulo: "5. Reclamaciones",
        parrafos: [
          `Escriba a ${LEGAL.correo} indicando su cuenta, la tienda involucrada y los hechos. Revisaremos su caso y, de ser procedente, actuaremos sobre la publicación o la cuenta conforme a nuestros términos.`,
        ],
      },
      {
        titulo: "6. Ley aplicable",
        parrafos: [
          "Rige la legislación de la República Dominicana, incluyendo la Ley 177-07 de Comercio Electrónico, la Ley 87-01 de Defensa del Consumidor y la Ley 158-13 de Protección de Datos Personales.",
        ],
      },
    ],
  },
];

export function docPorSlug(slug: string): DocLegal | undefined {
  return DOCS.find((d) => d.slug === slug);
}
