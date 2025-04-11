// src/pages/api/submit-form.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export async function POST({ request }) {
  try {
    // Leer el FormData directamente de la solicitud
    const formData = await request.formData();

// Extraer y sanear el nombre de la empresa para usarlo en la ruta de S3
const companyNameRaw = formData.get('companyName');
const companyName = typeof companyNameRaw === 'string' ? companyNameRaw.trim() : 'default';
const folderName = companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

// Configurar el cliente de S3
const s3Client = new S3Client({
  region: import.meta.env.AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Resultados de uploads
const uploads = {
  logo: '',
  productImages: []
};

// Procesar logo
const logoFile = formData.get('logo');
if (logoFile && logoFile instanceof File) {
  const fileExtension = logoFile.name.split('.').pop();
  // Se crea la key con el folder de la empresa
  const key = `uploads/${folderName}/${randomUUID()}.${fileExtension}`;
  
  const arrayBuffer = await logoFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const command = new PutObjectCommand({
    Bucket: import.meta.env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: logoFile.type,
  });
  
  await s3Client.send(command);
  
  // Generar URL pública
  uploads.logo = `https://${import.meta.env.AWS_S3_BUCKET}.s3.${import.meta.env.AWS_REGION}.amazonaws.com/${key}`;
}

// Procesar imágenes de productos (puede ser múltiple)
const productImagesEntries = Array.from(formData.entries())
  .filter(([key]) => key === 'productImages');

for (const [_, file] of productImagesEntries) {
  if (file instanceof File) {
    const fileExtension = file.name.split('.').pop();
    // Usar también el folder de la empresa en la key
    const key = `uploads/${folderName}/${randomUUID()}.${fileExtension}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const command = new PutObjectCommand({
      Bucket: import.meta.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });
    
    await s3Client.send(command);
    
    // Generar URL pública
    const url = `https://${import.meta.env.AWS_S3_BUCKET}.s3.${import.meta.env.AWS_REGION}.amazonaws.com/${key}`;
    uploads.productImages.push(url);
  }
}

// Procesar los campos de texto
const fields = {};
for (const [key, value] of formData.entries()) {
  if (!(value instanceof File)) {
    fields[key] = value;
  }
}

    
    // Configurar Airtable
    const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = 'appbfmLQXTsLrgSVt';
    const AIRTABLE_TABLE_NAME = 'tblXvp0xEwY7uayUF';

    // Formatear datos para Airtable
    // Actualiza esta parte del código en src/pages/api/submit-form.js

// Formatear datos para Airtable
const recordData = {
  fields: {
    'fld3B1yD979RFaf6Y': fields.companyName || '', // Nombre de empresa
    'fldYkeGlBfObT8Ksk': fields.slogan || '', // Eslogan
    'fldNsYI4c60C6hjQL': fields.industry || '', // Sector
    'fld9C53ZyNLW4hVxS': fields.businessDescription || '', // Descripción
    'fldFwo6k2uM62dUON': parseInt(fields.foundedYear) || null, // Año fundación
    'fldsVTK2by98J3Ym3': fields.location || '', // Ubicación
    'fldmZHeuI7Y9hZrNB': fields.contactName || '', // Persona de contacto
    'fldXeACinUqaPaqAD': fields.contactEmail || '', // Email
    'fldL1XeouKXO1z2Il': fields.whatsappNumber || '', // WhatsApp
    'fldJ7ZPlHkVwPsd6Y': fields.githubUsername || '', // Usuario GitHub
    'fldmTR3ZcTpfJZ8Q9': fields.services || '', // Servicios
    'fldkh7IEEIVqzRoiX': fields.serviceDescriptions || '', // Descripciones de servicios
    'fld5VIpvsgxTBRFVk': fields.servicePrices || '', // Precios de servicios
    'fldUlAVNM4J25rz5S': fields.serviceBenefits || '', // Beneficios de servicios
    'fld1JGE8EuP4WbED8': fields.targetAudience || '', // Público objetivo
    'fldHwDk56uOGtyJlv': fields.problemSolution || '', // Problema que resuelve
    'fld70xCQSZGBshIkM': fields.uniqueValue || '', // Valor único
    
    // Los campos de selección deben estar en formato de array para selecciones múltiples
    // o string para selección única, y los valores deben existir previamente en Airtable
    'fld0gMITTWljoMz6u': fields.pageObjective ? [fields.pageObjective] : [], // Objetivo página (multiple select)
    'fldOgoMBwBysUdzg2': fields.desiredAction ? [fields.desiredAction] : [], // Acción deseada (multiple select)
    'fldl6xvgSUowYuL8J': fields.visualStyle ? [fields.visualStyle] : [], // Estilo visual (multiple select)
    
    // Campos de texto para las secciones y servicios adicionales
    'fldoQia4sUs71eQDv': typeof fields.pageSections === 'string' ? fields.pageSections : 
                         Array.isArray(fields.pageSections) ? fields.pageSections.join(', ') : '', // Secciones de página
    
    'fldVFqLX70chczjK8': typeof fields.additionalServices === 'string' ? fields.additionalServices : 
                          Array.isArray(fields.additionalServices) ? fields.additionalServices.join(', ') : '', // Servicios adicionales
    
    'fld0YAsEItiQ9gkuY': fields.analyticsId || '', // ID Analytics
    'fldu4Blte0fmzxUG1': fields.mainColor || '',        // Color principal
    'fld27KgcN62owM0RW': fields.secondaryColor || '',     // Color secundario
    'fldaGE7gX4b2ARYfY': fields.accentColor || '', 
    'fldlumDRRjlCD676p': fields.references || '', // Referencias
    'fldwG7aEuv4KXf1X8': fields.competitors || '', // Competidores
    'fld4toDCrMECfyOpQ': fields.additionalInfo || '', // Información adicional
    'fldbpQk5PmWQE3FIX': new Date().toISOString().split('T')[0], // Fecha solicitud (formato YYYY-MM-DD)
    
    // Estado debe ser una opción predefinida en el campo de selección única
    'fldlDDqAJduQt7v2U': 'Nuevo', // Estado (single select)
    
    // Campo para las imágenes como adjuntos
    'fldaOXa3p0TrPwZlH': [
      // Añadir el logo si existe
      ...(uploads.logo ? [{ url: uploads.logo }] : []),
      // Añadir las imágenes de productos si existen
      ...(uploads.productImages?.map(url => ({ url })) || [])
    ]
  }
};

    // Habilitar typecast
    const queryParams = new URLSearchParams({ typecast: 'true' });

    // Enviar datos a Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?${queryParams}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordData),
      }
    );

    if (!airtableResponse.ok) {
      const errorData = await airtableResponse.json();
      console.error('Error de Airtable:', errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Error de Airtable: ${errorData.error?.message || 'Error desconocido'}` 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const airtableData = await airtableResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Formulario enviado con éxito', 
        recordId: airtableData.id,
        uploads: {
          logo: uploads.logo,
          productImages: uploads.productImages
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error procesando formulario:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Error interno del servidor: ${error.message || 'Error desconocido'}` 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}