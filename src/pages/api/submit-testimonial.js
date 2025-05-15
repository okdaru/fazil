export async function POST({ request }) {
  try {
    // Recibir los datos del formulario
    const formData = await request.formData();
    
    // Extraer los datos relevantes - usando los nombres de campo del formulario
    const name = formData.get('name')?.toString() || '';
    const company = formData.get('company')?.toString() || '';
    const email = formData.get('email')?.toString() || '';
    const review = formData.get('testimonial')?.toString() || '';
    
    // Configuración de Airtable - CORREGIDO para usar la tabla de "Reseñas"
    const AIRTABLE_BASE_ID = import.meta.env.AIRTABLE_BASE_ID;

    
    // Corregido: Usa el ID de la tabla "Reseñas", no "Solicitudes"
    const AIRTABLE_TABLE_ID = 'tblrbrYebCbleKC7I'; // ID de tabla "Reseñas"
    
    const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY;
    
    // Verificación básica para evitar envíos vacíos
    if (!name.trim() || !review.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "El nombre y el testimonio son obligatorios" 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Preparar los datos para Airtable, usando los IDs de campo correctos para la tabla "Reseñas"
    const payload = {
      fields: {
        "fld6mtbUPF3vctWuI": name,            // Name
        "flddqCGCviKCIKtzt": company,         // empresa
        "fld2U5HYmbSYg1zGH": email,           // correo Eléctronico
        "fldosIGdMoIXW4Cv1": review           // Reseña
      }
    };
    
    console.log('Enviando datos a Airtable:', payload);
    console.log('URL de Airtable:', `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);
    
    // Realizar la solicitud a Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`
        },
        body: JSON.stringify(payload)
      }
    );
    
    // Verificar la respuesta de Airtable
    if (!airtableResponse.ok) {
      const errorData = await airtableResponse.json();
      console.error('Error de Airtable:', errorData);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Error de Airtable: ${errorData.error?.message || 'Error desconocido'}`,
          details: errorData
        }),
        { 
          status: airtableResponse.status, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Procesar la respuesta exitosa
    const airtableData = await airtableResponse.json();
    console.log('Respuesta exitosa de Airtable:', airtableData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Testimonio enviado con éxito', 
        recordId: airtableData.id 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error procesando la solicitud:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Error interno del servidor: ${error.message || 'Error desconocido'}` 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}