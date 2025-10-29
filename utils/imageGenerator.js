/**
 * AI Image Generation using Pollinations.ai
 * Free, unlimited, no API key required!
 */

/**
 * Generate image URL using Pollinations.ai
 * @param {string} prompt - The text prompt for image generation
 * @returns {string} - Image URL
 */
function generateImageUrl(prompt) {
  try {
    // Clean and encode the prompt
    const cleanPrompt = prompt.trim();
    const encodedPrompt = encodeURIComponent(cleanPrompt);
    
    // Generate Pollinations.ai URL
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true&enhance=true`;
    
    console.log('🎨 Generated image URL with Pollinations.ai');
    console.log('📝 Prompt:', cleanPrompt.substring(0, 100) + '...');
    
    return imageUrl;
  } catch (error) {
    console.error('❌ Error generating image URL:', error.message);
    return null;
  }
}

/**
 * Map Arabic truck types to specific English terms for better image generation
 * @param {string} arabicType - Arabic truck type
 * @returns {string} - Specific English truck description
 */
function mapTruckTypeToEnglish(arabicType) {
  if (!arabicType) return 'heavy duty commercial freight truck semi-trailer';
  
  const type = arabicType.toLowerCase();
  
  // Mapping common Arabic truck types to specific English terms
  if (type.includes('تريلا') || type.includes('تريله')) {
    return 'semi-trailer truck 18-wheeler tractor-trailer';
  }
  if (type.includes('دينا') || type.includes('ديناه')) {
    return 'medium duty box truck cargo truck';
  }
  if (type.includes('سطحة') || type.includes('سطحه')) {
    return 'flatbed truck platform truck';
  }
  if (type.includes('قلاب') || type.includes('قلابة')) {
    return 'dump truck tipper truck';
  }
  if (type.includes('ثلاجة') || type.includes('مبرد')) {
    return 'refrigerated truck reefer truck';
  }
  if (type.includes('صهريج') || type.includes('تنكر')) {
    return 'tanker truck fuel truck';
  }
  if (type.includes('ونش') || type.includes('ونيت')) {
    return 'tow truck wrecker truck';
  }
  if (type.includes('قاطرة') || type.includes('قاطره')) {
    return 'tractor unit semi-truck cab';
  }
  if (type.includes('مقطورة') || type.includes('مقطوره')) {
    return 'trailer semi-trailer cargo trailer';
  }
  if (type.includes('معدات ثقيلة') || type.includes('معدات')) {
    return 'heavy equipment truck construction truck';
  }
  
  // Default to heavy duty truck if type not recognized
  return 'heavy duty commercial freight truck semi-trailer';
}

/**
 * Generate creative and varied image prompts for trucks
 * @param {string} truckType - Type of truck (can be in Arabic)
 * @param {string} location - Current location
 * @param {string} style - Style preference
 * @returns {string} - Image generation prompt
 */
function generateTruckImagePrompt(truckType, location, style = 'realistic') {
  const perspectives = [
    'front three-quarter view',
    'side profile view',
    'rear three-quarter view',
    'low angle dramatic view',
  ];

  const environments = [
    'on a modern highway',
    'in an industrial logistics center',
    'on a desert road',
    'at a truck stop',
    'in a logistics facility',
    'on an open road',
  ];

  const lightingConditions = [
    'dramatic golden hour lighting',
    'bright daylight with clear sky',
    'soft morning light',
    'sunset warm glow',
    'professional studio lighting',
  ];

  const qualities = [
    'ultra realistic photograph',
    'professional commercial photography',
    'high detail photorealistic',
    'cinematic photography',
    'photorealistic commercial shot',
  ];

  // Select random elements
  const perspective = perspectives[Math.floor(Math.random() * perspectives.length)];
  const environment = environments[Math.floor(Math.random() * environments.length)];
  const lighting = lightingConditions[Math.floor(Math.random() * lightingConditions.length)];
  const quality = qualities[Math.floor(Math.random() * qualities.length)];

  // Map truck type to specific English terms
  const specificTruckType = mapTruckTypeToEnglish(truckType);

  // Enhanced prompt with specific truck terminology and negative prompts
  const prompt = `${quality}, ${specificTruckType}, large commercial truck, ${perspective}, ${environment}, ${lighting}, professional logistics photography, sharp focus, detailed, no people, no humans, clean and polished, commercial vehicle photography, NOT a car, NOT a sedan, NOT a SUV, NOT a pickup, must be a large truck or semi-trailer`;

  return prompt;
}

/**
 * Generate creative prompts for fleet promotion
 * @param {string} companyName - Company name
 * @param {number} fleetSize - Number of trucks
 * @returns {string} - Image generation prompt
 */
function generateFleetPromoteImagePrompt(companyName, fleetSize) {
  const compositions = [
    'lineup of heavy duty commercial trucks',
    'fleet of semi-trailer trucks parked in organized rows',
    'convoy of large freight trucks on highway',
    'multiple commercial trucks in professional logistics facility',
    'modern truck fleet of semi-trailers at distribution center',
  ];

  const styles = [
    'professional corporate photography',
    'cinematic wide angle shot',
    'aerial drone photography',
    'commercial advertising photography',
    'industrial logistics photography',
  ];

  const atmospheres = [
    'during golden hour with warm lighting',
    'at modern logistics center with professional lighting',
    'with dramatic sky background',
    'in pristine condition showcasing professionalism',
    'with sunset creating dramatic shadows',
  ];

  const composition = compositions[Math.floor(Math.random() * compositions.length)];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const atmosphere = atmospheres[Math.floor(Math.random() * atmospheres.length)];

  // Enhanced prompt with specific terminology
  const prompt = `ultra realistic photograph, ${composition}, heavy duty commercial trucks, semi-trailers, ${style}, ${atmosphere}, high detail, professional commercial photography, sharp focus, no people, no humans, clean trucks, logistics industry, freight transportation, NOT cars, NOT sedans, NOT SUVs, must be large commercial trucks and semi-trailers`;

  return prompt;
}

module.exports = {
  generateImageUrl,
  generateTruckImagePrompt,
  generateFleetPromoteImagePrompt,
};
