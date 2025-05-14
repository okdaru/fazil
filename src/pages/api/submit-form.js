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
    
    // Procesar datos de websiteObjectives si existe
    if (fields.websiteObjectives) {
      try {
        const websiteObjectives = JSON.parse(fields.websiteObjectives);
        
        // Objetivos - utilizando solo valores válidos
        const pageObjective = websiteObjectives.pageObjective;
        if (pageObjective && validPageObjectives.includes(pageObjective)) {
          recordData.fields['fld0gMITTWljoMz6u'] = [pageObjective];
        }
        
        // Otros campos relacionados con objetivos
        if (websiteObjectives.objectiveOther) {
          recordData.fields['fldWiX2RnKrfvWc2K'] = websiteObjectives.objectiveOther;
        }
        
        const desiredAction = websiteObjectives.desiredAction;
        if (desiredAction && validDesiredActions.includes(desiredAction)) {
          recordData.fields['fldOgoMBwBysUdzg2'] = [desiredAction];
        }
        
        if (websiteObjectives.actionOther) {
          recordData.fields['fldFtAc7JnGxmpsjr'] = websiteObjectives.actionOther;
        }
        
      } catch (error) {
        console.error('Error al procesar los objetivos del sitio web:', error);
      }
    } else {
      // Objetivos - enfoque alternativo si no se envía websiteObjectives
      const pageObjective = getValidSelection(fields.pageObjective, validPageObjectives);
      if (pageObjective.length > 0) recordData.fields['fld0gMITTWljoMz6u'] = pageObjective;
      
      if (fields.objectiveOther) recordData.fields['fldWiX2RnKrfvWc2K'] = fields.objectiveOther;
      
      const desiredAction = getValidSelection(fields.desiredAction, validDesiredActions);
      if (desiredAction.length > 0) recordData.fields['fldOgoMBwBysUdzg2'] = desiredAction;
      
      if (fields.actionOther) recordData.fields['fldFtAc7JnGxmpsjr'] = fields.actionOther;
    }
    
    // Estilo visual
    const visualStyle = getValidSelection(fields.visualStyle, validVisualStyles);
    if (visualStyle.length > 0) recordData.fields['fldl6xvgSUowYuL8J'] = visualStyle;
    
    if (fields.styleOther) recordData.fields['fldYjZprcX4hptWCS'] = fields.styleOther;
    
    // Procesar datos de pageSections si existe
    if (fields.pageSections) {
  try {
    const pageSections = JSON.parse(fields.pageSections);
    if (Array.isArray(pageSections) && pageSections.length > 0) {
      // Eliminar cualquier comilla extra alrededor de los valores
      const sanitizedSections = pageSections.map(section => {
        // Si el valor comienza y termina con comillas, las elimina
        if (typeof section === 'string') {
          return section.replace(/^["'](.*)["']$/, '$1');
        }
        return section;
      });
      
      recordData.fields['fldm5Q1ReLjxEzyol'] = sanitizedSections;
    }
  } catch (error) {
    console.error('Error al procesar las secciones de página:', error);
  }
}

    
    // Otras secciones - opcionales
    if (fields.sectionsOther) recordData.fields['fldC4r2mvgZJuPGPJ'] = fields.sectionsOther;
    if (fields.testimonials) recordData.fields['fldken0GDLnbdh5uL'] = fields.testimonials;
    if (fields.faq) recordData.fields['fldhNvkrZ4uQ1XJ6d'] = fields.faq;
    if (fields.socialLinks) recordData.fields['fldG432F4JenJIbkG'] = fields.socialLinks;
    
    // Procesar servicios técnicos adicionales
    if (fields.additionalTechServices) {
      try {
        const additionalServices = JSON.parse(fields.additionalTechServices);
        if (Array.isArray(additionalServices) && additionalServices.length > 0) {
          recordData.fields['fld2gwGziVJRluBot'] = additionalServices;
        }
      } catch (error) {
        console.error('Error al procesar los servicios técnicos adicionales:', error);
      }
    } else {
      // Enfoque alternativo si no se envía additionalTechServices
      const additionalTechServicesEntries = Array.from(formData.entries())
        .filter(([key]) => key === 'additionalTechServices[]')
        .map(([_, value]) => value.toString());

      if (additionalTechServicesEntries.length > 0) {
        recordData.fields['fld2gwGziVJRluBot'] = additionalTechServicesEntries;
      }
    }
    
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
    // Procesar preguntas del formulario de contacto
if (fields.contactFormQuestions) {
  // Dividir el texto en líneas para obtener cada pregunta
  const questions = fields.contactFormQuestions
    .split('\n')
    .filter(line => line.trim() !== '')  // Eliminar líneas vacías
    .slice(0, 15);  // Limitar a máximo 15 preguntas
  
  if (questions.length > 0) {
    recordData.fields['fldContactFormQuestions'] = questions.join('\n');
  }
}

// Comprobar si se ha solicitado incluir el formulario de contacto
if (fields.includeContactForm === 'on' || fields.includeContactForm === true) {
  recordData.fields['fldHerIGuf4mDvjCJ'] = true;
}
    
    // Procesar datos de industrySpecificData si existe (sección 4)
    if (fields.industrySpecificData) {
      try {
        const industryData = JSON.parse(fields.industrySpecificData);
        const selectedIndustry = fields.industry;
        
        if (selectedIndustry === 'restaurante') {
          // Campos de texto
          if (industryData.foodType) recordData.fields['fldoOnkrdD0i4MoQv'] = industryData.foodType;
          if (industryData.menuCategories) recordData.fields['fldAnmaaGWcNI8Csz'] = industryData.menuCategories;
          if (industryData.specialties) recordData.fields['fldwMDj4pJkDKwxXc'] = industryData.specialties;
          if (industryData.openingHours) recordData.fields['fldAi2iXRfpZ1zy59'] = industryData.openingHours;
          
          // Multi-select para servicios
          if (industryData.restaurantServices && Array.isArray(industryData.restaurantServices) && industryData.restaurantServices.length > 0) {
            recordData.fields['fldBkRvrJEYplRipW'] = industryData.restaurantServices;
          }
          
          // Select para ambiente
          if (industryData.ambience) recordData.fields['fldCXIoImuKg8Y8op'] = industryData.ambience;
        } 
        else if (selectedIndustry === 'medico') {
          // Campos de texto
          if (industryData.medicalSpecialties) recordData.fields['fldtUpRMh95CU9rVG'] = industryData.medicalSpecialties;
          if (industryData.medicalServices) recordData.fields['fldxy7KGKxMUPUiSx'] = industryData.medicalServices;
          if (industryData.insuranceInfo) recordData.fields['fldfCYB6QbCt6kPL7'] = industryData.insuranceInfo;
          if (industryData.doctorProfiles) recordData.fields['fldi1luy0IMlMJyPG'] = industryData.doctorProfiles;
          if (industryData.appointmentInfo) recordData.fields['fldIYQB9j1iDEaZ0U'] = industryData.appointmentInfo;
          
          // Select para sistema de citas
          if (industryData.appointmentSystem) recordData.fields['fldNLImwKkaCVzzpr'] = industryData.appointmentSystem;
        }
        else if (selectedIndustry === 'psicologia') {
          // Campos de texto
          if (industryData.therapeuticApproaches) recordData.fields['fldL5UN3QNyMiOmJi'] = industryData.therapeuticApproaches;
          if (industryData.therapistProfile) recordData.fields['fldIiq7avMfFyhnDu'] = industryData.therapistProfile;
          if (industryData.frequencyInfo) recordData.fields['fld6jxhxZko9CYz6q'] = industryData.frequencyInfo;
          
          // Multi-select para especialidades
          if (industryData.therapeuticSpecialties && Array.isArray(industryData.therapeuticSpecialties) && industryData.therapeuticSpecialties.length > 0) {
            recordData.fields['fld8efTfvFtMOieSg'] = industryData.therapeuticSpecialties;
          }
          
          // Multi-select para modalidades
          if (industryData.attendanceMode && Array.isArray(industryData.attendanceMode) && industryData.attendanceMode.length > 0) {
            recordData.fields['fldgJR65NxGaLKLvv'] = industryData.attendanceMode;
          }
          
          // Select para duración de sesiones
          if (industryData.sessionDuration) recordData.fields['fldOpIvobyO63EKfE'] = industryData.sessionDuration;
        }
        else if (selectedIndustry === 'profesional') {
          // Campos de texto
          if (industryData.professionalServices) recordData.fields['fld149IHxAnd82vRS'] = industryData.professionalServices;
          if (industryData.workMethodology) recordData.fields['fldNX2gmTvfYFRzTj'] = industryData.workMethodology;
          if (industryData.certifications) recordData.fields['fldtqjGYItOqVybGV'] = industryData.certifications;
          if (industryData.experience) recordData.fields['fldTnZcOPedfp1RNz'] = industryData.experience;
          if (industryData.differentiators) recordData.fields['fldAsHMXiPU0P1IDq'] = industryData.differentiators;
        }
        else if (selectedIndustry === 'educacion') {
          // Campos de texto
          if (industryData.educationalPrograms) recordData.fields['fldCS5GVNCNVgoqWD'] = industryData.educationalPrograms;
          if (industryData.methodology) recordData.fields['fldtoFeWr0Fcxwp3z'] = industryData.methodology;
          if (industryData.facultyInfo) recordData.fields['fldG5PTAeLbW1P9k6'] = industryData.facultyInfo;
          if (industryData.facilities) recordData.fields['fldLr6w59Rh3IBAS9'] = industryData.facilities;
          if (industryData.scheduleInfo) recordData.fields['fldB6onwmKXMhiI4w'] = industryData.scheduleInfo;
          
          // Multi-select para modalidades educativas
          if (industryData.educationMode && Array.isArray(industryData.educationMode) && industryData.educationMode.length > 0) {
            recordData.fields['fldyqvNxyX4hrTBE5'] = industryData.educationMode;
          }
        }
        else if (selectedIndustry === 'otro') {
          // Campos de texto
          if (industryData.otherBusinessInfo) recordData.fields['fldaVCWMZ0OA8oxRr'] = industryData.otherBusinessInfo;
          if (industryData.otherBusinessFeatures) recordData.fields['fld0BBlCUSQfP2CeF'] = industryData.otherBusinessFeatures;
        }
      } catch (error) {
        console.error('Error al procesar los datos específicos de la industria:', error);
      }
    } else {
      // Procesar campos específicos por industria según la selección (enfoque antiguo)
      const selectedIndustry = fields.industry;
      
      if (selectedIndustry === 'restaurante') {
        if (fields.foodType) recordData.fields['fldoOnkrdD0i4MoQv'] = fields.foodType;
        if (fields.menuCategories) recordData.fields['fldAnmaaGWcNI8Csz'] = fields.menuCategories;
        if (fields.specialties) recordData.fields['fldwMDj4pJkDKwxXc'] = fields.specialties;
        if (fields.openingHours) recordData.fields['fldAi2iXRfpZ1zy59'] = fields.openingHours;
      } 
      else if (selectedIndustry === 'medico') {
        if (fields.medicalSpecialties) recordData.fields['fldtUpRMh95CU9rVG'] = fields.medicalSpecialties;
        if (fields.medicalServices) recordData.fields['fldxy7KGKxMUPUiSx'] = fields.medicalServices;
        if (fields.insuranceInfo) recordData.fields['fldfCYB6QbCt6kPL7'] = fields.insuranceInfo;
        if (fields.doctorProfiles) recordData.fields['fldi1luy0IMlMJyPG'] = fields.doctorProfiles;
        if (fields.appointmentInfo) recordData.fields['fldIYQB9j1iDEaZ0U'] = fields.appointmentInfo;
      }
      else if (selectedIndustry === 'psicologia') {
        if (fields.therapeuticApproaches) recordData.fields['fldL5UN3QNyMiOmJi'] = fields.therapeuticApproaches;
        if (fields.therapistProfile) recordData.fields['fldIiq7avMfFyhnDu'] = fields.therapistProfile;
        if (fields.frequencyInfo) recordData.fields['fld6jxhxZko9CYz6q'] = fields.frequencyInfo;
      }
      else if (selectedIndustry === 'profesional') {
        if (fields.professionalServices) recordData.fields['fld149IHxAnd82vRS'] = fields.professionalServices;
        if (fields.workMethodology) recordData.fields['fldNX2gmTvfYFRzTj'] = fields.workMethodology;
        if (fields.certifications) recordData.fields['fldtqjGYItOqVybGV'] = fields.certifications;
        if (fields.experience) recordData.fields['fldTnZcOPedfp1RNz'] = fields.experience;
        if (fields.differentiators) recordData.fields['fldAsHMXiPU0P1IDq'] = fields.differentiators;
      }
      else if (selectedIndustry === 'educacion') {
        if (fields.educationalPrograms) recordData.fields['fldCS5GVNCNVgoqWD'] = fields.educationalPrograms;
        if (fields.methodology) recordData.fields['fldtoFeWr0Fcxwp3z'] = fields.methodology;
        if (fields.facultyInfo) recordData.fields['fldG5PTAeLbW1P9k6'] = fields.facultyInfo;
        if (fields.facilities) recordData.fields['fldLr6w59Rh3IBAS9'] = fields.facilities;
        if (fields.scheduleInfo) recordData.fields['fldB6onwmKXMhiI4w'] = fields.scheduleInfo;
      }
      else if (selectedIndustry === 'otro') {
        if (fields.otherBusinessInfo) recordData.fields['fldaVCWMZ0OA8oxRr'] = fields.otherBusinessInfo;
        if (fields.otherBusinessFeatures) recordData.fields['fld0BBlCUSQfP2CeF'] = fields.otherBusinessFeatures;
      }
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