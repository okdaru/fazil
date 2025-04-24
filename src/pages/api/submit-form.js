// src/pages/api/submit-form.js - Versión final corregida para evitar opciones vacías
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
    
    // Verificar límite de imágenes (máximo 15)
    const MAX_IMAGES = 15;
    
    if (productImagesEntries.length > MAX_IMAGES) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Error: Solo se permiten hasta ${MAX_IMAGES} imágenes. Se han intentado subir ${productImagesEntries.length}.` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Procesar las imágenes (hasta el límite)
    const imagesToProcess = productImagesEntries.slice(0, MAX_IMAGES);
    
    for (const [_, file] of imagesToProcess) {
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

    // Definir opciones válidas para campos de selección
    const validPageObjectives = ["Generar contactos", "Vender productos/servicios", "Informar sobre la empresa/marca", "Promocionar evento", "Otro"];
    const validDesiredActions = ["Contactar por WhatsApp", "Llenar un formulario", "Llamar por teléfono", "Visitar un local físico", "Comprar directamente", "Otro"];
    const validVisualStyles = ["Minimalista", "Corporativo", "Moderno/Tecnológico", "Artístico/Creativo", "Otro"];
    
    // Filtrar solo valores válidos y no vacíos para campos de selección múltiple
    const getValidSelection = (value, validOptions) => {
      if (!value) return [];
      
      // Si es un string, verificar si es válido y no vacío
      if (typeof value === 'string') {
        return (validOptions.includes(value) && value.trim() !== '') ? [value] : [];
      }
      
      // Si es un array, filtrar solo los valores válidos y no vacíos
      if (Array.isArray(value)) {
        return value.filter(item => validOptions.includes(item) && typeof item === 'string' && item.trim() !== '');
      }
      
      return [];
    };

    // Procesar campos específicos por industria según la selección
    const industrySpecificFields = {};
    const selectedIndustry = fields.industry;
    
    if (selectedIndustry === 'restaurante') {
      industrySpecificFields.foodType = fields.foodType || '';
      industrySpecificFields.menuCategories = fields.menuCategories || '';
      industrySpecificFields.specialties = fields.specialties || '';
      industrySpecificFields.openingHours = fields.openingHours || '';
      // Para servicios adicionales de restaurante, no enviamos el campo
      //industrySpecificFields.restaurantServices = [];
      //industrySpecificFields.ambience = '';
    } 
    else if (selectedIndustry === 'medico') {
      industrySpecificFields.medicalSpecialties = fields.medicalSpecialties || '';
      industrySpecificFields.medicalServices = fields.medicalServices || '';
      industrySpecificFields.insuranceInfo = fields.insuranceInfo || '';
      industrySpecificFields.doctorProfiles = fields.doctorProfiles || '';
      //industrySpecificFields.appointmentSystem = '';
      industrySpecificFields.appointmentInfo = fields.appointmentInfo || '';
    }
    else if (selectedIndustry === 'psicologia') {
      industrySpecificFields.therapeuticApproaches = fields.therapeuticApproaches || '';
      //industrySpecificFields.therapeuticSpecialties = [];
      //industrySpecificFields.attendanceMode = [];
      industrySpecificFields.therapistProfile = fields.therapistProfile || '';
      //industrySpecificFields.sessionDuration = '';
      industrySpecificFields.frequencyInfo = fields.frequencyInfo || '';
    }
    else if (selectedIndustry === 'profesional') {
      industrySpecificFields.professionalServices = fields.professionalServices || '';
      industrySpecificFields.workMethodology = fields.workMethodology || '';
      industrySpecificFields.certifications = fields.certifications || '';
      industrySpecificFields.experience = fields.experience || '';
      industrySpecificFields.differentiators = fields.differentiators || '';
    }
    else if (selectedIndustry === 'educacion') {
      industrySpecificFields.educationalPrograms = fields.educationalPrograms || '';
      industrySpecificFields.methodology = fields.methodology || '';
      //industrySpecificFields.educationMode = [];
      industrySpecificFields.facultyInfo = fields.facultyInfo || '';
      industrySpecificFields.facilities = fields.facilities || '';
      industrySpecificFields.scheduleInfo = fields.scheduleInfo || '';
    }
    else if (selectedIndustry === 'otro') {
      industrySpecificFields.otherBusinessInfo = fields.otherBusinessInfo || '';
      industrySpecificFields.otherBusinessFeatures = fields.otherBusinessFeatures || '';
    }
    
    // Configurar Airtable
    const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = 'appbfmLQXTsLrgSVt';
    const AIRTABLE_TABLE_NAME = 'tblXvp0xEwY7uayUF';

    // Formatear datos para Airtable usando IDs de campo correctos
    // Solo incluir campos con valores
    const recordData = {
      fields: {
        // Información Básica - campos requeridos
        'fld3B1yD979RFaf6Y': fields.companyName || '', // Nombre de empresa
        'fldNsYI4c60C6hjQL': fields.industry || '', // Sector o industria
        'fld9C53ZyNLW4hVxS': fields.businessDescription || '', // Descripción
        
        // Información de Contacto - campos requeridos
        'fldmZHeuI7Y9hZrNB': fields.contactName || '', // Persona de contacto
        'fldXeACinUqaPaqAD': fields.contactEmail || '', // Email
        'fldL1XeouKXO1z2Il': fields.whatsappNumber || '', // WhatsApp
        
        // GitHub
        'fldJ7ZPlHkVwPsd6Y': fields.githubUsername || '', // Usuario GitHub
        
        // Servicios Generales
        'fldmTR3ZcTpfJZ8Q9': fields.services || '', // Productos/servicios principales
        'fldkh7IEEIVqzRoiX': fields.serviceDescriptions || '', // Descripciones de servicios
        'fldUlAVNM4J25rz5S': fields.serviceBenefits || '', // Beneficios de servicios
        
        // Público Objetivo
        'fld1JGE8EuP4WbED8': fields.targetAudience || '', // Público objetivo
        'fldHwDk56uOGtyJlv': fields.problemSolution || '', // Problema que resuelve
        'fld70xCQSZGBshIkM': fields.uniqueValue || '', // Valor único
        
        // Estado y Fecha
        'fldMGGSFFnH0gT0Au': 'Nuevo', // Estado (single select) - siempre comienza como "Nuevo"
        'fldiktuSW6iOA1VqK': new Date().toISOString().split('T')[0], // Fecha solicitud (ID corregido)
        
        // Campo para las imágenes como adjuntos
        'fldzcXWiTiqtPZafP': uploads.logo ? [{ url: uploads.logo }] : [], // Logotipo
        'fldGIWI6UR29st1VU': uploads.productImages?.map(url => ({ url })) || [] // Imágenes de productos
      }
    };
    
    // Añadir campos opcionales solo si tienen valor
    // Información Básica - opcionales
    if (fields.slogan) recordData.fields['fldYkeGlBfObT8Ksk'] = fields.slogan;
    if (fields.otherIndustry) recordData.fields['fldGV2ay7Sib4gkh6'] = fields.otherIndustry;
    if (fields.foundedYear) recordData.fields['fldFwo6k2uM62dUON'] = parseInt(fields.foundedYear) || null;
    if (fields.location) recordData.fields['fldsVTK2by98J3Ym3'] = fields.location;
    
    // Información de Contacto - opcionales
    if (fields.contactPhone) recordData.fields['fldoB4Wug599TxbJQ'] = fields.contactPhone;
    if (fields.whatsappText) recordData.fields['fld71elWXrbmJJUFj'] = fields.whatsappText;
    
    // Servicios - opcionales
    if (fields.servicePrices) recordData.fields['fld5VIpvsgxTBRFVk'] = fields.servicePrices;
    
    // Elementos Visuales
    if (fields.mainColor) recordData.fields['fldu4Blte0fmzxUG1'] = fields.mainColor;
    if (fields.secondaryColor) recordData.fields['fld27KgcN62owM0RW'] = fields.secondaryColor;
    if (fields.accentColor) recordData.fields['fldaGE7gX4b2ARYfY'] = fields.accentColor;
    
    // Objetivos - utilizando solo valores válidos
    const pageObjective = getValidSelection(fields.pageObjective, validPageObjectives);
    if (pageObjective.length > 0) recordData.fields['fld0gMITTWljoMz6u'] = pageObjective;
    
    if (fields.objectiveOther) recordData.fields['fldWiX2RnKrfvWc2K'] = fields.objectiveOther;
    
    const desiredAction = getValidSelection(fields.desiredAction, validDesiredActions);
    if (desiredAction.length > 0) recordData.fields['fldOgoMBwBysUdzg2'] = desiredAction;
    
    if (fields.actionOther) recordData.fields['fldFtAc7JnGxmpsjr'] = fields.actionOther;
    
    const visualStyle = getValidSelection(fields.visualStyle, validVisualStyles);
    if (visualStyle.length > 0) recordData.fields['fldl6xvgSUowYuL8J'] = visualStyle;
    
    if (fields.styleOther) recordData.fields['fldYjZprcX4hptWCS'] = fields.styleOther;
    
    // Otras secciones - opcionales
    if (fields.sectionsOther) recordData.fields['fldC4r2mvgZJuPGPJ'] = fields.sectionsOther;
    if (fields.testimonials) recordData.fields['fldken0GDLnbdh5uL'] = fields.testimonials;
    if (fields.faq) recordData.fields['fldhNvkrZ4uQ1XJ6d'] = fields.faq;
    if (fields.socialLinks) recordData.fields['fldG432F4JenJIbkG'] = fields.socialLinks;
    if (fields.addonsOther) recordData.fields['fldy6lw31bxXW4IOt'] = fields.addonsOther;
    if (fields.analyticsId) recordData.fields['fldT16sB1l0fGBtBB'] = fields.analyticsId;
    
    // Referencias - opcionales
    if (fields.references) recordData.fields['fldgoKjLYHCS3Z1N1'] = fields.references;
    if (fields.competitors) recordData.fields['fldZ8lfcKNdKg9fIK'] = fields.competitors;
    if (fields.additionalInfo) recordData.fields['fld4toDCrMECfyOpQ'] = fields.additionalInfo;
    
    // Términos - solo si está aceptado
    if (fields.termsAccepted === 'on' || fields.termsAccepted === true) {
      recordData.fields['fldCwWA0sK9J15C4y'] = true;
    }
    
    // Campos específicos por industria - solo incluir si tienen valores
    if (selectedIndustry === 'restaurante') {
      if (industrySpecificFields.foodType) recordData.fields['fldoOnkrdD0i4MoQv'] = industrySpecificFields.foodType;
      if (industrySpecificFields.menuCategories) recordData.fields['fldAnmaaGWcNI8Csz'] = industrySpecificFields.menuCategories;
      if (industrySpecificFields.specialties) recordData.fields['fldwMDj4pJkDKwxXc'] = industrySpecificFields.specialties;
      if (industrySpecificFields.openingHours) recordData.fields['fldAi2iXRfpZ1zy59'] = industrySpecificFields.openingHours;
    } 
    else if (selectedIndustry === 'medico') {
      if (industrySpecificFields.medicalSpecialties) recordData.fields['fldtUpRMh95CU9rVG'] = industrySpecificFields.medicalSpecialties;
      if (industrySpecificFields.medicalServices) recordData.fields['fldxy7KGKxMUPUiSx'] = industrySpecificFields.medicalServices;
      if (industrySpecificFields.insuranceInfo) recordData.fields['fldfCYB6QbCt6kPL7'] = industrySpecificFields.insuranceInfo;
      if (industrySpecificFields.doctorProfiles) recordData.fields['fldi1luy0IMlMJyPG'] = industrySpecificFields.doctorProfiles;
      if (industrySpecificFields.appointmentInfo) recordData.fields['fldIYQB9j1iDEaZ0U'] = industrySpecificFields.appointmentInfo;
    }
    else if (selectedIndustry === 'psicologia') {
      if (industrySpecificFields.therapeuticApproaches) recordData.fields['fldL5UN3QNyMiOmJi'] = industrySpecificFields.therapeuticApproaches;
      if (industrySpecificFields.therapistProfile) recordData.fields['fldIiq7avMfFyhnDu'] = industrySpecificFields.therapistProfile;
      if (industrySpecificFields.frequencyInfo) recordData.fields['fld6jxhxZko9CYz6q'] = industrySpecificFields.frequencyInfo;
    }
    else if (selectedIndustry === 'profesional') {
      if (industrySpecificFields.professionalServices) recordData.fields['fld149IHxAnd82vRS'] = industrySpecificFields.professionalServices;
      if (industrySpecificFields.workMethodology) recordData.fields['fldNX2gmTvfYFRzTj'] = industrySpecificFields.workMethodology;
      if (industrySpecificFields.certifications) recordData.fields['fldtqjGYItOqVybGV'] = industrySpecificFields.certifications;
      if (industrySpecificFields.experience) recordData.fields['fldTnZcOPedfp1RNz'] = industrySpecificFields.experience;
      if (industrySpecificFields.differentiators) recordData.fields['fldAsHMXiPU0P1IDq'] = industrySpecificFields.differentiators;
    }
    else if (selectedIndustry === 'educacion') {
      if (industrySpecificFields.educationalPrograms) recordData.fields['fldCS5GVNCNVgoqWD'] = industrySpecificFields.educationalPrograms;
      if (industrySpecificFields.methodology) recordData.fields['fldtoFeWr0Fcxwp3z'] = industrySpecificFields.methodology;
      if (industrySpecificFields.facultyInfo) recordData.fields['fldG5PTAeLbW1P9k6'] = industrySpecificFields.facultyInfo;
      if (industrySpecificFields.facilities) recordData.fields['fldLr6w59Rh3IBAS9'] = industrySpecificFields.facilities;
      if (industrySpecificFields.scheduleInfo) recordData.fields['fldB6onwmKXMhiI4w'] = industrySpecificFields.scheduleInfo;
    }
    else if (selectedIndustry === 'otro') {
      if (industrySpecificFields.otherBusinessInfo) recordData.fields['fldaVCWMZ0OA8oxRr'] = industrySpecificFields.otherBusinessInfo;
      if (industrySpecificFields.otherBusinessFeatures) recordData.fields['fld0BBlCUSQfP2CeF'] = industrySpecificFields.otherBusinessFeatures;
    }

    // Habilitar typecast para manejar automáticamente los tipos de datos
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
          productImagesCount: uploads.productImages.length,
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