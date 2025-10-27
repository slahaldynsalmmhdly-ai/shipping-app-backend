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
 * Generate creative and varied image prompts for trucks
 * @param {string} truckType - Type of truck
 * @param {string} location - Current location
 * @param {string} style - Style preference
 * @returns {string} - Image generation prompt
 */
function generateTruckImagePrompt(truckType, location, style = 'realistic') {
  const perspectives = [
    'front three-quarter view',
    'side profile view',
    'rear three-quarter view',
    'aerial view from above',
    'low angle dramatic view',
  ];

  const environments = [
    'on a modern highway at golden hour',
    'in an industrial logistics center',
    'on a desert road at sunset',
    'in a busy city street',
    'on a mountain road with scenic background',
    'at a truck stop during blue hour',
    'on a coastal highway with ocean view',
  ];

  const lightingConditions = [
    'dramatic golden hour lighting',
    'bright daylight with clear sky',
    'soft morning light',
    'sunset warm glow',
    'professional studio lighting',
    'natural overcast lighting',
  ];

  const qualities = [
    'ultra realistic',
    'professional photography',
    'high detail',
    'cinematic composition',
    'commercial photography style',
    'photorealistic',
  ];

  // Select random elements
  const perspective = perspectives[Math.floor(Math.random() * perspectives.length)];
  const environment = environments[Math.floor(Math.random() * environments.length)];
  const lighting = lightingConditions[Math.floor(Math.random() * lightingConditions.length)];
  const quality = qualities[Math.floor(Math.random() * qualities.length)];

  const prompt = `${quality}, ${truckType || 'modern cargo truck'}, ${perspective}, ${environment}, ${lighting}, professional commercial photography, sharp focus, detailed, no people, no humans, clean and polished, automotive photography`;

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
    'lineup of modern cargo trucks',
    'fleet of trucks parked in organized rows',
    'convoy of trucks on highway',
    'trucks in professional logistics facility',
    'modern truck fleet at distribution center',
  ];

  const styles = [
    'professional corporate photography',
    'cinematic wide angle shot',
    'aerial drone photography',
    'commercial advertising style',
    'industrial photography aesthetic',
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

  const prompt = `ultra realistic, ${composition}, ${style}, ${atmosphere}, high detail, professional commercial photography, sharp focus, no people, no humans, clean trucks, automotive photography, logistics industry`;

  return prompt;
}

module.exports = {
  generateImageUrl,
  generateTruckImagePrompt,
  generateFleetPromoteImagePrompt,
};

