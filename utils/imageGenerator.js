const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * Generate image using Hugging Face Stable Diffusion API
 * @param {string} prompt - The text prompt for image generation
 * @returns {Promise<Buffer>} - Image buffer
 */
async function generateImage(prompt) {
  try {
    // Hugging Face API endpoint for Stable Diffusion
    const API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large";
    
    // Get API token from environment variable
    const HF_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
    
    if (!HF_API_TOKEN) {
      console.error('❌ HUGGINGFACE_API_TOKEN not found in environment variables');
      return null;
    }

    console.log('🎨 Generating image with prompt:', prompt.substring(0, 100) + '...');

    const response = await axios.post(
      API_URL,
      {
        inputs: prompt,
        parameters: {
          negative_prompt: "people, humans, faces, person, man, woman, child, body, hands, fingers, text, watermark, blurry, low quality",
          num_inference_steps: 30,
          guidance_scale: 7.5,
          width: 1024,
          height: 768,
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${HF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds timeout
      }
    );

    console.log('✅ Image generated successfully');
    return Buffer.from(response.data);
  } catch (error) {
    console.error('❌ Error generating image:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Save image buffer to file
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} filename - Filename to save
 * @returns {Promise<string>} - File path
 */
async function saveImageToFile(imageBuffer, filename) {
  try {
    const uploadsDir = path.join(__dirname, '../uploads/ai-generated');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, imageBuffer);
    
    console.log('💾 Image saved to:', filePath);
    return filePath;
  } catch (error) {
    console.error('❌ Error saving image:', error.message);
    return null;
  }
}

/**
 * Upload image to cloud storage (placeholder - implement based on your storage solution)
 * For now, returns a local URL
 * @param {string} filePath - Local file path
 * @returns {Promise<string>} - Public URL
 */
async function uploadImageToCloud(filePath) {
  try {
    // TODO: Implement actual cloud upload (S3, Cloudinary, etc.)
    // For now, return a placeholder URL
    const filename = path.basename(filePath);
    return `/uploads/ai-generated/${filename}`;
  } catch (error) {
    console.error('❌ Error uploading image:', error.message);
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
    'high detail 8K resolution',
    'cinematic composition',
    'commercial photography style',
    'photorealistic rendering',
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

  const prompt = `ultra realistic, ${composition}, ${style}, ${atmosphere}, high detail 8K, professional commercial photography, sharp focus, no people, no humans, clean trucks, automotive photography, logistics industry`;

  return prompt;
}

module.exports = {
  generateImage,
  saveImageToFile,
  uploadImageToCloud,
  generateTruckImagePrompt,
  generateFleetPromoteImagePrompt,
};

